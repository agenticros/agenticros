import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WebSocketServer } from "ws";

import {
  browserIceServers,
  createEyesTelepresenceBridge,
  fromEyesTelepresence,
  toEyesTelepresence,
} from "./telepresence-bridge.js";

describe("telepresence bridge messages", () => {
  it("converts node-datachannel TURN strings into browser ICE objects", () => {
    const ice = browserIceServers([
      "stun:stun.relay.metered.ca:80",
      "turn:user:secret@global.relay.metered.ca:80?transport=tcp",
    ]);
    assert.deepEqual(ice, [
      { urls: "stun:stun.relay.metered.ca:80" },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "user",
        credential: "secret",
      },
    ]);
  });

  it("puts ICE servers on the offer forwarded to Eyes", () => {
    const payload = toEyesTelepresence(
      {
        type: "offer",
        sdp: "v=0",
        video: true,
        audio: false,
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
      ["stun:fallback.example:19302"],
    );
    assert.equal(payload.type, "telepresence");
    assert.equal(payload.signal, "offer");
    assert.equal(payload.video, true);
    assert.deepEqual(payload.iceServers, [{ urls: "stun:stun.l.google.com:19302" }]);
  });

  it("ignores Eyes gaze messages", () => {
    assert.equal(fromEyesTelepresence({ type: "gaze", gazeX: 1 }), null);
    assert.deepEqual(
      fromEyesTelepresence({ type: "telepresence", signal: "answer", sdp: "v=a" }),
      { type: "answer", sdp: "v=a", candidate: undefined, sdpMid: undefined, sdpMLineIndex: undefined },
    );
  });
});

describe("telepresence bridge socket", () => {
  it("says hello and forwards an offer once Eyes accepts the socket", async () => {
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
    const bridge = createEyesTelepresenceBridge({
      url: "ws://127.0.0.1:8765",
      WebSocketImpl: FakeWS,
      onRelay: (msg) => relayed.push(msg),
    });

    const ok = await bridge.forward({ type: "offer", sdp: "v=0", video: true, audio: true });
    assert.equal(ok, true);
    assert.deepEqual(sent.map((m) => m.type === "hello" ? m : m.signal), [
      { type: "hello", role: "agent" },
      "offer",
    ]);

    opened.onmessage?.({ data: JSON.stringify({ type: "gaze", gazeX: 0 }) });
    opened.onmessage?.({
      data: JSON.stringify({ type: "telepresence", signal: "answer", sdp: "v=a" }),
    });
    assert.deepEqual(relayed, [
      { type: "answer", sdp: "v=a", candidate: undefined, sdpMid: undefined, sdpMLineIndex: undefined },
    ]);
  });

  it("reports Eyes offline when the socket errors before open", async () => {
    class FakeWS {
      static OPEN = 1;
      constructor() {
        this.readyState = 0;
        queueMicrotask(() => this.onerror?.());
      }
      send() {}
      close() {}
    }

    const bridge = createEyesTelepresenceBridge({
      url: "ws://127.0.0.1:1",
      WebSocketImpl: FakeWS,
      connectTimeoutMs: 50,
    });
    assert.equal(await bridge.forward({ type: "offer", sdp: "v=0" }), false);
  });

  it("speaks to a local Eyes WebSocket and relays the answer", async () => {
    const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
    await new Promise((resolve) => server.on("listening", resolve));
    const { port } = server.address();
    const received = [];
    server.on("connection", (socket) => {
      socket.on("message", (data) => {
        const msg = JSON.parse(String(data));
        received.push(msg);
        if (msg.type === "hello") {
          socket.send(JSON.stringify({ type: "gaze", gazeX: 0 }));
          socket.send(JSON.stringify({ type: "telepresence", signal: "answer", sdp: "v=a" }));
        }
      });
    });

    const relayed = [];
    const bridge = createEyesTelepresenceBridge({
      url: `ws://127.0.0.1:${port}`,
      onRelay: (msg) => relayed.push(msg),
    });
    try {
      assert.equal(
        await bridge.forward({ type: "offer", sdp: "v=0", video: true, audio: false }),
        true,
      );
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
