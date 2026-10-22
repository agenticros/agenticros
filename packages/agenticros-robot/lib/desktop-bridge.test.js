import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WebSocketServer } from "ws";

import {
  createDesktopBridge,
  fromDesktopSignal,
  toDesktopSignal,
} from "./desktop-bridge.js";

describe("desktop bridge messages", () => {
  it("puts ICE servers on the offer forwarded to the desktop agent", () => {
    const payload = toDesktopSignal(
      {
        type: "offer",
        sdp: "v=0",
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
      ["turn:user:secret@global.relay.metered.ca:80"],
    );
    assert.equal(payload.type, "desktop");
    assert.equal(payload.signal, "offer");
    assert.equal(payload.sdp, "v=0");
    assert.deepEqual(payload.iceServers, [{ urls: "stun:stun.l.google.com:19302" }]);
  });

  it("falls back to the connect process ICE list when the offer has none", () => {
    const payload = toDesktopSignal(
      { type: "Offer", sdp: "v=0" },
      ["turn:user:secret@global.relay.metered.ca:80?transport=tcp"],
    );
    assert.equal(payload.signal, "offer");
    assert.deepEqual(payload.iceServers, [
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "user",
        credential: "secret",
      },
    ]);
  });

  it("relays answer, candidate, and status, and ignores hello", () => {
    assert.equal(fromDesktopSignal({ type: "hello", role: "agent" }), null);
    assert.deepEqual(
      fromDesktopSignal({ type: "desktop", signal: "answer", sdp: "v=a" }),
      {
        type: "answer",
        sdp: "v=a",
        candidate: undefined,
        sdpMid: undefined,
        sdpMLineIndex: undefined,
        state: undefined,
        reason: undefined,
        width: undefined,
        height: undefined,
      },
    );
    assert.equal(
      fromDesktopSignal({
        type: "desktop",
        signal: "status",
        state: "waiting-approval",
      }).state,
      "waiting-approval",
    );
  });
});

describe("desktop bridge socket", () => {
  it("says hello and forwards an offer once the desktop agent accepts the socket", async () => {
    const sent = [];
    let opened;
    class FakeWS {
      static OPEN = 1;
      constructor() {
        opened = this;
        this.readyState = 0;
        this.sent = sent;
        queueMicrotask(() => {
          this.readyState = FakeWS.OPEN;
          this.onopen?.();
        });
      }
      send(data) {
        sent.push(JSON.parse(data));
      }
      close() {
        this.readyState = 3;
        this.onclose?.();
      }
    }

    const relayed = [];
    const bridge = createDesktopBridge({
      url: "ws://127.0.0.1:8766",
      WebSocketImpl: FakeWS,
      onRelay: (msg) => relayed.push(msg),
    });

    const ok = await bridge.forward({ type: "offer", sdp: "v=0" });
    assert.equal(ok, true);
    assert.deepEqual(sent.map((m) => (m.type === "hello" ? m : m.signal)), [
      { type: "hello", role: "agent" },
      "offer",
    ]);

    opened.onmessage?.({ data: JSON.stringify({ type: "hello", role: "desktop" }) });
    opened.onmessage?.({
      data: JSON.stringify({
        type: "desktop",
        signal: "status",
        state: "streaming",
        width: 1280,
        height: 720,
      }),
    });
    assert.equal(relayed[0]?.type, "status");
    assert.equal(relayed[0]?.width, 1280);
  });

  it("reports the desktop agent offline when the socket errors before open", async () => {
    class FakeWS {
      static OPEN = 1;
      constructor() {
        this.readyState = 0;
        queueMicrotask(() => this.onerror?.());
      }
      send() {}
      close() {}
    }

    const bridge = createDesktopBridge({
      url: "ws://127.0.0.1:1",
      WebSocketImpl: FakeWS,
      connectTimeoutMs: 50,
    });
    assert.equal(await bridge.forward({ type: "offer", sdp: "v=0" }), false);
  });

  it("speaks to a local desktop WebSocket and relays the answer", async () => {
    const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
    await new Promise((resolve) => server.on("listening", resolve));
    const { port } = server.address();
    const received = [];
    server.on("connection", (socket) => {
      socket.on("message", (data) => {
        const msg = JSON.parse(String(data));
        received.push(msg);
        if (msg.signal === "offer") {
          socket.send(JSON.stringify({ type: "desktop", signal: "answer", sdp: "v=a" }));
        }
      });
    });

    const relayed = [];
    const bridge = createDesktopBridge({
      url: `ws://127.0.0.1:${port}`,
      onRelay: (msg) => relayed.push(msg),
    });
    try {
      assert.equal(await bridge.forward({ type: "offer", sdp: "v=0" }), true);
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(received[0]?.type, "hello");
      assert.equal(received[1]?.signal, "offer");
      assert.equal(relayed[0]?.type, "answer");
      assert.equal(relayed[0]?.sdp, "v=a");
    } finally {
      bridge.close();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
