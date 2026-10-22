/**
 * Minimal Wayland client for Hyprland virtual input.
 *
 * Speaks zwlr_virtual_pointer_v1 (motion_absolute, button, axis, frame) and
 * zwp_virtual_keyboard_v1 (keymap, key, modifiers) on the session socket.
 * No X11 and no uinput.
 */

import { closeSync, openSync, statSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const IFACE_VIRTUAL_POINTER = "zwlr_virtual_pointer_v1";
export const IFACE_VIRTUAL_POINTER_MANAGER = "zwlr_virtual_pointer_manager_v1";
export const IFACE_VIRTUAL_KEYBOARD = "zwp_virtual_keyboard_v1";
export const IFACE_VIRTUAL_KEYBOARD_MANAGER = "zwp_virtual_keyboard_manager_v1";

const OP_POINTER_MOTION_ABS = 1;
const OP_POINTER_BUTTON = 2;
const OP_POINTER_AXIS = 3;
const OP_POINTER_FRAME = 4;
const OP_KEYBOARD_KEYMAP = 0;
const OP_KEYBOARD_KEY = 1;
const OP_KEYBOARD_MODIFIERS = 2;
const OP_MANAGER_CREATE_POINTER = 0;
const OP_KB_MANAGER_CREATE = 0;
const WL_DISPLAY_GET_REGISTRY = 1;
const WL_DISPLAY_SYNC = 0;
const WL_REGISTRY_BIND = 0;

export function encodeString(str) {
  const bytes = Buffer.from(`${str}\0`, "utf8");
  const pad = (4 - (bytes.length % 4)) % 4;
  const out = Buffer.alloc(4 + bytes.length + pad);
  out.writeUInt32LE(bytes.length, 0);
  bytes.copy(out, 4);
  return out;
}

export function encodeMessage(objectId, opcode, payload = Buffer.alloc(0)) {
  const size = 8 + payload.length;
  if (size > 0xffff) throw new Error(`Wayland message too large (${size})`);
  const header = Buffer.alloc(8);
  header.writeUInt32LE(objectId >>> 0, 0);
  header.writeUInt32LE(((size << 16) | (opcode & 0xffff)) >>> 0, 4);
  return payload.length ? Buffer.concat([header, payload]) : header;
}

function u32(values) {
  const buf = Buffer.alloc(values.length * 4);
  values.forEach((value, i) => buf.writeUInt32LE(value >>> 0, i * 4));
  return buf;
}

function i32(value) {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(value | 0, 0);
  return buf;
}

export function encodeMotionAbsolute(objectId, { time, x, y, xExtent, yExtent }) {
  return encodeMessage(objectId, OP_POINTER_MOTION_ABS, u32([time, x, y, xExtent, yExtent]));
}

export function encodeButton(objectId, { time, button, pressed }) {
  return encodeMessage(objectId, OP_POINTER_BUTTON, u32([time, button, pressed ? 1 : 0]));
}

export function encodeAxis(objectId, { time, axis, value }) {
  return encodeMessage(objectId, OP_POINTER_AXIS, Buffer.concat([u32([time, axis]), i32(value)]));
}

export function encodeFrame(objectId) {
  return encodeMessage(objectId, OP_POINTER_FRAME);
}

export function encodeKey(objectId, { time, key, pressed }) {
  return encodeMessage(objectId, OP_KEYBOARD_KEY, u32([time, key, pressed ? 1 : 0]));
}

export function encodeModifiers(objectId, mask) {
  return encodeMessage(objectId, OP_KEYBOARD_MODIFIERS, u32([mask, 0, 0, 0]));
}

/**
 * keymap body is format + size. The fd travels in SCM_RIGHTS, not the body.
 * @param {number} objectId
 * @param {number} size
 */
export function encodeKeymap(objectId, size) {
  return encodeMessage(objectId, OP_KEYBOARD_KEYMAP, u32([1, size]));
}

export function encodeBind(registryId, { name, interfaceName, version, id }) {
  const payload = Buffer.concat([
    u32([name]),
    encodeString(interfaceName),
    u32([version, id]),
  ]);
  return encodeMessage(registryId, WL_REGISTRY_BIND, payload);
}

/**
 * Parse one or more Wayland events from a buffer.
 * @returns {{ events: { id: number, opcode: number, payload: Buffer }[], rest: Buffer }}
 */
export function parseMessages(buffer) {
  const events = [];
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.readUInt32LE(offset);
    const sizeOpcode = buffer.readUInt32LE(offset + 4);
    const size = sizeOpcode >>> 16;
    const opcode = sizeOpcode & 0xffff;
    if (size < 8 || offset + size > buffer.length) break;
    events.push({
      id,
      opcode,
      payload: Buffer.from(buffer.subarray(offset + 8, offset + size)),
    });
    offset += size;
  }
  return { events, rest: buffer.subarray(offset) };
}

function readString(payload, offset) {
  const len = payload.readUInt32LE(offset);
  const start = offset + 4;
  const text = payload.subarray(start, start + len - 1).toString("utf8");
  const padded = 4 + len + ((4 - (len % 4)) % 4);
  return { text, next: offset + padded };
}

/**
 * wl_registry.global is opcode 0: uint name, string interface, uint version.
 */
export function parseGlobal(payload) {
  const name = payload.readUInt32LE(0);
  const iface = readString(payload, 4);
  const version = payload.readUInt32LE(iface.next);
  return { name, interfaceName: iface.text, version };
}

function nowMs() {
  return Date.now() >>> 0;
}

/**
 * Send a keymap fd with the Wayland message. Linux only.
 * @param {import('node:net').Socket} socket
 * @param {Buffer} message
 * @param {number} fd
 */
async function sendWithFd(socket, message, fd) {
  const handleFd = socket._handle?.fd;
  if (typeof handleFd !== "number" || handleFd < 0) {
    throw new Error("Wayland socket has no file descriptor");
  }
  let koffi;
  try {
    koffi = (await import("koffi")).default;
  } catch {
    throw new Error(
      "Keyboard keymap needs optional dependency koffi (pnpm install) on the robot",
    );
  }
  const libc = koffi.load("libc.so.6");
  const iovec = koffi.struct("agenticros_iovec", {
    iov_base: "void *",
    iov_len: "size_t",
  });
  const msghdr = koffi.struct("agenticros_msghdr", {
    msg_name: "void *",
    msg_namelen: "uint32_t",
    msg_iov: koffi.pointer(iovec),
    msg_iovlen: "size_t",
    msg_control: "void *",
    msg_controllen: "size_t",
    msg_flags: "int",
  });
  const sendmsg = libc.func("ssize_t sendmsg(int, _In_ agenticros_msghdr *, int)");

  // cmsghdr + one int, padded to 8 bytes. Linux x86_64 and aarch64.
  const control = Buffer.alloc(24);
  control.writeBigUInt64LE(20n, 0); // cmsg_len = CMSG_LEN(sizeof(int))
  control.writeInt32LE(1, 8); // SOL_SOCKET
  control.writeInt32LE(1, 12); // SCM_RIGHTS
  control.writeInt32LE(fd, 16);

  const msgBuf = Buffer.from(message);
  const iovStruct = koffi.alloc(iovec, 1);
  koffi.encode(iovStruct, 0, iovec, { iov_base: msgBuf, iov_len: msgBuf.length });

  const hdr = {
    msg_name: null,
    msg_namelen: 0,
    msg_iov: iovStruct,
    msg_iovlen: 1,
    msg_control: control,
    msg_controllen: control.length,
    msg_flags: 0,
  };
  const sent = sendmsg(handleFd, hdr, 0);
  if (sent < 0) throw new Error(`sendmsg failed (${sent})`);
}

/**
 * @param {{ socketPath: string, keymap: string, log?: (line: string) => void, timeoutMs?: number }} opts
 */
export function connectVirtualInput(opts) {
  const log = opts.log || (() => {});
  const timeoutMs = opts.timeoutMs ?? 2000;
  const socket = createConnection(opts.socketPath);
  let buffer = Buffer.alloc(0);
  let nextId = 2;
  const registryId = nextId++;
  const syncId = nextId++;
  /** @type {Map<number, string>} */
  const objectKinds = new Map([
    [1, "wl_display"],
    [registryId, "wl_registry"],
    [syncId, "wl_callback"],
  ]);
  /** @type {{ name: number, interfaceName: string, version: number }[]} */
  const globals = [];
  let pointerId = 0;
  let keyboardId = 0;
  let keymapFd = -1;
  let settled = false;

  const send = (buf) => {
    socket.write(buf);
  };

  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(
        "Hyprland did not advertise zwlr_virtual_pointer_manager_v1 within the timeout",
      ));
    }, timeoutMs);

    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve();
    };

    socket.on("error", (err) => finish(err));
    socket.on("connect", () => {
      send(encodeMessage(1, WL_DISPLAY_GET_REGISTRY, u32([registryId])));
      send(encodeMessage(1, WL_DISPLAY_SYNC, u32([syncId])));
    });

    const onGlobalsReady = async () => {
      const pointerMgr = globals.find((g) => g.interfaceName === IFACE_VIRTUAL_POINTER_MANAGER);
      const keyboardMgr = globals.find((g) => g.interfaceName === IFACE_VIRTUAL_KEYBOARD_MANAGER);
      const seat = globals.find((g) => g.interfaceName === "wl_seat");
      if (!pointerMgr) {
        finish(new Error("Hyprland did not advertise zwlr_virtual_pointer_manager_v1"));
        return;
      }
      const pointerMgrId = nextId++;
      send(encodeBind(registryId, {
        name: pointerMgr.name,
        interfaceName: pointerMgr.interfaceName,
        version: Math.min(pointerMgr.version, 2),
        id: pointerMgrId,
      }));
      pointerId = nextId++;
      // seat is nullable for the pointer.
      send(encodeMessage(pointerMgrId, OP_MANAGER_CREATE_POINTER, u32([0, pointerId])));
      objectKinds.set(pointerId, IFACE_VIRTUAL_POINTER);

      if (keyboardMgr && seat) {
        const seatId = nextId++;
        send(encodeBind(registryId, {
          name: seat.name,
          interfaceName: "wl_seat",
          version: Math.min(seat.version, 1),
          id: seatId,
        }));
        const kbMgrId = nextId++;
        send(encodeBind(registryId, {
          name: keyboardMgr.name,
          interfaceName: keyboardMgr.interfaceName,
          version: Math.min(keyboardMgr.version, 1),
          id: kbMgrId,
        }));
        keyboardId = nextId++;
        send(encodeMessage(kbMgrId, OP_KB_MANAGER_CREATE, u32([seatId, keyboardId])));
        objectKinds.set(keyboardId, IFACE_VIRTUAL_KEYBOARD);
        try {
          const keymapPath = writeKeymapFile(opts.keymap);
          keymapFd = openSync(keymapPath, "r");
          const { size } = statSync(keymapPath);
          await sendWithFd(socket, encodeKeymap(keyboardId, size), keymapFd);
        } catch (err) {
          log(`Virtual keyboard keymap was not installed: ${err instanceof Error ? err.message : err}`);
          keyboardId = 0;
        }
      } else {
        log("zwp_virtual_keyboard_manager_v1 is not available; pointer only");
      }
      finish();
    };

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const parsed = parseMessages(buffer);
      buffer = Buffer.from(parsed.rest);
      for (const event of parsed.events) {
        if (event.id === 1 && event.opcode === 0) {
          log(`Wayland display error: ${event.payload.toString("utf8")}`);
        }
        if (event.id === registryId && event.opcode === 0 && event.payload.length >= 8) {
          try {
            globals.push(parseGlobal(event.payload));
          } catch {
            // ignore a truncated global; the next sync will tell us
          }
        }
        if (event.id === syncId && event.opcode === 0 && !settled) {
          void onGlobalsReady();
        }
      }
    });
  });

  return {
    ready,
    socket,
    motionAbsolute(point) {
      if (!pointerId) return;
      send(encodeMotionAbsolute(pointerId, { time: nowMs(), ...point }));
      send(encodeFrame(pointerId));
    },
    button({ button, pressed }) {
      if (!pointerId) return;
      send(encodeButton(pointerId, { time: nowMs(), button, pressed }));
      send(encodeFrame(pointerId));
    },
    axis({ axis, value }) {
      if (!pointerId) return;
      send(encodeAxis(pointerId, { time: nowMs(), axis, value }));
      send(encodeFrame(pointerId));
    },
    key({ key, pressed, mask }) {
      if (!keyboardId) return;
      send(encodeModifiers(keyboardId, mask));
      send(encodeKey(keyboardId, { time: nowMs(), key, pressed }));
    },
    close() {
      try { socket.end(); } catch { /* ignore */ }
      if (keymapFd >= 0) {
        try { closeSync(keymapFd); } catch { /* ignore */ }
      }
    },
  };
}

function writeKeymapFile(keymap) {
  const file = join(tmpdir(), "agenticros-desktop-keymap.xkb");
  writeFileSync(file, keymap);
  return file;
}
