/**
 * XDG Desktop Portal ScreenCast (xdg-desktop-portal-hyprland).
 * One approval is stored as a restore token under ~/.agenticros/.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export function restoreTokenPath(home = homedir()) {
  return join(home, ".agenticros", "desktop-restore-token");
}

export function loadRestoreToken(file = restoreTokenPath()) {
  try {
    const text = readFileSync(file, "utf8").trim();
    return text || null;
  } catch {
    return null;
  }
}

export function saveRestoreToken(token, file = restoreTokenPath()) {
  if (!token) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${token}\n`, { mode: 0o600 });
}

/** `:1.42` → `1_42` (drop the colon, dots become underscores). */
export function portalSenderToken(uniqueName) {
  return String(uniqueName || "").replace(/^:/, "").replaceAll(".", "_");
}

export function portalRequestPath(uniqueName, token) {
  return `/org/freedesktop/portal/desktop/request/${portalSenderToken(uniqueName)}/${token}`;
}

export function portalSessionPath(uniqueName, token) {
  return `/org/freedesktop/portal/desktop/session/${portalSenderToken(uniqueName)}/${token}`;
}

export function variantValue(value) {
  if (value && typeof value === "object" && "value" in value) return variantValue(value.value);
  return value;
}

/**
 * Start() results include `streams` as a(ua{sv}): node id plus properties.
 * @param {Record<string, unknown>} results
 * @returns {{ nodeId: number, width: number, height: number, restoreToken: string | null } | null}
 */
export function streamFromResults(results) {
  if (!results || typeof results !== "object") return null;
  const streams = variantValue(results.streams);
  const restoreToken = variantValue(results.restore_token);
  if (!Array.isArray(streams) || streams.length === 0) return null;
  const entry = streams[0];
  const nodeId = Array.isArray(entry) ? Number(entry[0]) : Number(entry?.nodeId);
  const props = Array.isArray(entry) ? entry[1] : entry?.props;
  let width = 0;
  let height = 0;
  const size = variantValue(props?.size ?? props?.get?.("size"));
  if (Array.isArray(size) && size.length >= 2) {
    width = Number(size[0]) || 0;
    height = Number(size[1]) || 0;
  }
  if (!Number.isFinite(nodeId)) return null;
  return {
    nodeId,
    width,
    height,
    restoreToken: typeof restoreToken === "string" ? restoreToken : null,
  };
}

function handleToken() {
  return `agenticros${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * Open a monitor ScreenCast. Resolves when the person at the robot approves
 * (or immediately when a restore token is still valid).
 *
 * @param {{ log?: (line: string) => void, tokenFile?: string }} [opts]
 * @returns {Promise<{ fd: number, nodeId: number, width: number, height: number, close: () => void }>}
 */
export async function openScreenCast(opts = {}) {
  const log = opts.log || (() => {});
  let dbus;
  try {
    dbus = await import("dbus-next");
  } catch {
    throw new Error("dbus-next is not installed; cannot open the Hyprland screen cast portal");
  }
  const { Variant, Message, sessionBus } = dbus;
  const bus = sessionBus();
  const desktop = await bus.getProxyObject(
    "org.freedesktop.portal.Desktop",
    "/org/freedesktop/portal/desktop",
  );
  const screencast = desktop.getInterface("org.freedesktop.portal.ScreenCast");
  if (!bus.name) {
    await new Promise((resolve, reject) => {
      bus.once("connect", resolve);
      bus.once("error", reject);
    });
  }
  const unique = bus.name;
  if (!unique) throw new Error("D-Bus session bus has no unique name");

  const sessionToken = handleToken();
  const sessionPath = portalSessionPath(unique, sessionToken);

  await portalCall(bus, screencast, "CreateSession", unique, (token) => ({
    handle_token: new Variant("s", token),
    session_handle_token: new Variant("s", sessionToken),
  }));

  const saved = loadRestoreToken(opts.tokenFile);
  const selectOptions = {
    types: new Variant("u", 1),
    multiple: new Variant("b", false),
    persist_mode: new Variant("u", 2),
    cursor_mode: new Variant("u", 2),
  };
  if (saved) selectOptions.restore_token = new Variant("s", saved);

  await portalCall(bus, screencast, "SelectSources", unique, (token) => ({
    ...selectOptions,
    handle_token: new Variant("s", token),
  }), sessionPath);

  log("Waiting for the Hyprland screen-share approval");
  const started = await portalCall(bus, screencast, "Start", unique, (token) => ({
    handle_token: new Variant("s", token),
  }), sessionPath, "");

  const stream = streamFromResults(started);
  if (!stream) throw new Error("Screen cast started without a PipeWire stream");
  if (stream.restoreToken) saveRestoreToken(stream.restoreToken, opts.tokenFile);

  const reply = await bus.call(new Message({
    destination: "org.freedesktop.portal.Desktop",
    path: "/org/freedesktop/portal/desktop",
    interface: "org.freedesktop.portal.ScreenCast",
    member: "OpenPipeWireRemote",
    signature: "oa{sv}",
    body: [sessionPath, {}],
  }));
  const fd = unixFd(reply);
  if (fd == null) throw new Error("Portal did not return a PipeWire file descriptor");

  return {
    fd,
    nodeId: stream.nodeId,
    width: stream.width,
    height: stream.height,
    close() {
      try { bus.disconnect(); } catch { /* ignore */ }
    },
  };
}

function unixFd(reply) {
  // dbus-next unmarshals signature `h` as the received file descriptor.
  const value = Array.isArray(reply?.body) ? reply.body[0] : null;
  return typeof value === "number" && value >= 0 ? value : null;
}

/**
 * Subscribe to the predictable request path, then invoke the portal method.
 * @param {object} bus
 * @param {object} screencast
 * @param {string} member
 * @param {string} unique
 * @param {(token: string) => Record<string, unknown>} options
 * @param {...unknown} leading
 */
async function portalCall(bus, screencast, member, unique, options, ...leading) {
  const token = handleToken();
  const path = portalRequestPath(unique, token);
  const match = `type='signal',interface='org.freedesktop.portal.Request',member='Response',path='${path}'`;
  await bus._addMatch(match);
  const pending = waitForPortalResponse(bus, path);
  try {
    const call = screencast[member](...leading, options(token));
    const [results] = await Promise.all([pending, call]);
    return results;
  } finally {
    bus._removeMatch(match).catch(() => {});
  }
}

function waitForPortalResponse(bus, path) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Portal request timed out (${path})`));
    }, 120000);
    const onMessage = (msg) => {
      if (settled || !msg || msg.path !== path || msg.member !== "Response") return;
      settled = true;
      cleanup();
      const code = msg.body?.[0];
      const results = msg.body?.[1] || {};
      if (code !== 0) reject(new Error(`Portal request was denied (${code})`));
      else resolve(results);
    };
    const cleanup = () => {
      clearTimeout(timer);
      bus.removeListener("message", onMessage);
    };
    bus.on("message", onMessage);
  });
}
