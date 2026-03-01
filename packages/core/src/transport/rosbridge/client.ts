import WebSocket from "ws";
import type {
  RosbridgeClientOptions,
  ConnectionStatus,
  RosbridgeMessage,
  MessageHandler,
  ConnectionHandler,
} from "./types.js";

/** Pending request/response tracker for service calls and action goals. */
export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * WebSocket client for the rosbridge protocol.
 * Handles connection lifecycle, reconnection, and message routing.
 */
export class RosbridgeClient {
  private ws: WebSocket | null = null;
  private options: Required<RosbridgeClientOptions>;
  private status: ConnectionStatus = "disconnected";
  private messageHandlers = new Map<string, Set<MessageHandler>>();
  private connectionHandlers = new Set<ConnectionHandler>();
  private pendingRequests = new Map<string, PendingRequest>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private idCounter = 0;

  constructor(options: RosbridgeClientOptions) {
    this.options = {
      url: options.url,
      reconnect: options.reconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
    };
  }

  /** Connect to the rosbridge WebSocket server. */
  async connect(): Promise<void> {
    if (this.status === "connected") return;

    this.intentionalClose = false;
    this.setStatus("connecting");

    return new Promise<void>((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        reject(new Error(`Connection to ${this.options.url} timed out`));
      }, 10_000);

      try {
        this.ws = new WebSocket(this.options.url);
      } catch (err) {
        clearTimeout(connectTimeout);
        this.setStatus("disconnected");
        reject(err);
        return;
      }

      this.ws.onopen = () => {
        clearTimeout(connectTimeout);
        this.reconnectAttempts = 0;
        this.setStatus("connected");
        resolve();
      };

      this.ws.onmessage = (event) => {
        const data = typeof event.data === "string"
          ? event.data
          : event.data.toString();
        this.handleMessage(data);
      };

      this.ws.onerror = (_event) => {
        clearTimeout(connectTimeout);
        if (this.status === "connecting") {
          this.ws = null;
          this.setStatus("disconnected");
          reject(new Error(`WebSocket error connecting to ${this.options.url}`));
        }
      };

      this.ws.onclose = () => {
        clearTimeout(connectTimeout);
        this.ws = null;

        if (this.status === "connecting") {
          this.setStatus("disconnected");
          reject(new Error(`WebSocket closed during connection to ${this.options.url}`));
          return;
        }

        this.setStatus("disconnected");
        this.rejectAllPending(new Error("WebSocket connection closed"));

        if (!this.intentionalClose && this.options.reconnect) {
          this.attemptReconnect();
        }
      };
    });
  }

  /** Disconnect from the rosbridge server. */
  async disconnect(): Promise<void> {
    this.intentionalClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.rejectAllPending(new Error("Client disconnected"));

    if (this.ws) {
      const ws = this.ws;
      this.ws = null;

      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        await new Promise<void>((resolve) => {
          ws.onclose = () => resolve();
          ws.close();
          // Force-resolve after 2s if server doesn't ack the close
          setTimeout(resolve, 2000);
        });
      }
    }

    this.setStatus("disconnected");
  }

  /** Send a rosbridge protocol message. */
  send(message: RosbridgeMessage & Record<string, unknown>): void {
    if (!this.ws || this.status !== "connected") {
      throw new Error("Not connected to rosbridge server");
    }
    this.ws.send(JSON.stringify(message));
  }

  /** Generate a unique message ID. */
  nextId(prefix = "agenticros"): string {
    return `${prefix}_${++this.idCounter}`;
  }

  /** Subscribe to messages on a specific topic. */
  onMessage(topic: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(topic)) {
      this.messageHandlers.set(topic, new Set());
    }
    this.messageHandlers.get(topic)!.add(handler);
    return () => {
      this.messageHandlers.get(topic)?.delete(handler);
    };
  }

  /** Register a connection status change handler. */
  onConnection(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  /** Get current connection status. */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Register a pending request that will be resolved when a response
   * with the matching ID arrives (service_response or action_result).
   */
  registerPending(id: string, resolve: (value: unknown) => void, reject: (reason: Error) => void, timeoutMs = 30_000): void {
    const timer = setTimeout(() => {
      this.pendingRequests.delete(id);
      reject(new Error(`Request ${id} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    this.pendingRequests.set(id, { resolve, reject, timer });
  }

  /** Resolve a pending request by ID and clean up. */
  resolvePending(id: string, result: unknown): void {
    const pending = this.pendingRequests.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRequests.delete(id);
      pending.resolve(result);
    }
  }

  /** Reject a pending request by ID and clean up. */
  rejectPending(id: string, error: Error): void {
    const pending = this.pendingRequests.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRequests.delete(id);
      pending.reject(error);
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    for (const handler of this.connectionHandlers) {
      handler(status);
    }
  }

  /** Route an incoming rosbridge message to the appropriate handler. */
  private handleMessage(data: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return; // Ignore malformed messages
    }

    const op = msg.op as string | undefined;
    if (!op) return;

    switch (op) {
      case "publish": {
        // Incoming topic message — route to topic subscribers
        const topic = msg.topic as string;
        const payload = msg.msg as Record<string, unknown>;
        const handlers = this.messageHandlers.get(topic);
        if (handlers) {
          for (const handler of handlers) {
            handler(payload);
          }
        }
        break;
      }

      case "service_response": {
        // Response to a call_service request
        const id = msg.id as string | undefined;
        if (id) {
          this.resolvePending(id, msg);
        }
        break;
      }

      case "action_result": {
        // Final result of an action goal
        const id = msg.id as string | undefined;
        if (id) {
          this.resolvePending(id, msg);
        }
        break;
      }

      case "action_feedback": {
        // Intermediate feedback for an action goal — route to feedback handlers
        const id = msg.id as string | undefined;
        if (id) {
          const handlers = this.messageHandlers.get(`__action_feedback__${id}`);
          if (handlers) {
            for (const handler of handlers) {
              handler(msg as Record<string, unknown>);
            }
          }
        }
        break;
      }
    }
  }

  /** Attempt to reconnect with exponential backoff. */
  private attemptReconnect(): void {
    if (this.intentionalClose) return;
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) return;

    this.reconnectAttempts++;

    // Exponential backoff: interval * 2^(attempt-1), capped at 30s
    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30_000,
    );

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.intentionalClose) return;

      try {
        await this.connect();
        // Re-subscribe to all active topics on successful reconnect
        for (const topic of this.messageHandlers.keys()) {
          if (topic.startsWith("__action_feedback__")) continue;
          this.send({
            op: "subscribe",
            id: this.nextId("resub"),
            topic,
          });
        }
      } catch {
        // connect() failed — onclose will trigger another attemptReconnect
      }
    }, delay);
  }

  /** Reject all pending requests (used on disconnect/close). */
  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}
