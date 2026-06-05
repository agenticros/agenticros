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
import { Session, Config, Locality, Subscriber, type Sample } from "@eclipse-zenoh/zenoh-ts";
import { rosTopicToZenohKey, zenohKeyToRosTopic, type ZenohKeyFormat } from "./keys.js";
import { encodeCdr, decodeCdr, isCdrTypeSupported } from "./cdr.js";

export interface ZenohAdapterConfig {
  routerEndpoint: string;
  domainId?: number;
  /** "ros2dds" for zenoh-bridge-ros2dds, "rmw_zenoh" for ROS2 with Zenoh RMW */
  keyFormat?: ZenohKeyFormat;
  /** When ros2dds bridge uses a non-"/" namespace, set to the same value (e.g. "/bot1"). */
  bridgeNamespace?: string;
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
  /** Serialize Session.open/close so two connect()s never open parallel WebSockets to remote-api. */
  private sessionOpQueue: Promise<void> = Promise.resolve();
  /** Serialize listTopics so overlapping tool calls do not undeclare each other's subscribers. */
  private listTopicsOpQueue: Promise<TopicInfo[]> = Promise.resolve([]);

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
    return rosTopicToZenohKey(topic, this.domainId(), this.keyFormat(), this.config.bridgeNamespace);
  }

  private enqueueSessionOp(fn: () => Promise<void>): Promise<void> {
    const next = this.sessionOpQueue.then(fn, fn);
    this.sessionOpQueue = next.catch(() => {});
    return next;
  }

  async connect(): Promise<void> {
    return this.enqueueSessionOp(async () => {
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
    });
  }

  async disconnect(): Promise<void> {
    return this.enqueueSessionOp(async () => {
      for (const [, sub] of this.subscribers) {
        await sub.undeclare();
      }
      this.subscribers.clear();
      if (this.session) {
        await this.session.close();
        this.session = null;
      }
      this.setStatus("disconnected");
    });
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
      allowedOrigin: Locality.ANY,
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
      allowedOrigin: Locality.ANY,
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
    const run = async (): Promise<TopicInfo[]> => {
      const s = this.session;
      if (!s || s.isClosed()) {
        console.warn("[AgenticROS] Zenoh listTopics: not connected");
        return [];
      }
      const keys = new Set<string>();
      const handler = (sample: Sample) => {
        keys.add(sample.keyexpr().toString());
      };
      // Canon expressions only (`**/*` forbidden → use `*/**`). Do not use bare `**` (whole keyspace).
      // `*/**` does NOT match single-chunk keys (e.g. zenoh key `cmd_vel` from ROS `/cmd_vel`), so include `*`.
      const patterns = ["*/**", "*", "camera/**", "**/camera/**"];
      const subs: Subscriber[] = [];
      for (const keyexpr of patterns) {
        try {
          subs.push(await s.declareSubscriber(keyexpr, { handler, allowedOrigin: Locality.ANY }));
        } catch (e) {
          console.warn(
            "[AgenticROS] Zenoh listTopics: declareSubscriber failed for",
            keyexpr,
            e instanceof Error ? e.message : String(e),
          );
        }
      }
      if (subs.length === 0) {
        console.warn("[AgenticROS] Zenoh listTopics: no subscribers declared (check key expressions)");
        return [];
      }
      const rawMs = Number.parseInt(process.env.AGENTICROS_ZENOH_LIST_TOPICS_MS ?? "", 10);
      const sampleMs = Number.isFinite(rawMs) ? Math.min(60_000, Math.max(1000, rawMs)) : 6500;
      await new Promise((r) => setTimeout(r, sampleMs));
      await Promise.all(subs.map((sub) => sub.undeclare()));
      const format = this.keyFormat();
      const topics = Array.from(keys)
        .filter((key) => !key.startsWith("@"))
        .map((key) => ({
          name: zenohKeyToRosTopic(key, format),
          type: "unknown",
        }));
      if (topics.length > 0) {
        console.warn(`[AgenticROS] Zenoh listTopics: found ${topics.length} keys (sampled ${sampleMs}ms)`);
      } else {
        const ep = (this.config.routerEndpoint ?? "").trim() || "(not configured)";
        console.warn(
          "[AgenticROS] Zenoh listTopics: no keys in sampling window — " +
            `waited ${sampleMs}ms on ${ep}. ` +
            "If `zenoh subscribe` on another host shows traffic, ensure it uses the **same Zenoh router** as this session: " +
            "OpenClaw uses **WebSocket to zenoh-plugin-remote-api** (e.g. ws://127.0.0.1:10000), not raw TCP to the robot. " +
            "A CLI client to tcp/ROBOT_IP:7447 sees the robot's local router; data only appears here if the robot bridge peers to the Mac router you connected to. " +
            "`subscribe -k '**'` also prints **binary payloads** (garbled text), not topic names — keys are short path-like strings when Zenoh prints them separately. " +
            "Optional: set AGENTICROS_ZENOH_LIST_TOPICS_MS (ms) to sample longer for low-rate topics.",
        );
      }
      return topics;
    };

    const next = this.listTopicsOpQueue.then(run, run);
    this.listTopicsOpQueue = next.catch(() => []);
    return next;
  }

  async listServices(): Promise<ServiceInfo[]> {
    return [];
  }

  async listActions(): Promise<ActionInfo[]> {
    return [];
  }
}
