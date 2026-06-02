import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig, MemoryRecord } from "@agenticros/core";
import type { TopicInfo, ServiceInfo, ActionInfo } from "@agenticros/core";
import { resolveMemoryNamespace } from "@agenticros/core";
import { getTransport } from "../service.js";
import { getLoadedSkillIds } from "../skill-loader.js";
import { getMemory } from "../memory.js";

/** Cached discovery results with TTL. */
interface DiscoveryCache {
  topics: TopicInfo[];
  services: ServiceInfo[];
  actions: ActionInfo[];
  timestamp: number;
}

const CACHE_TTL_MS = 60_000; // 60s
let cache: DiscoveryCache | null = null;

/** Clear the discovery cache so the next agent start re-discovers capabilities. */
export function clearDiscoveryCache(): void {
  cache = null;
}

/**
 * Register the before_agent_start hook to inject robot capabilities
 * into the AI agent's system context.
 */
export function registerRobotContext(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  const robotName = config.robot.name;
  const robotNamespace = config.robot.namespace;

  // Reactive re-discovery: clear cache on transport reconnect
  try {
    const transport = getTransport();
    transport.onConnection((status: string) => {
      if (status === "connected") {
        cache = null; // Force re-discovery on next agent start
        api.logger.info("Transport reconnected — capability cache cleared");
      }
    });
  } catch {
    // Transport not initialized yet — will be set up by the service.
    // The onConnection handler will be registered when the hook fires.
  }

  api.on("before_agent_start", async (_event, _ctx) => {
    const capabilities = await discoverCapabilities(api, robotNamespace);
    const cameraTopicHint =
      (config.robot?.cameraTopic ?? "").trim() || "/camera/camera/color/image_raw/compressed";
    const memorySection = await buildMemorySection(config);
    const context =
      buildRobotContext(config, robotName, robotNamespace, capabilities, cameraTopicHint) +
      memorySection;
    return { prependContext: context };
  });
}

/**
 * Build a "Memory" section that tells the LLM how to use memory tools and
 * what's already stored. Returns "" when memory is disabled or unavailable,
 * so non-memory users see no change in their context.
 */
async function buildMemorySection(config: AgenticROSConfig): Promise<string> {
  if (!config.memory?.enabled) return "";
  const memory = getMemory();
  if (!memory) {
    // Provider isn't ready yet (async init still pending). Skip silently;
    // the section will appear on the next session.
    return "";
  }
  const namespace = resolveMemoryNamespace(config);
  let recent: MemoryRecord[] = [];
  try {
    recent = await memory.recent(namespace, 10);
  } catch {
    recent = [];
  }
  const recentBlock =
    recent.length === 0
      ? "_No memories saved yet for this robot._"
      : recent
          .map((r, i) => `${i + 1}. ${r.content.replace(/\s+/g, " ").trim()}`)
          .join("\n");
  return `\n\n### Memory (cross-session, ${memory.backend} backend)
You have a shared long-term memory store. It is shared across **all** AgenticROS adapters talking to this robot — facts written from Claude Desktop, Claude Code, Gemini CLI, and this OpenClaw chat all live in the same store and surface here.

**Always call \`memory_recall\` BEFORE answering** when the user asks a personal-context question, including:
- "What do I have for X?", "What's my Y?", "Where is the Z?"
- "What did I tell you about ...?", "Do you remember ...?", "What's my preference for ...?"
- Anything that depends on facts the user previously shared about themselves, their robot setup, their home, or their preferences.

**Call \`memory_remember\`** when the user explicitly says "remember that ...", "note that ...", "from now on ...", or shares a durable personal fact (preferences, names, places, routines, robot hardware). Do **not** auto-store conversation transcripts.

**Recently remembered (newest first):**
${recentBlock}

If a question seems answerable from this list, answer directly. If you need more (e.g. semantic match, full search), call \`memory_recall\` with a focused query.`;
}

/**
 * Discover live capabilities from the transport layer, with caching.
 * Falls back to empty lists if discovery fails.
 */
async function discoverCapabilities(
  api: OpenClawPluginApi,
  namespace: string,
): Promise<DiscoveryCache> {
  // Return cached results if still fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache;
  }

  try {
    const transport = getTransport();

    const [topics, services, actions] = await Promise.all([
      transport.listTopics(),
      transport.listServices(),
      transport.listActions(),
    ]);

    // Filter by namespace if configured; always include camera topics (they often live under /camera/, not robot namespace)
    const filterByNs = (name: string) => {
      if (!namespace) return true;
      const normalized = name.replace(/^\/+/, "");
      if (normalized.startsWith(namespace)) return true;
      if (normalized.startsWith("camera/") || normalized.includes("/camera/")) return true;
      return false;
    };

    cache = {
      topics: topics.filter((t: TopicInfo) => filterByNs(t.name)),
      services: services.filter((s: ServiceInfo) => filterByNs(s.name)),
      actions: actions.filter((a: ActionInfo) => filterByNs(a.name)),
      timestamp: Date.now(),
    };

    api.logger.info(
      `Discovered ${cache.topics.length} topics, ${cache.services.length} services, ${cache.actions.length} actions`,
    );

    return cache;
  } catch (err) {
    api.logger.warn(`Capability discovery failed, using defaults: ${err}`);
    return {
      topics: [],
      services: [],
      actions: [],
      timestamp: 0,
    };
  }
}

/**
 * Build the robot context string that gets injected into the agent's system prompt.
 */
function buildRobotContext(
  config: AgenticROSConfig,
  name: string,
  namespace: string,
  capabilities: DiscoveryCache,
  cameraTopicHint: string,
): string {
  const { topics, services, actions } = capabilities;

  // If discovery returned results, use them
  if (topics.length > 0 || services.length > 0 || actions.length > 0) {
    return buildDynamicContext(config, name, namespace, topics, services, actions);
  }

  // Fall back to hardcoded defaults if discovery failed
  return buildFallbackContext(config, name, namespace, cameraTopicHint);
}

function transportMode(config: AgenticROSConfig): "local" | "rosbridge" | "webrtc" | "zenoh" {
  const m = config.transport?.mode;
  if (m === "local" || m === "rosbridge" || m === "webrtc" || m === "zenoh") return m;
  return "rosbridge";
}

/** How AgenticROS reaches ROS 2 — matches plugin transport.mode (injected into the model). */
function buildUserInterfaceBlurb(config: AgenticROSConfig): string {
  const mode = transportMode(config);
  const rosbridgeUrl = (config.rosbridge?.url ?? "ws://localhost:9090").trim() || "ws://localhost:9090";
  const zenohEp = (config.zenoh?.routerEndpoint ?? "ws://localhost:10000").trim() || "ws://localhost:10000";
  const domainId = config.local?.domainId ?? 0;

  let connectionLine: string;
  let pairingLine: string;
  switch (mode) {
    case "local":
      connectionLine = `It connects to ROS 2 on the **same machine** as this gateway using **local DDS** (direct participant via rclnodejs, ROS_DOMAIN_ID **${domainId}** by default). No rosbridge WebSocket and no Zenoh router are used in this mode.`;
      pairingLine = `If the user says "nodes status shows zero" or "how do I pair the robot": explain that the robot stack is reached through **local DDS** on this host. There is **no** OpenClaw device pairing step for ROS. Ensure ROS 2 nodes and OpenClaw share the **same domain ID** and that the AgenticROS transport is connected—\`openclaw nodes status\` counts **OpenClaw mobile/desktop nodes**, not your ROS graph.`;
      break;
    case "zenoh":
      connectionLine = `It connects to ROS 2 through **Zenoh** (zenoh-ts), typically at **${zenohEp}** (WebSocket to zenoh-plugin-remote-api — use \`ws://\`, not raw \`tcp/\` for the plugin).`;
      pairingLine = `If the user says "nodes status shows zero" or "how do I pair the robot": explain that the robot is reached via the **Zenoh router** endpoint above. No OpenClaw node pairing is required for AgenticROS. If the plugin is loaded and Zenoh/your bridge see ROS traffic, the robot is connected—\`openclaw nodes status\` is irrelevant for AgenticROS.`;
      break;
    case "webrtc":
      connectionLine = `It connects to the robot over **WebRTC** (signaling and robot id configured in the plugin). There is typically **no** rosbridge on this path.`;
      pairingLine = `If the user says "nodes status shows zero" or "how do I pair the robot": explain that **OpenClaw device pairing** is unrelated; WebRTC robot connectivity uses the plugin's signaling/robot configuration.`;
      break;
    default:
      connectionLine = `It connects to ROS 2 via **rosbridge** (WebSocket to \`rosbridge_server\`, e.g. **${rosbridgeUrl}**).`;
      pairingLine = `If the user says "nodes status shows zero" or "how do I pair the robot": explain that the robot is already connected through the AgenticROS plugin's **rosbridge** URL (e.g. **${rosbridgeUrl}**). No pairing step is required. If the plugin is loaded and rosbridge is reachable, the robot is connected—\`openclaw nodes status\` is irrelevant for AgenticROS.`;
  }

  return `
### User-facing interface (tell users this when they ask)
- **There is no separate robot GUI, dashboard, or URL.** The interface is this chat.
- The user controls the robot by typing here (e.g. "move forward 1 meter", "what do you see?", "check the battery"). You execute commands with the ros2_* tools and reply in chat.
- For telemetry: use \`ros2_subscribe_once\` or \`ros2_camera_snapshot\` and describe or show the result in your reply. There is no separate feed URL—you are the feed. If they want a "controller app," this chat is it.

### OpenClaw "nodes" — do not confuse with AgenticROS
- AgenticROS is an **OpenClaw plugin** that runs inside this gateway. ${connectionLine} There is **no separate "AgenticROS agent" or OpenClaw "node"** to pair for ROS control.
- **Never tell users** to run \`openclaw node pair\`, \`openclaw nodes status\`, QR codes, or auth tokens **for ROS / robot control**. Those apply to OpenClaw's **companion device pairing**, not to AgenticROS talking to ROS 2.
- ${pairingLine}
`.trim();
}

/** For camera / image tips — all transports AgenticROS supports. */
function imageTransportHint(config: AgenticROSConfig): string {
  const mode = transportMode(config);
  if (mode === "local") {
    return "AgenticROS supports `sensor_msgs/msg/Image` and `sensor_msgs/msg/CompressedImage` over **local DDS** (this mode), and the same types over Zenoh or rosbridge when those transports are selected.";
  }
  return "AgenticROS supports `sensor_msgs/msg/Image` and `sensor_msgs/msg/CompressedImage` over **local DDS**, **Zenoh**, and **rosbridge**.";
}

function buildDynamicContext(
  config: AgenticROSConfig,
  name: string,
  namespace: string,
  topics: TopicInfo[],
  services: ServiceInfo[],
  actions: ActionInfo[],
): string {
  let context = `## Robot: ${name}\n\n`;
  context += `You are connected to a ROS2 robot named "${name}". You can control it using the ros2_* tools.\n\n`;
  context += `**Topics below** come from a **short live sample** when the session started. They are not guaranteed complete or up to date. If the user needs certainty—or says a topic is missing—call \`ros2_list_topics\` and answer from that result only.\n\n`;
  if (namespace) {
    context += `**Velocity commands:** Use \`ros2_publish\` with topic \`/cmd_vel\`; the plugin sends them to \`/${namespace}/cmd_vel\`.\n\n`;
  }
  context += `${buildUserInterfaceBlurb(config)}\n\n`;

  // Cap injected lists to avoid huge context (rate limits / token burn)
  const MAX_TOPICS = 25;
  const MAX_SERVICES = 15;
  const MAX_ACTIONS = 15;

  if (topics.length > 0) {
    context += "### Available Topics\n";
    const showTopics = topics.slice(0, MAX_TOPICS);
    for (const t of showTopics) {
      context += `- \`${t.name}\` (${t.type})\n`;
    }
    if (topics.length > MAX_TOPICS) {
      context += `- … and ${topics.length - MAX_TOPICS} more (use \`ros2_list_topics\` if needed)\n`;
    }
    context += "\n";
  }

  if (services.length > 0) {
    context += "### Available Services\n";
    const showServices = services.slice(0, MAX_SERVICES);
    for (const s of showServices) {
      context += `- \`${s.name}\` (${s.type})\n`;
    }
    if (services.length > MAX_SERVICES) {
      context += `- … and ${services.length - MAX_SERVICES} more\n`;
    }
    context += "\n";
  }

  if (actions.length > 0) {
    context += "### Available Actions\n";
    const showActions = actions.slice(0, MAX_ACTIONS);
    for (const a of showActions) {
      context += `- \`${a.name}\` (${a.type})\n`;
    }
    if (actions.length > MAX_ACTIONS) {
      context += `- … and ${actions.length - MAX_ACTIONS} more\n`;
    }
    context += "\n";
  }

  const skillIds = getLoadedSkillIds();
  if (skillIds.length > 0) {
    context += "### Available skills\n";
    for (const id of skillIds) {
      if (id === "followme") {
        context += `- **followme**: Use the **\`follow_robot\`** tool with action \`start\`, \`stop\`, or \`status\` to control person-following. There is no separate follow-robot HTTP service or port—everything runs inside this gateway via ROS2 (Zenoh, local DDS, or rosbridge depending on transport). For \"follow me\" or \"start following\", call \`follow_robot\` with action \`start\`; to stop, use action \`stop\`. Optional: \`follow_me_see\` (what the tracker sees), \`ollama_status\` (if using Ollama).\n`;
      } else {
        context += `- **${id}**: Loaded; use the tools provided by this skill as documented in the skill.\n`;
      }
    }
    context += "\n";
  }

  context += `### Safety Limits
- Maximum linear velocity: 1.0 m/s
- Maximum angular velocity: 1.5 rad/s
- All velocity commands are validated before execution

### Camera / "What does the robot see?"
- When the user asks what the robot sees (or for a photo, camera view, or snapshot), **always call \`ros2_camera_snapshot\`** (or \`ros2_subscribe_once\` on a camera topic). Prefer a topic from the list above that contains **color** and **compressed** (e.g. \`/camera/camera/color/image_raw/compressed\`) for RGB. Do not assume the transport cannot decode images—${imageTransportHint(config)} If the tool returns an error, report it; otherwise show or describe the image. **Do not paste \`data:\` URLs or raw base64** in your reply—the tool returns a proper image block for the UI; describe what you see in prose.

### Tips
- Use \`ros2_list_topics\` to discover all available topics
- Use \`ros2_subscribe_once\` to read the current value of any topic
- Use \`ros2_camera_snapshot\` to see what the robot sees
- The user can say /estop at any time to immediately stop the robot`;

  return context;
}

function buildFallbackContext(
  config: AgenticROSConfig,
  name: string,
  namespace: string,
  cameraTopicHint: string,
): string {
  const skillIds = getLoadedSkillIds();
  const skillsSection =
    skillIds.length > 0
      ? "### Available skills\n" +
        skillIds
          .map((id) =>
            id === "followme"
              ? "- **followme**: Use the **`follow_robot`** tool with action `start`, `stop`, or `status` to control person-following. There is no separate follow-robot HTTP service or port—everything runs inside this gateway via ROS2 (Zenoh, local DDS, or rosbridge depending on transport). For \"follow me\" or \"start following\", call `follow_robot` with action `start`; to stop, use action `stop`. Optional: `follow_me_see`, `ollama_status`."
              : `- **${id}**: Loaded; use the tools provided by this skill as documented in the skill.`,
          )
          .join("\n") +
        "\n\n"
      : "";

  const nsLine = namespace
    ? `Configured **robot.namespace** is \`${namespace}\` (used for cmd_vel-style namespacing in tools — not proof those topics exist).\n\n`
    : "";

  return `
## Robot: ${name}

You are connected to a ROS2 robot named "${name}". You can control it using the ros2_* tools.

${buildUserInterfaceBlurb(config)}

### Topic discovery (read carefully)
**No live topic list was available when this session started** (transport still connecting, Zenoh sampling saw no keys yet, or discovery failed). There is **no** "### Available Topics" section below because nothing was observed on the bus.

- **You must call \`ros2_list_topics\`** and treat its return value as the **only** authoritative list. **Do not** tell the user that topics such as \`odom\`, \`scan\`, \`battery_state\`, or \`cmd_vel\` exist unless they appear in that tool output (or you successfully subscribe and get data).
- If the user asks what topics exist, **run the tool first**, then summarize **only** what it returned. If the list is empty, say so plainly and suggest checking the robot stack, Zenoh bridge, and gateway logs.
- For camera snapshots, after listing topics pick a **CompressedImage** (or Image) topic from the tool result; if none exist, say there is no camera topic. A common **default in plugin config** (not verified live) is \`${cameraTopicHint}\` — still confirm with \`ros2_list_topics\` before relying on it.

${nsLine}${skillsSection}### Safety Limits
- Maximum linear velocity: 1.0 m/s
- Maximum angular velocity: 1.5 rad/s
- All velocity commands are validated before execution

### Camera / "What does the robot see?"
- When the user asks what the robot sees (or for a photo, camera view, or snapshot), **always call \`ros2_camera_snapshot\`** (or \`ros2_subscribe_once\` on a camera topic). Do not assume the transport cannot decode images—${imageTransportHint(config)} If the tool returns an error, report it; otherwise show or describe the image. **Do not paste \`data:\` URLs or raw base64** in your reply—the tool returns a proper image block for the UI; describe what you see in prose.

### Distance / "How far am I?"
- When the user asks how far they are from the robot (or depth / distance in meters), **call \`ros2_depth_distance\`** only on a depth Image topic that **\`ros2_list_topics\`** (or prior tool output) shows exists. Report the tool result or **quote the exact error text** if it fails (do not claim a generic "decode" failure without the tool message). If the result is valid, give **distance_m** as the measured answer (nearer-surface percentile; **median_m** is also returned and often reflects background if the person only fills part of the depth patch).

### Tips
- Use \`ros2_list_topics\` to discover all available topics
- Use \`ros2_subscribe_once\` to read the current value of any topic
- Use \`ros2_camera_snapshot\` to see what the robot sees
- The user can say /estop at any time to immediately stop the robot
`.trim();
}
