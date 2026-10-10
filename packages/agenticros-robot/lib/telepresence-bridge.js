import WsWebSocket from "ws";

/**
 * Relay ARC telepresence signaling to the local Eyes kiosk.
 *
 * The media peer connection is browser-to-browser (ARC control page ↔ Eyes).
 * This process only forwards SDP and ICE over the Eyes WebSocket. It does not
 * touch the node-datachannel teleop session.
 */

/**
 * Turn node-datachannel ICE strings (or browser RTCIceServer objects) into
 * the object form the Eyes page can pass to RTCPeerConnection.
 * @param {unknown} list
 * @returns {object[]}
 */
export function browserIceServers(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const entry of list) {
    if (!entry) continue;
    if (typeof entry === "object" && entry.urls) {
      out.push(entry);
      continue;
    }
    if (typeof entry !== "string") continue;
    const withAuth = entry.match(/^(turns?):([^:@]+):([^@]+)@([^?]+)(\?.*)?$/i);
    if (withAuth) {
      out.push({
        urls: `${withAuth[1]}:${withAuth[4]}${withAuth[5] || ""}`,
        username: withAuth[2],
        credential: withAuth[3],
      });
      continue;
    }
    out.push({ urls: entry });
  }
  return out;
}

/**
 * @param {object} message socket.io telepresence payload from the operator
 * @param {unknown} [fallbackIce] node-datachannel ICE list already fetched from ARC
 */
export function toEyesTelepresence(message, fallbackIce) {
  const signal = String(message?.type || "").toLowerCase();
  const fromMessage = browserIceServers(message?.iceServers);
  const iceServers = fromMessage.length ? fromMessage : browserIceServers(fallbackIce);
  const payload = {
    type: "telepresence",
    signal,
    sdp: message?.sdp,
    candidate: message?.candidate,
    sdpMid: message?.sdpMid ?? message?.mid,
    sdpMLineIndex: message?.sdpMLineIndex,
    video: message?.video,
    audio: message?.audio,
  };
  if (signal === "offer") payload.iceServers = iceServers;
  return payload;
}

/**
 * Eyes → operator. Returns null for gaze and other local messages.
 * @param {object} msg
 */
export function fromEyesTelepresence(msg) {
  if (!msg || msg.type !== "telepresence") return null;
  const type = String(msg.signal || "").toLowerCase();
  if (!type) return null;
  return {
    type,
    sdp: msg.sdp,
    candidate: msg.candidate,
    sdpMid: msg.sdpMid,
    sdpMLineIndex: msg.sdpMLineIndex,
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
export function createEyesTelepresenceBridge(opts = {}) {
  const port = process.env.EYES_PORT || "8765";
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
        log(`Telepresence Eyes socket failed: ${err instanceof Error ? err.message : err}`);
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
        log(`Telepresence relay connected to ${url}`);
        finish(true);
      };

      socket.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const relayed = fromEyesTelepresence(msg);
        if (relayed && opts.onRelay) opts.onRelay(relayed);
      };

      socket.onerror = () => {
        clearTimeout(timer);
        // onclose follows; resolve false if we never opened
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
      const payload = toEyesTelepresence(message, iceServers());
      try {
        ws.send(JSON.stringify(payload));
        return true;
      } catch (err) {
        log(`Telepresence forward failed: ${err instanceof Error ? err.message : err}`);
        return false;
      }
    },

    /** Ask Eyes to drop the call and return to the face. */
    end() {
      if (!ws || ws.readyState !== WebSocketImpl.OPEN) return;
      try {
        ws.send(JSON.stringify({ type: "telepresence", signal: "end" }));
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
