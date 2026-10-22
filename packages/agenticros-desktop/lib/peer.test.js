import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { RTCPeerConnection } from "werift";

import { createDesktopPeer, h264Codec, normalizeIceServers } from "./peer.js";

describe("desktop peer", () => {
  it("normalizes browser ICE servers to one url each", () => {
    assert.deepEqual(
      normalizeIceServers([
        { urls: ["stun:stun.l.google.com:19302", "stun:stun.example:19302"] },
        { urls: "turn:example:3478", username: "u", credential: "p" },
      ]),
      [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.example:19302" },
        { urls: "turn:example:3478", username: "u", credential: "p" },
      ],
    );
  });

  it("answers a recvonly video offer with constrained-baseline H.264", async () => {
    const offerer = new RTCPeerConnection({
      iceServers: [],
      codecs: { video: [h264Codec()] },
    });
    offerer.addTransceiver("video", { direction: "recvonly" });
    offerer.createDataChannel("desktop-input", { ordered: true });
    const offer = await offerer.createOffer();
    await offerer.setLocalDescription(offer);

    const received = [];
    const answerer = createDesktopPeer({ iceServers: [] });
    const answerSdp = await answerer.acceptOffer(offer.sdp, (candidate) => {
      received.push(candidate);
    });

    assert.match(answerSdp, /m=video/);
    assert.match(answerSdp, /H264\/90000/);
    assert.match(answerSdp, /profile-level-id=42e01f/);
    assert.match(answerSdp, /packetization-mode=1/);
    assert.match(answerSdp, /a=sendonly/);
    assert.doesNotMatch(answerSdp, /a=recvonly/);

    await answerer.close();
    await offerer.close();
    void received;
  });
});
