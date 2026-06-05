import type { RosbridgeClient } from "./client.js";
import type { MessageHandler } from "./types.js";

/**
 * Helper for publishing messages to a ROS2 topic.
 */
export class TopicPublisher {
  constructor(
    private client: RosbridgeClient,
    private topic: string,
    private type: string,
  ) {}

  /** Publish a message to the topic. */
  publish(msg: Record<string, unknown>): void {
    this.client.send({
      op: "publish",
      topic: this.topic,
      type: this.type,
      msg,
    });
  }
}

/**
 * Helper for subscribing to messages from a ROS2 topic.
 */
export class TopicSubscriber {
  private unsubscribeFromClient: (() => void) | null = null;

  constructor(
    private client: RosbridgeClient,
    private topic: string,
    private type?: string,
  ) {}

  /** Subscribe to the topic and receive messages via the handler. */
  subscribe(handler: MessageHandler): void {
    this.unsubscribeFromClient = this.client.onMessage(this.topic, handler);
    this.client.send({
      op: "subscribe",
      id: this.client.nextId("subscribe"),
      topic: this.topic,
      type: this.type,
    });
  }

  /** Unsubscribe from the topic. */
  unsubscribe(): void {
    if (this.unsubscribeFromClient) {
      this.unsubscribeFromClient();
      this.unsubscribeFromClient = null;
    }
    this.client.send({
      op: "unsubscribe",
      id: this.client.nextId("unsubscribe"),
      topic: this.topic,
    });
  }
}
