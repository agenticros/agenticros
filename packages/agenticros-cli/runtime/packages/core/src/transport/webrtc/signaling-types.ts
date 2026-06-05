/**
 * Type definitions for the WebRTC signaling server protocol.
 *
 * These match the message format used by the webrtc-py signaling server
 * (see mock_client.py and mock_robot.py for reference implementations).
 */

// --- REST API ---

export interface ConnectRequest {
  user_id: string;
  robot_id: string;
  robot_key: string;
}

export interface ConnectResponse {
  session: { session_id: string };
  room_id: string;
}

export interface DisconnectResponse {
  status: string;
}

export interface RobotInfo {
  robot_id: string;
  status: string;
  capabilities?: string[];
}

export type DiscoverResponse = RobotInfo[];

// --- WebSocket signaling messages ---

/** Base shape for all signaling messages. */
export interface SignalingMessage {
  type: string;
  [key: string]: unknown;
}

// Client → Server

export interface JoinRoomMessage extends SignalingMessage {
  type: "join_room";
  room_id: string;
  peer_id: string;
  peer_type: "frontend" | "robot";
  session_id: string;
}

export interface RobotConnectMessage extends SignalingMessage {
  type: "robot_connect";
  robot_token: string;
  robot_id: string;
  capabilities?: string[];
}

export interface SessionAcceptedMessage extends SignalingMessage {
  type: "session_accepted";
  session_id: string;
  robot_id: string;
}

export interface OfferMessage extends SignalingMessage {
  type: "offer";
  data: { type: string; sdp: string };
  from_peer_id?: string;
  target_peer_id?: string;
}

export interface AnswerMessage extends SignalingMessage {
  type: "answer";
  data: { type: string; sdp: string };
  room_id?: string;
  peer_id?: string;
  target_peer_id?: string;
}

export interface IceCandidateMessage extends SignalingMessage {
  type: "ice_candidate";
  data: {
    candidate: string;
    sdpMid: string | null;
    sdpMLineIndex: number | null;
  };
  target_peer_id?: string;
}

export interface HeartbeatMessage extends SignalingMessage {
  type: "heartbeat";
  timestamp: number;
}

// Server → Client

export interface PeerJoinedMessage extends SignalingMessage {
  type: "peer_joined";
  peer_id: string;
  peer_type: "frontend" | "robot";
}

export interface PeerLeftMessage extends SignalingMessage {
  type: "peer_left";
  peer_id: string;
}

export interface SessionInvitationMessage extends SignalingMessage {
  type: "session_invitation";
  session_id: string;
  room_id: string;
  robot_key: string;
  user_id: string;
}

export interface SessionEndedMessage extends SignalingMessage {
  type: "session_ended";
  session_id: string;
  reason?: string;
}

export interface HeartbeatRequestMessage extends SignalingMessage {
  type: "heartbeat_request";
  timestamp: number;
}

export interface ErrorMessage extends SignalingMessage {
  type: "error";
  message: string;
  code?: string;
}
