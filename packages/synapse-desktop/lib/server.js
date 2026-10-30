import { WebSocketServer } from "ws";

/**
 * Local signaling socket. `synapse connect` dials this and forwards the
 * cloud `desktop` event. One viewer at a time: a new socket replaces the old.
 *
 * @param {{ port: number, host?: string, onSignal: (msg: object, send: (msg: object) => void) => void, log?: (line: string) => void }} opts
 */
export function startDesktopServer(opts) {
  const host = opts.host || "127.0.0.1";
  const log = opts.log || (() => {});
  const wss = new WebSocketServer({ port: opts.port, host });
  /** @type {import('ws').WebSocket | null} */
  let active = null;

  wss.on("connection", (socket) => {
    if (active && active.readyState === active.OPEN) {
      try { active.close(); } catch { /* ignore */ }
    }
    active = socket;
    log("Desktop relay connected");

    const send = (msg) => {
      if (socket.readyState !== socket.OPEN) return;
      socket.send(JSON.stringify(msg));
    };

    socket.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (!msg || msg.type === "hello") return;
      if (msg.type !== "desktop") return;
      try {
        opts.onSignal(msg, send);
      } catch (err) {
        log(`Desktop signal failed: ${err instanceof Error ? err.message : err}`);
      }
    });

    socket.on("close", () => {
      if (active !== socket) return;
      active = null;
      try {
        opts.onSignal({ type: "desktop", signal: "end" }, () => {});
      } catch {
        // ignore
      }
    });
  });

  wss.on("error", (err) => {
    log(`Desktop signaling socket error: ${err.message}`);
  });

  return {
    wss,
    close() {
      return new Promise((resolve) => wss.close(() => resolve()));
    },
  };
}
