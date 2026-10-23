/**
 * Session-bus socket that can receive SCM_RIGHTS.
 * dbus-next's net.Socket cannot, so OpenPipeWireRemote's reply never finishes.
 * File descriptors arrive with recvmsg. The Start Response body is discarded
 * here from its header length, so dbus-next never unmarshalls that variant.
 */

import { EventEmitter } from "node:events";
import { closeSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const AF_UNIX = 1;
const SOCK_STREAM = 1;
const SOCK_CLOEXEC = 0o2000000;
const SOL_SOCKET = 1;
const SCM_RIGHTS = 1;
const MSG_CMSG_CLOEXEC = 0x40000000;
const POLLIN = 0x001;
const POLLERR = 0x008;
const POLLHUP = 0x010;
const F_GETFL = 3;
const F_SETFL = 4;
const O_NONBLOCK = 0o4000;
const SIGNAL = 4;

let libcApi = null;

function libc() {
  if (libcApi) return libcApi;
  let koffi;
  try {
    koffi = require("koffi");
  } catch {
    throw new Error("koffi is required to receive the PipeWire file descriptor");
  }
  const lib = koffi.load("libc.so.6");
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
  const pollfd = koffi.struct("agenticros_pollfd", {
    fd: "int",
    events: "short",
    revents: "short",
  });
  libcApi = {
    koffi,
    iovec,
    msghdr,
    pollfd,
    socket: lib.func("int socket(int, int, int)"),
    connect: lib.func("int connect(int, void *, uint32_t)"),
    close: lib.func("int close(int)"),
    send: lib.func("long send(int, void *, size_t, int)"),
    recvmsg: lib.func("long recvmsg(int, _Inout_ agenticros_msghdr *, int)"),
    poll: lib.func("int poll(_Inout_ agenticros_pollfd *, unsigned long, int)"),
    fcntl: lib.func("int fcntl(int, int, int)"),
    errnoPtr: lib.func("int * __errno_location(void)"),
  };
  return libcApi;
}

function errno() {
  const api = libc();
  return api.koffi.decode(api.errnoPtr(), "int");
}

function align(pos, bytes) {
  return (pos + bytes - 1) & ~(bytes - 1);
}

/**
 * Header-field names from a D-Bus message. `fields` is the array body only.
 * @param {Buffer} fields
 * @param {boolean} little
 */
export function dbusHeaderNames(fields, little) {
  /** @type {{ path?: string, member?: string, signature?: string, unixFds?: number }} */
  const names = {};
  let pos = 0;
  const u32 = (at) => (little ? fields.readUInt32LE(at) : fields.readUInt32BE(at));
  while (pos < fields.length) {
    pos = align(pos, 8);
    if (pos >= fields.length) break;
    const code = fields[pos];
    pos += 1;
    if (pos >= fields.length) break;
    const sigLen = fields[pos];
    pos += 1;
    if (pos + sigLen + 1 > fields.length) break;
    const sig = fields.toString("utf8", pos, pos + sigLen);
    pos += sigLen + 1;
    if (sig === "o" || sig === "s") {
      pos = align(pos, 4);
      if (pos + 4 > fields.length) break;
      const len = u32(pos);
      pos += 4;
      if (pos + len > fields.length) break;
      const text = fields.toString("utf8", pos, pos + len);
      pos += len + 1;
      if (code === 1) names.path = text;
      if (code === 3) names.member = text;
    } else if (sig === "g") {
      if (pos >= fields.length) break;
      const len = fields[pos];
      pos += 1;
      if (pos + len > fields.length) break;
      const text = fields.toString("utf8", pos, pos + len);
      pos += len + 1;
      if (code === 8) names.signature = text;
    } else if (sig === "u" || sig === "i") {
      pos = align(pos, 4);
      if (pos + 4 > fields.length) break;
      const value = u32(pos);
      pos += 4;
      if (code === 9) names.unixFds = value;
    } else if (sig === "y") {
      if (pos >= fields.length) break;
      pos += 1;
    } else {
      break;
    }
  }
  return names;
}

/**
 * One complete D-Bus message, or null when more bytes are required.
 * `invalid` means the buffer is not a D-Bus frame.
 * @param {Buffer} buffer
 */
export function readDbusFrame(buffer) {
  if (buffer.length < 16) return null;
  const endian = buffer[0];
  if (endian !== 0x6c && endian !== 0x42) return { invalid: true };
  const little = endian === 0x6c;
  const u32 = (off) => (little ? buffer.readUInt32LE(off) : buffer.readUInt32BE(off));
  const bodyLen = u32(4);
  const fieldsLen = u32(12);
  if (fieldsLen > 1024 * 1024 || bodyLen > 16 * 1024 * 1024) return { invalid: true };
  const total = 16 + ((fieldsLen + 7) & ~7) + bodyLen;
  if (buffer.length < total) return null;
  const names = dbusHeaderNames(buffer.subarray(16, 16 + fieldsLen), little);
  return { total, type: buffer[1], ...names };
}

function cmsgFds(control, length) {
  const fds = [];
  let pos = 0;
  while (pos + 16 <= length) {
    const cmsgLen = Number(control.readBigUInt64LE(pos));
    if (cmsgLen < 16) break;
    const level = control.readInt32LE(pos + 8);
    const type = control.readInt32LE(pos + 12);
    if (level === SOL_SOCKET && type === SCM_RIGHTS) {
      const dataEnd = Math.min(pos + cmsgLen, length);
      for (let at = pos + 16; at + 4 <= dataEnd; at += 4) fds.push(control.readInt32LE(at));
    }
    pos += (cmsgLen + 7) & ~7;
  }
  return fds;
}

/**
 * A dbus-next compatible stream. `read(n)` returns a Buffer.
 * `read(n, flag)` returns `{ data, fds }` for the message body.
 */
export function createUnixFdConnection(socketPath) {
  const api = libc();
  const fd = api.socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
  if (fd < 0) throw new Error(`session bus socket failed (${errno()})`);
  const addr = Buffer.alloc(2 + Buffer.byteLength(socketPath) + 1);
  addr.writeUInt16LE(AF_UNIX, 0);
  addr.write(socketPath, 2);
  if (api.connect(fd, addr, addr.length) < 0) {
    const code = errno();
    api.close(fd);
    throw new Error(`session bus connect failed (${code})`);
  }
  const flags = api.fcntl(fd, F_GETFL, 0);
  api.fcntl(fd, F_SETFL, flags | O_NONBLOCK);

  const stream = new EventEmitter();
  stream.supportsUnixFd = true;
  stream.writable = true;
  stream.skipResponsePath = null;
  stream.setNoDelay = () => {};
  stream.fd = fd;

  let raw = Buffer.alloc(0);
  let pendingFds = [];
  let out = Buffer.alloc(0);
  let produced = 0;
  let consumed = 0;
  /** @type {{ at: number, fds: number[] }[]} */
  let fdMarks = [];
  let binary = false;
  let closed = false;

  const enqueue = (bytes, fds) => {
    const bodyAt = produced + 16;
    out = Buffer.concat([out, bytes]);
    produced += bytes.length;
    if (fds.length) fdMarks.push({ at: bodyAt, fds });
  };

  const dropFds = (fds) => {
    for (const passed of fds) {
      try { closeSync(passed); } catch { /* already closed */ }
    }
  };

  const extract = () => {
    while (raw.length > 0) {
      const frame = readDbusFrame(raw);
      if (!frame) return;
      if (frame.invalid) {
        enqueue(raw, pendingFds.splice(0));
        raw = Buffer.alloc(0);
        return;
      }
      const bytes = Buffer.from(raw.subarray(0, frame.total));
      raw = raw.subarray(frame.total);
      const want = frame.unixFds || 0;
      const fds = want > 0 ? pendingFds.splice(0, want) : [];
      const skip = stream.skipResponsePath
        && frame.type === SIGNAL
        && frame.member === "Response"
        && frame.path === stream.skipResponsePath;
      if (skip) {
        dropFds(fds);
        continue;
      }
      enqueue(bytes, fds);
    }
  };

  const polled = api.koffi.alloc(api.pollfd, 1);
  const recvBuf = Buffer.alloc(65536);
  const control = Buffer.alloc(256);
  const iov = api.koffi.alloc(api.iovec, 1);
  const hdr = api.koffi.alloc(api.msghdr, 1);

  const pump = () => {
    if (closed) return;
    api.koffi.encode(polled, 0, api.pollfd, { fd, events: POLLIN, revents: 0 });
    const ready = api.poll(polled, 1, 0);
    if (ready <= 0) return;
    const ev = api.koffi.decode(polled, 0, api.pollfd);
    if (ev.revents & (POLLERR | POLLHUP)) {
      stream.end();
      return;
    }
    if (!(ev.revents & POLLIN)) return;

    api.koffi.encode(iov, 0, api.iovec, { iov_base: recvBuf, iov_len: recvBuf.length });
    api.koffi.encode(hdr, 0, api.msghdr, {
      msg_name: null,
      msg_namelen: 0,
      msg_iov: iov,
      msg_iovlen: 1,
      msg_control: control,
      msg_controllen: control.length,
      msg_flags: 0,
    });
    const got = api.recvmsg(fd, hdr, MSG_CMSG_CLOEXEC);
    if (got < 0) return;
    if (got === 0) {
      stream.end();
      return;
    }
    const decoded = api.koffi.decode(hdr, 0, api.msghdr);
    const fds = cmsgFds(control, Number(decoded.msg_controllen) || 0);
    if (fds.length) pendingFds.push(...fds);
    const chunk = Buffer.from(recvBuf.subarray(0, got));
    if (!binary) {
      dropFds(pendingFds.splice(0));
      enqueue(chunk, []);
    }
    else {
      raw = Buffer.concat([raw, chunk]);
      extract();
    }
    stream.emit("readable");
  };

  const timer = setInterval(pump, 5);

  stream.read = function read(n) {
    if (out.length < n) return null;
    const data = Buffer.from(out.subarray(0, n));
    out = out.subarray(n);
    const start = consumed;
    consumed += n;
    // Arrow functions do not see this call's arguments. dbus-next's body
    // read passes a second argument and expects { data, fds }.
    if (arguments.length < 2) return data;
    const fds = [];
    fdMarks = fdMarks.filter((mark) => {
      if (mark.at >= start && mark.at < consumed) {
        fds.push(...mark.fds);
        return false;
      }
      return true;
    });
    return { data, fds };
  };

  stream.write = (chunk) => {
    let data = chunk;
    if (chunk && typeof chunk === "object" && !Buffer.isBuffer(chunk) && chunk.data) {
      data = chunk.data;
    }
    if (typeof data === "string") data = Buffer.from(data);
    if (!Buffer.isBuffer(data)) data = Buffer.from(data);
    if (!binary && data.toString("utf8").includes("BEGIN")) binary = true;
    let off = 0;
    while (off < data.length) {
      const payload = off === 0 ? data : Buffer.from(data.subarray(off));
      const sent = api.send(fd, payload, payload.length, 0);
      if (sent < 0) {
        stream.emit("error", new Error(`session bus send failed (${errno()})`));
        return false;
      }
      off += Number(sent);
    }
    return true;
  };

  stream.end = () => {
    if (closed) return stream;
    closed = true;
    clearInterval(timer);
    stream.writable = false;
    try { api.close(fd); } catch { /* ignore */ }
    dropFds(pendingFds.splice(0));
    stream.emit("end");
    return stream;
  };

  process.nextTick(() => {
    if (!closed) stream.emit("connect");
  });
  return stream;
}

/**
 * dbus-next opens the session bus with net.createConnection. Swap that call
 * for the recvmsg socket, then put the original back.
 * @param {(opts?: object) => object} sessionBus
 */
export function connectSessionBus(sessionBus) {
  const net = require("net");
  const original = net.createConnection;
  net.createConnection = (path, ...rest) => {
    if (typeof path === "string" && path.startsWith("/")) return createUnixFdConnection(path);
    return original.call(net, path, ...rest);
  };
  try {
    return sessionBus({ negotiateUnixFd: true });
  } finally {
    net.createConnection = original;
  }
}
