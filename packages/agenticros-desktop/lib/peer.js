/**
 * Answer the browser's recvonly H.264 offer and push Annex-B access units
 * as RTP. Mouse and keyboard arrive on the desktop-input data channel.
 */

import {
  MediaStreamTrack,
  RTCPeerConnection,
  RTCRtpCodecParameters,
} from "werift";

import { packetizeAccessUnit } from "./h264-rtp.js";

const H264_FMTP = "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f";

export function h264Codec() {
  return new RTCRtpCodecParameters({
    mimeType: "video/H264",
    clockRate: 90000,
    payloadType: 102,
    parameters: H264_FMTP,
  });
}

export function normalizeIceServers(list) {
  const out = [];
  for (const entry of list || []) {
    if (!entry || typeof entry !== "object") continue;
    const urls = Array.isArray(entry.urls) ? entry.urls : [entry.urls];
    for (const url of urls) {
      if (typeof url !== "string" || !url) continue;
      const server = { urls: url };
      if (entry.username) server.username = String(entry.username);
      if (entry.credential) server.credential = String(entry.credential);
      out.push(server);
    }
  }
  return out;
}

/**
 * @param {{ iceServers?: object[], onInput?: (raw: unknown) => void, fps?: number, log?: (line: string) => void }} opts
 */
export function createDesktopPeer(opts = {}) {
  const log = opts.log || (() => {});
  const pc = new RTCPeerConnection({
    iceServers: normalizeIceServers(opts.iceServers),
    codecs: { video: [h264Codec()] },
  });
  const track = new MediaStreamTrack({ kind: "video" });
  let payloadType = 102;
  let sequence = Math.floor(Math.random() * 0xffff);
  let timestamp = Math.floor(Math.random() * 0xffffffff);
  const ssrc = (Math.random() * 0xffffffff) >>> 0;
  let fps = opts.fps || 15;
  let inputEnabled = false;
  /** @type {RTCPeerConnection | null} */
  let closed = false;

  pc.onDataChannel.subscribe((channel) => {
    if (channel.label !== "desktop-input") {
      log(`Ignoring data channel ${channel.label}`);
      return;
    }
    const accept = (data) => {
      if (!inputEnabled || channel.readyState !== "open") return;
      opts.onInput?.(data);
    };
    channel.stateChanged.subscribe((state) => {
      inputEnabled = state === "open";
      if (state === "open") log("desktop-input open");
    });
    if (channel.readyState === "open") inputEnabled = true;
    channel.onMessage.subscribe(accept);
  });

  return {
    pc,
    /**
     * @param {string} sdp
     * @param {(candidate: { candidate: string, sdpMid?: string, sdpMLineIndex?: number }) => void} onCandidate
     */
    async acceptOffer(sdp, onCandidate) {
      pc.onIceCandidate.subscribe((candidate) => {
        if (!candidate?.candidate) return;
        const json = candidate.toJSON();
        onCandidate?.({
          candidate: json.candidate,
          sdpMid: json.sdpMid,
          sdpMLineIndex: json.sdpMLineIndex,
        });
      });
      await pc.setRemoteDescription({ type: "offer", sdp });
      const video = pc.getTransceivers().find((transceiver) => transceiver.kind === "video");
      if (!video) throw new Error("Desktop offer has no video m-line");
      video.setDirection("sendonly");
      await video.sender.replaceTrack(track);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      payloadType = video.sender.codec?.payloadType || payloadType;
      return answer.sdp;
    },

    async addIceCandidate(candidate) {
      if (!candidate?.candidate || closed) return;
      await pc.addIceCandidate({
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid ?? "0",
        sdpMLineIndex: candidate.sdpMLineIndex ?? 0,
      });
    },

    /** @param {Buffer[]} nals */
    pushAccessUnit(nals) {
      if (closed || !nals?.length) return;
      const packetized = packetizeAccessUnit(nals, {
        payloadType,
        sequenceNumber: sequence,
        timestamp,
        ssrc,
      });
      sequence = packetized.nextSequence;
      timestamp = (timestamp + Math.round(90000 / fps)) >>> 0;
      for (const packet of packetized.packets) track.writeRtp(packet);
    },

    setFps(next) {
      if (next > 0) fps = next;
    },

    async close() {
      if (closed) return;
      closed = true;
      inputEnabled = false;
      try { track.stop(); } catch { /* ignore */ }
      try { await pc.close(); } catch { /* ignore */ }
    },
  };
}
