/**
 * XDG Desktop Portal ScreenCast (xdg-desktop-portal-hyprland).
 * One approval is stored as a restore token under ~/.agenticros/.
 */

import { spawn } from "node:child_process";
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
 * `busctl monitor` text for one ScreenCast Response.
 * dbus-next never sees this signal: its parser stalls on the streams variant
 * and the desktop agent then sits on "waiting for approval" forever.
 *
 * @param {string} text
 * @returns {{ nodeId: number, width: number, height: number, restoreToken: string | null } | { denied: number } | null}
 */
export function parseBusctlScreenCast(text) {
  const member = text.indexOf("Member=Response");
  if (member < 0) return null;
  const body = text.slice(member);
  const codeMatch = body.match(/UINT32\s+(\d+)/i);
  if (!codeMatch) return null;
  const code = Number(codeMatch[1]);
  if (code !== 0) return { denied: code };

  const streamsAt = body.indexOf('STRING "streams"');
  if (streamsAt < 0) return null;
  const nodeMatch = body.slice(streamsAt).match(/UINT32\s+(\d+)/i);
  if (!nodeMatch) return null;

  let width = 0;
  let height = 0;
  const sizeAt = body.indexOf('STRING "size"');
  if (sizeAt >= 0) {
    const dims = [...body.slice(sizeAt).matchAll(/INT32\s+(-?\d+)/gi)];
    if (dims.length < 2) return null;
    width = Number(dims[0][1]);
    height = Number(dims[1][1]);
  }

  let restoreToken = null;
  const tokenAt = body.indexOf('STRING "restore_token"');
  if (tokenAt >= 0) {
    const strings = [...body.slice(tokenAt).matchAll(/STRING "((?:\\.|[^"\\])*)"/g)];
    if (strings.length < 2) return null;
    restoreToken = strings[1][1];
  }

  return {
    nodeId: Number(nodeMatch[1]),
    width,
    height,
    restoreToken,
  };
}

/**
 * Read the Start() Response with busctl so the streams payload never enters
 * the dbus-next connection.
 *
 * @param {string} path request object path
 * @param {{ log?: (line: string) => void }} [opts]
 */
function watchPortalResponse(path, opts = {}) {
  const log = opts.log || (() => {});
  const match = `type='signal',interface='org.freedesktop.portal.Request',member='Response',path='${path}'`;
  // stdbuf line-buffers busctl. A pipe would otherwise hold the signal until
  // the process exits, which is after we need the node id.
  const child = spawn("stdbuf", [
    "-oL",
    "-eL",
    "busctl",
    "--user",
    "monitor",
    "--match",
    match,
  ], { stdio: ["ignore", "pipe", "pipe"] });

  let text = "";
  let settled = false;
  /** @type {(value: ReturnType<typeof parseBusctlScreenCast>) => void} */
  let resolve;
  /** @type {(err: Error) => void} */
  let reject;
  const done = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const finish = (err, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (!child.killed) child.kill();
    if (err) reject(err);
    else resolve(value);
  };

  const timer = setTimeout(() => {
    finish(new Error(`Portal request timed out (${path})`));
  }, 120000);

  child.stdout.on("data", (chunk) => {
    text += chunk.toString();
    const parsed = parseBusctlScreenCast(text);
    if (!parsed) return;
    if ("denied" in parsed) {
      finish(new Error(`Portal request was denied (${parsed.denied})`));
      return;
    }
    log(`Screen cast node ${parsed.nodeId}`);
    finish(null, parsed);
  });
  child.stderr.on("data", (chunk) => {
    log(`busctl: ${chunk.toString().trim()}`);
  });
  child.on("error", (err) => {
    finish(err instanceof Error ? err : new Error(String(err)));
  });
  child.on("exit", (code) => {
    if (!settled) finish(new Error(`busctl monitor exited (${code ?? "signal"})`));
  });

  return {
    done,
    stop() {
      finish(new Error("Screen cast watch closed"));
    },
  };
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
  const started = await portalStart(screencast, unique, sessionPath, Variant, log);
  const stream = {
    nodeId: started.nodeId,
    width: started.width,
    height: started.height,
    restoreToken: started.restoreToken,
  };
  if (!Number.isFinite(stream.nodeId)) throw new Error("Screen cast started without a PipeWire stream");
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
/**
 * Start() returns its PipeWire node on a signal whose body stalls dbus-next.
 * busctl reads that signal instead. The method return itself is only the
 * request path, which dbus-next can accept.
 *
 * @param {object} screencast
 * @param {string} unique
 * @param {string} sessionPath
 * @param {new (signature: string, value: unknown) => unknown} Variant
 * @param {(line: string) => void} log
 */
async function portalStart(screencast, unique, sessionPath, Variant, log) {
  const token = handleToken();
  const path = portalRequestPath(unique, token);
  const watch = watchPortalResponse(path, { log });
  watch.done.catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    await screencast.Start(sessionPath, "", {
      handle_token: new Variant("s", token),
    });
    const started = await watch.done;
    if (!started || "denied" in started) {
      throw new Error("Screen cast started without a PipeWire stream");
    }
    return started;
  } finally {
    watch.stop();
  }
}

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
