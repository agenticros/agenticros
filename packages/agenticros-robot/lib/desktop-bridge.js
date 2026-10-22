import WsWebSocket from "ws";

import { browserIceServers } from "./telepresence-bridge.js";

/**
 * Relay ARC desktop signaling to the local `agenticros desktop` process.
 *
 * The media peer connection is browser ↔ desktop agent. This process only
 * forwards SDP and ICE over a localhost WebSocket. It does not touch the
 * node-datachannel teleop session.
 */

/**
 * @param {object} message socket.io desktop payload from the operator
 * @param {unknown} [fallbackIce] ICE list already fetched from ARC
 */
export function toDesktopSignal(message, fallbackIce) {
  const signal = String(message?.type || "").toLowerCase();
  const fromMessage = browserIceServers(message?.iceServers);
  const iceServers = fromMessage.length ? fromMessage : browserIceServers(fallbackIce);
  const payload = {
    type: "desktop",
    signal,
    sdp: message?.sdp,
    candidate: message?.candidate,
    sdpMid: message?.sdpMid ?? message?.mid,
    sdpMLineIndex: message?.sdpMLineIndex,
  };
  if (signal === "offer") payload.iceServers = iceServers;
  return payload;
}

/**
 * Desktop agent → operator. Returns null for hello and other local messages.
 * @param {object} msg
 */
export function fromDesktopSignal(msg) {
  if (!msg || msg.type !== "desktop") return null;
  const type = String(msg.signal || "").toLowerCase();
  if (!type) return null;
  return {
    type,
    sdp: msg.sdp,
    candidate: msg.candidate,
    sdpMid: msg.sdpMid,
    sdpMLineIndex: msg.sdpMLineIndex,
    state: msg.state,
    reason: msg.reason,
    width: msg.width,
    height: msg.height,
  };
}

/**
 * @param {{
 *   url?: string,
 *   iceServers?: () => unknown,
 *   WebSocketImpl?: typeof WebSocket,
 *   onRelay?: (msg: object) => void,
 *   log?: (line: string) => void,
 *   connectTimeoutMs?: number,
 * }} [opts]
 */
export function createDesktopBridge(opts = {}) {
  const port = process.env.AGENTICROS_DESKTOP_PORT || "8766";
  const url = opts.url || `ws://127.0.0.1:${port}`;
  const WebSocketImpl = opts.WebSocketImpl || globalThis.WebSocket || WsWebSocket;
  const log = opts.log || (() => {});
  const connectTimeoutMs = opts.connectTimeoutMs ?? 1500;
  const iceServers = opts.iceServers || (() => []);

  /** @type {WebSocket | null} */
  let ws = null;
  /** @type {Promise<boolean> | null} */
  let connecting = null;

  const hello = () => {
    if (!ws || ws.readyState !== WebSocketImpl.OPEN) return;
    ws.send(JSON.stringify({ type: "hello", role: "agent" }));
  };

  const ensure = () => {
    if (!WebSocketImpl) return Promise.resolve(false);
    if (ws && ws.readyState === WebSocketImpl.OPEN) return Promise.resolve(true);
    if (connecting) return connecting;

    connecting = new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        connecting = null;
        resolve(ok);
      };

      let socket;
      try {
        socket = new WebSocketImpl(url);
      } catch (err) {
        log(`Desktop socket failed: ${err instanceof Error ? err.message : err}`);
        finish(false);
        return;
      }

      const timer = setTimeout(() => {
        try { socket.close(); } catch { /* ignore */ }
        if (ws === socket) ws = null;
        finish(false);
      }, connectTimeoutMs);

      socket.onopen = () => {
        clearTimeout(timer);
        ws = socket;
        hello();
        log(`Desktop relay connected to ${url}`);
        finish(true);
      };

      socket.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const relayed = fromDesktopSignal(msg);
        if (relayed && opts.onRelay) opts.onRelay(relayed);
      };

      socket.onerror = () => {
        clearTimeout(timer);
        if (ws !== socket) finish(false);
      };

      socket.onclose = () => {
        clearTimeout(timer);
        if (ws === socket) ws = null;
        finish(false);
      };
    });

    return connecting;
  };

  return {
    url,

    /** @param {object} message */
    async forward(message) {
      const ok = await ensure();
      if (!ok || !ws || ws.readyState !== WebSocketImpl.OPEN) return false;
      const payload = toDesktopSignal(message, iceServers());
      try {
        ws.send(JSON.stringify(payload));
        return true;
      } catch (err) {
        log(`Desktop forward failed: ${err instanceof Error ? err.message : err}`);
        return false;
      }
    },

    /** Ask the desktop agent to drop the viewer. */
    end() {
      if (!ws || ws.readyState !== WebSocketImpl.OPEN) return;
      try {
        ws.send(JSON.stringify({ type: "desktop", signal: "end" }));
      } catch {
        // ignore
      }
    },

    close() {
      if (!ws) return;
      try { ws.close(); } catch { /* ignore */ }
      ws = null;
    },
  };
}
