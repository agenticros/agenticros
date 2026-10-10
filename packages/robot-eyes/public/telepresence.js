/**
 * Answerer for the operator telepresence call.
 *
 * Signaling arrives on the local Eyes WebSocket (relayed from ARC by comms.js).
 * A live remote video track covers the eyes canvas. Voice-only leaves the eyes
 * up and shows "On a call". Hangup restores the face. The robot microphone is
 * sent back on the audio transceiver from the operator's offer.
 */

const remoteVideo = document.getElementById("remote-video");
const remoteAudio = document.getElementById("remote-audio");

/** @type {WebSocket | null} */
let ws = null;
/** @type {RTCPeerConnection | null} */
let pc = null;
/** @type {MediaStream | null} */
let micStream = null;
let operatorVideo = false;
let wantVideo = false;
/** @type {MediaStreamTrack | null} */
let remoteVideoTrack = null;
/** @type {RTCIceCandidateInit[]} */
let pendingCandidates = [];

function normalizeIceServers(list) {
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

function updateUi() {
  const videoLive =
    wantVideo &&
    remoteVideoTrack &&
    remoteVideoTrack.readyState === "live" &&
    !remoteVideoTrack.muted &&
    remoteVideo?.srcObject;
  operatorVideo = Boolean(videoLive);
  document.body.classList.toggle("telepresence-video", operatorVideo);
  document.body.classList.toggle("telepresence-call", Boolean(pc) && !operatorVideo);
}

function send(payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function stopMic() {
  if (!micStream) return;
  for (const track of micStream.getTracks()) track.stop();
  micStream = null;
}

function closePeer() {
  const current = pc;
  pc = null;
  operatorVideo = false;
  wantVideo = false;
  remoteVideoTrack = null;
  if (current) {
    current.onconnectionstatechange = null;
    try {
      current.close();
    } catch {
      // already closed
    }
  }
  stopMic();
  if (remoteVideo) remoteVideo.srcObject = null;
  if (remoteAudio) remoteAudio.srcObject = null;
  updateUi();
}

function hangup() {
  pendingCandidates = [];
  closePeer();
  send({ type: "call", active: false });
}

function attachRemoteTrack(event) {
  const track = event.track;
  const stream = event.streams?.[0] || new MediaStream([track]);
  if (track.kind === "audio" && remoteAudio) {
    remoteAudio.srcObject = stream;
    remoteAudio.play?.().catch(() => {});
    return;
  }
  if (track.kind !== "video" || !remoteVideo) return;
  remoteVideoTrack = track;
  remoteVideo.srcObject = stream;
  const refresh = () => updateUi();
  track.addEventListener("mute", refresh);
  track.addEventListener("unmute", refresh);
  track.addEventListener("ended", () => {
    if (remoteVideoTrack === track) remoteVideoTrack = null;
    updateUi();
  });
  refresh();
}

async function acceptOffer(msg) {
  const earlyCandidates = pendingCandidates;
  pendingCandidates = [];
  closePeer();
  pendingCandidates = earlyCandidates;
  const iceServers = normalizeIceServers(msg.iceServers);
  pc = new RTCPeerConnection({ iceServers });
  wantVideo = Boolean(msg.video);
  updateUi();

  pc.ontrack = (event) => attachRemoteTrack(event);
  pc.onicecandidate = (event) => {
    if (!event.candidate) return;
    send({
      type: "telepresence",
      signal: "candidate",
      candidate: event.candidate.candidate,
      sdpMid: event.candidate.sdpMid,
      sdpMLineIndex: event.candidate.sdpMLineIndex,
    });
  };
  pc.onconnectionstatechange = () => {
    if (!pc) return;
    if (pc.connectionState === "failed" || pc.connectionState === "closed") {
      hangup();
    }
  };

  await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
  for (const candidate of pendingCandidates) {
    try {
      await pc.addIceCandidate(candidate);
    } catch {
      // ignore a stale candidate
    }
  }
  pendingCandidates = [];

  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    const mic = micStream.getAudioTracks()[0];
    const audioTransceiver = pc
      .getTransceivers()
      .find((t) => t.receiver?.track?.kind === "audio" || t.sender?.track?.kind === "audio");
    if (mic && audioTransceiver) {
      await audioTransceiver.sender.replaceTrack(mic);
    } else if (mic) {
      pc.addTrack(mic, micStream);
    }
  } catch (err) {
    console.warn("Robot microphone unavailable:", err);
  }

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  send({ type: "telepresence", signal: "answer", sdp: answer.sdp });
  send({ type: "call", active: true });
  updateUi();
}

async function onSignal(msg) {
  const signal = String(msg.signal || "").toLowerCase();
  if (signal === "offer" && msg.sdp) {
    try {
      await acceptOffer(msg);
    } catch (err) {
      console.warn("Telepresence offer failed:", err);
      hangup();
    }
    return;
  }
  if (signal === "candidate" && msg.candidate) {
    const candidate = {
      candidate: msg.candidate,
      sdpMid: msg.sdpMid ?? "0",
      sdpMLineIndex: msg.sdpMLineIndex ?? 0,
    };
    if (!pc || !pc.remoteDescription) {
      pendingCandidates.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(candidate);
    } catch {
      // ignore
    }
    return;
  }
  if (signal === "media") {
    if (msg.video === false) wantVideo = false;
    else if (msg.video === true) wantVideo = true;
    updateUi();
    return;
  }
  if (signal === "end") {
    // Don't echo call:false through hangup's send after the socket may be
    // the one that just told us to stop — hangup does send it, which is fine.
    hangup();
  }
}

function connectWs() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${proto}://${location.host}`);
  ws = socket;

  socket.addEventListener("message", (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (msg.type !== "telepresence") return;
    void onSignal(msg);
  });

  socket.addEventListener("close", () => {
    if (ws === socket) ws = null;
    if (pc) hangup();
    setTimeout(connectWs, 1000);
  });

  socket.addEventListener("error", () => {
    socket.close();
  });
}

connectWs();
