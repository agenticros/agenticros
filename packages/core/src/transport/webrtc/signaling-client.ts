import WebSocket from "ws";
import type {
  ConnectRequest,
  ConnectResponse,
  DisconnectResponse,
  DiscoverResponse,
  SignalingMessage,
  JoinRoomMessage,
  AnswerMessage,
  IceCandidateMessage,
  HeartbeatMessage,
} from "./signaling-types.js";

export type SignalingMessageHandler = (msg: SignalingMessage) => void;

/**
 * Client for the WebRTC signaling server.
 *
 * Encapsulates REST API calls (discover, connect, disconnect) and
 * WebSocket lifecycle (connect, send, message routing, heartbeat).
 */
export class SignalingClient {
  private ws: WebSocket | null = null;
  private apiUrl: string;
  private signalingUrl: string;
  private messageHandler: SignalingMessageHandler | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(apiUrl: string, signalingUrl: string) {
    // Normalize: strip trailing slashes
    this.apiUrl = apiUrl.replace(/\/+$/, "");
    this.signalingUrl = signalingUrl.replace(/\/+$/, "");
  }

  // --- REST API ---

  async discoverRobots(): Promise<DiscoverResponse> {
    const res = await fetch(`${this.apiUrl}/api/robots/`);
    if (!res.ok) {
      throw new Error(`Discovery failed: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<DiscoverResponse>;
  }

  async requestConnection(robotId: string, request: ConnectRequest): Promise<ConnectResponse> {
    const res = await fetch(`${this.apiUrl}/api/robots/${robotId}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Connection request failed: ${res.status} — ${body}`);
    }
    return res.json() as Promise<ConnectResponse>;
  }

  async requestDisconnect(robotId: string): Promise<DisconnectResponse> {
    const res = await fetch(`${this.apiUrl}/api/robots/${robotId}/disconnect`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`Disconnect request failed: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<DisconnectResponse>;
  }

  // --- WebSocket ---

  /** Connect to the signaling WebSocket server. */
  async connectWs(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const wsUrl = `${this.signalingUrl}/ws`;
      const timeout = setTimeout(() => {
        reject(new Error(`Signaling WebSocket connection to ${wsUrl} timed out`));
      }, 10_000);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.startHeartbeat();
        resolve();
      };

      this.ws.onmessage = (event) => {
        const data = typeof event.data === "string" ? event.data : event.data.toString();
        let msg: SignalingMessage;
        try {
          msg = JSON.parse(data) as SignalingMessage;
        } catch {
          return;
        }

        // Auto-respond to heartbeat requests
        if (msg.type === "heartbeat_request") {
          this.send({ type: "heartbeat", timestamp: Date.now() } satisfies HeartbeatMessage);
          return;
        }

        if (this.messageHandler) {
          this.messageHandler(msg);
        }
      };

      this.ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Signaling WebSocket error connecting to ${wsUrl}`));
      };

      this.ws.onclose = () => {
        clearTimeout(timeout);
        this.stopHeartbeat();
        this.ws = null;
      };
    });
  }

  /** Set the handler for incoming signaling messages. */
  onMessage(handler: SignalingMessageHandler): void {
    this.messageHandler = handler;
  }

  /** Send a signaling message over WebSocket. */
  send(message: SignalingMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Signaling WebSocket is not connected");
    }
    this.ws.send(JSON.stringify(message));
  }

  /** Send join_room to enter the session room. */
  joinRoom(roomId: string, peerId: string, peerType: "frontend" | "robot", sessionId: string): void {
    this.send({
      type: "join_room",
      room_id: roomId,
      peer_id: peerId,
      peer_type: peerType,
      session_id: sessionId,
    } satisfies JoinRoomMessage);
  }

  /** Send an SDP answer back to the peer. */
  sendAnswer(sdp: string, roomId: string, peerId: string, targetPeerId?: string): void {
    this.send({
      type: "answer",
      data: { type: "answer", sdp },
      room_id: roomId,
      peer_id: peerId,
      target_peer_id: targetPeerId,
    } satisfies AnswerMessage);
  }

  /** Send an ICE candidate to the peer. */
  sendIceCandidate(candidate: string, sdpMid: string | null, sdpMLineIndex: number | null, targetPeerId?: string): void {
    this.send({
      type: "ice_candidate",
      data: {
        candidate,
        sdpMid,
        sdpMLineIndex,
      },
      target_peer_id: targetPeerId,
    } satisfies IceCandidateMessage);
  }

  /** Close the signaling WebSocket. */
  close(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** Whether the WebSocket is currently connected. */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: "heartbeat", timestamp: Date.now() } satisfies HeartbeatMessage);
      }
    }, 15_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
