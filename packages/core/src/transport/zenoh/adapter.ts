import type { RosTransport } from "../transport.js";
import type {
  ConnectionStatus,
  ConnectionHandler,
  Subscription,
  PublishOptions,
  SubscribeOptions,
  ServiceCallOptions,
  ServiceCallResult,
  ActionGoalOptions,
  ActionResult,
  TopicInfo,
  ServiceInfo,
  ActionInfo,
  MessageHandler,
} from "../types.js";
import { Session, Config, type Sample } from "@eclipse-zenoh/zenoh-ts";
import { rosTopicToZenohKey, zenohKeyToRosTopic, type ZenohKeyFormat } from "./keys.js";
import { encodeCdr, decodeCdr, isCdrTypeSupported } from "./cdr.js";

export interface ZenohAdapterConfig {
  routerEndpoint: string;
  domainId?: number;
  /** "ros2dds" for zenoh-bridge-ros2dds, "rmw_zenoh" for ROS2 with Zenoh RMW */
  keyFormat?: ZenohKeyFormat;
}

/**
 * Zenoh transport adapter (Mode D).
 * Connects to a Zenoh router via zenoh-ts (WebSocket to zenoh-plugin-remote-api).
 * Uses rmw_zenoh key mapping and CDR payloads for ROS 2 compatibility.
 */
export class ZenohTransport implements RosTransport {
  private config: ZenohAdapterConfig;
  private session: Session | null = null;
  private status: ConnectionStatus = "disconnected";
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private subscribers: Map<string, { undeclare: () => Promise<void> }> = new Map();

  constructor(config: ZenohAdapterConfig) {
    this.config = {
      domainId: 0,
      keyFormat: "ros2dds",
      ...config,
    };
    this.publish = this.publish.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.subscribeAsync = this.subscribeAsync.bind(this);
    this.getStatus = this.getStatus.bind(this);
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
  }

  private setStatus(s: ConnectionStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.connectionHandlers.forEach((h) => h(s));
  }

  private domainId(): number {
    return this.config.domainId ?? 0;
  }

  private keyFormat(): ZenohKeyFormat {
    return this.config.keyFormat ?? "ros2dds";
  }

  private key(topic: string): string {
    return rosTopicToZenohKey(topic, this.domainId(), this.keyFormat());
  }

  async connect(): Promise<void> {
    if (this.session && !this.session.isClosed()) return;
    this.setStatus("connecting");
    const locator = (this.config.routerEndpoint ?? "").trim();
    if (!locator) {
      this.setStatus("disconnected");
      throw new Error(
        "Zenoh router endpoint is empty. Set zenoh.routerEndpoint in config (e.g. ws://localhost:10000). See docs/zenoh-agenticros.md.",
      );
    }
    if (!/^wss?:\/\//i.test(locator)) {
      this.setStatus("disconnected");
      throw new Error(
        `Zenoh router endpoint must be a WebSocket URL (ws:// or wss://). Got: "${locator}". Use e.g. ws://localhost:10000 (zenoh-plugin-remote-api).`,
      );
    }
    try {
      const config = new Config(locator);
      this.session = await Session.open(config);
      this.setStatus("connected");
      console.warn(`[AgenticROS] Zenoh connected to ${locator}`);
    } catch (e) {
      this.setStatus("disconnected");
      const msg = e instanceof Error ? e.message : String(e);
      if (/invalid url|invalid uri/i.test(msg)) {
        throw new Error(
          `Zenoh endpoint "${locator}" is not a valid URL. Use a WebSocket URL, e.g. ws://localhost:10000.`,
        );
      }
      console.error(`[AgenticROS] Zenoh connection failed to ${locator}:`, e);
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    for (const [, sub] of this.subscribers) {
      await sub.undeclare();
    }
    this.subscribers.clear();
    if (this.session) {
      await this.session.close();
      this.session = null;
    }
    this.setStatus("disconnected");
  }

  getStatus(): ConnectionStatus {
    return this.session && !this.session.isClosed() ? "connected" : this.status;
  }

  onConnection(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  publish(options: PublishOptions): Promise<void> {
    if (this == null) throw new Error("Zenoh transport not connected");
    const s = this.session;
    if (!s || s.isClosed()) {
      throw new Error("Zenoh transport not connected");
    }
    // Normalize cmd_vel: /<uuid>/cmd_vel → /robot<uuid-no-dashes>/cmd_vel so bridge/subscribers see the robot-prefixed topic (robot often expects UUID without dashes)
    const topicRaw = (options.topic ?? "").trim();
    const cmdVelMatch = topicRaw.match(/^\/([^/]+)\/cmd_vel$/i);
    const segment = cmdVelMatch?.[1] ?? "";
    const topic =
      cmdVelMatch && !segment.toLowerCase().startsWith("robot")
        ? `/robot${segment.replace(/-/g, "")}/cmd_vel`
        : topicRaw;
    const effectiveTopic = topic || (options.topic ?? "").trim();
    const key = this.key(effectiveTopic);
    if (!isCdrTypeSupported(options.type)) {
      throw new Error(
        `Zenoh CDR publish not implemented for type: ${options.type}. Supported: geometry_msgs/msg/Twist (Image/CompressedImage are decode-only).`,
      );
    }
    if (!key) {
      throw new Error(`Zenoh publish: topic is empty (options.topic=${JSON.stringify(options.topic)})`);
    }
    const payload = encodeCdr(options.type, options.msg);
    console.warn(`[AgenticROS] Zenoh publish: key=${key} topic=${effectiveTopic}`);
    return s.put(key, payload).catch((err: unknown) => {
      console.error("[AgenticROS] Zenoh put failed:", key, err);
      throw new Error(`Zenoh put failed: ${err}`);
    });
  }

  subscribe(options: SubscribeOptions, handler: MessageHandler): Subscription {
    if (this == null) throw new Error("Zenoh transport not connected");
    const s = this.session;
    if (!s || s.isClosed()) {
      throw new Error("Zenoh transport not connected");
    }
    const key = this.key(options.topic);
    const type = options.type ?? "geometry_msgs/msg/Twist";

    if (!isCdrTypeSupported(type)) {
      throw new Error(
        `Zenoh CDR subscribe not implemented for type: ${type}. Supported: geometry_msgs/msg/Twist, sensor_msgs/msg/Image, sensor_msgs/msg/CompressedImage`,
      );
    }

    const subKey = `${options.topic}\0${type}`;
    const ref: { undeclare: () => Promise<void> } = { undeclare: async () => {} };
    let decodeErrorLogged = false;

    s.declareSubscriber(key, {
      handler: (sample: Sample) => {
        const payload = sample.payload().toBytes();
        try {
          const msg = decodeCdr(type, payload);
          handler(msg);
        } catch (e) {
          if (!decodeErrorLogged) {
            decodeErrorLogged = true;
            console.warn("[AgenticROS] Zenoh CDR decode failed for", options.topic, type, e instanceof Error ? e.message : String(e));
          }
        }
      },
    }).then((sub) => {
      ref.undeclare = () => sub.undeclare();
      this.subscribers.set(subKey, ref);
    });

    return {
      unsubscribe: () => {
        const entry = this.subscribers.get(subKey);
        if (entry) {
          entry.undeclare().catch(() => {});
          this.subscribers.delete(subKey);
        }
      },
    };
  }

  async subscribeAsync(options: SubscribeOptions, handler: MessageHandler): Promise<Subscription> {
    if (this == null) throw new Error("Zenoh transport not connected");
    const s = this.session;
    if (!s || s.isClosed()) {
      throw new Error("Zenoh transport not connected");
    }
    const key = this.key(options.topic);
    const type = options.type ?? "geometry_msgs/msg/Twist";

    if (!isCdrTypeSupported(type)) {
      throw new Error(
        `Zenoh CDR subscribe not implemented for type: ${type}. Supported: geometry_msgs/msg/Twist, sensor_msgs/msg/Image, sensor_msgs/msg/CompressedImage`,
      );
    }

    const subKey = `${options.topic}\0${type}`;
    let decodeErrorLogged = false;
    const sub = await s.declareSubscriber(key, {
      handler: (sample: Sample) => {
        const payload = sample.payload().toBytes();
        try {
          const msg = decodeCdr(type, payload);
          handler(msg);
        } catch (e) {
          if (!decodeErrorLogged) {
            decodeErrorLogged = true;
            console.warn("[AgenticROS] Zenoh CDR decode failed for", options.topic, type, e instanceof Error ? e.message : String(e));
          }
        }
      },
    });
    this.subscribers.set(subKey, { undeclare: () => sub.undeclare() });

    return {
      unsubscribe: () => {
        const entry = this.subscribers.get(subKey);
        if (entry) {
          entry.undeclare().catch(() => {});
          this.subscribers.delete(subKey);
        }
      },
    };
  }

  async callService(_options: ServiceCallOptions): Promise<ServiceCallResult> {
    return {
      result: false,
      values: { error: "Zenoh transport: service call not implemented" },
    };
  }

  async sendActionGoal(_options: ActionGoalOptions): Promise<ActionResult> {
    return {
      result: false,
      values: { error: "Zenoh transport: action goal not implemented" },
    };
  }

  async cancelActionGoal(_action: string): Promise<void> {
    // no-op
  }

  async listTopics(): Promise<TopicInfo[]> {
    const s = this.session;
    if (!s || s.isClosed()) {
      console.warn("[AgenticROS] Zenoh listTopics: not connected");
      return [];
    }
    const keys = new Set<string>();
    const sub = await s.declareSubscriber("**", {
      handler: (sample: Sample) => {
        keys.add(sample.keyexpr().toString());
      },
    });
    // Short wait so we finish before remote-api/MCP timeouts (~1s is enough for active publishers)
    await new Promise((r) => setTimeout(r, 1000));
    await sub.undeclare();
    const format = this.keyFormat();
    const topics = Array.from(keys).map((key) => ({
      name: zenohKeyToRosTopic(key, format),
      type: "unknown",
    }));
    if (topics.length > 0) {
      console.warn(`[AgenticROS] Zenoh listTopics: found ${topics.length} keys`);
    }
    return topics;
  }

  async listServices(): Promise<ServiceInfo[]> {
    return [];
  }

  async listActions(): Promise<ActionInfo[]> {
    return [];
  }
}
