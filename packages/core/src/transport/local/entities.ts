/**
 * Entity cache for rclnodejs publishers, subscribers, and service clients.
 *
 * Lazily creates and caches DDS entities so repeated publishes to the same
 * topic reuse a single publisher, etc. Same pattern as the reference agents'
 * `_pubs`, `_subs`, `_srv_clients` maps.
 */

import type { Subscription } from "../types.js";
import { loadMessageClass, fromRosMessage } from "./conversion.js";

type Node = any;
type MessageHandler = (msg: Record<string, unknown>) => void;

export class EntityCache {
  private publishers = new Map<string, any>();
  private subscriptions = new Map<string, { handle: any; handlers: Set<MessageHandler> }>();
  private serviceClients = new Map<string, any>();

  /**
   * Get or create a cached publisher for the given topic and type.
   */
  getPublisher(node: Node, topic: string, typeStr: string): any {
    const key = `${topic}::${typeStr}`;
    const cached = this.publishers.get(key);
    if (cached) return cached;

    const MessageClass = loadMessageClass(typeStr);
    const publisher = node.createPublisher(MessageClass, topic);
    this.publishers.set(key, publisher);
    return publisher;
  }

  /**
   * Subscribe to a topic. If already subscribed, adds the handler to the
   * existing subscription's handler set. Returns a Subscription handle.
   */
  addSubscription(
    node: Node,
    topic: string,
    typeStr: string,
    handler: MessageHandler,
  ): Subscription {
    const key = `${topic}::${typeStr}`;
    let entry = this.subscriptions.get(key);

    if (!entry) {
      const MessageClass = loadMessageClass(typeStr);
      const handlers = new Set<MessageHandler>();

      const handle = node.createSubscription(
        MessageClass,
        topic,
        (msg: any) => {
          const plain = fromRosMessage(msg);
          for (const h of handlers) {
            h(plain);
          }
        },
      );

      entry = { handle, handlers };
      this.subscriptions.set(key, entry);
    }

    entry.handlers.add(handler);

    return {
      unsubscribe: () => {
        entry!.handlers.delete(handler);
        // If no more handlers, destroy the subscription
        if (entry!.handlers.size === 0) {
          try {
            node.destroySubscription(entry!.handle);
          } catch {
            // Already destroyed
          }
          this.subscriptions.delete(key);
        }
      },
    };
  }

  /**
   * Get or create a cached service client for the given service and type.
   */
  getServiceClient(node: Node, service: string, typeStr: string): any {
    const key = `${service}::${typeStr}`;
    const cached = this.serviceClients.get(key);
    if (cached) return cached;

    const ServiceClass = loadMessageClass(typeStr);
    const client = node.createClient(ServiceClass, service);
    this.serviceClients.set(key, client);
    return client;
  }

  /**
   * Destroy all cached entities. Called during transport shutdown.
   */
  destroyAll(node: Node): void {
    for (const pub of this.publishers.values()) {
      try {
        node.destroyPublisher(pub);
      } catch {
        // Best-effort cleanup
      }
    }
    this.publishers.clear();

    for (const { handle } of this.subscriptions.values()) {
      try {
        node.destroySubscription(handle);
      } catch {
        // Best-effort cleanup
      }
    }
    this.subscriptions.clear();

    for (const client of this.serviceClients.values()) {
      try {
        node.destroyClient(client);
      } catch {
        // Best-effort cleanup
      }
    }
    this.serviceClients.clear();
  }
}
