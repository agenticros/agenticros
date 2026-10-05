import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import { getTransport, getTransportMode } from "../service.js";

function emptyTopicsHint(mode: ReturnType<typeof getTransportMode>): string {
  if (mode === "zenoh") {
    return (
      "No Zenoh keys were sampled. OpenClaw uses WebSocket to the zenohd remote-api (not tcp://ROBOT_IP). " +
      "If you see traffic with `zenoh subscribe -k '**' -e tcp/ROBOT_IP:7447`, that is often the robot's router — " +
      "the bridge must peer to the same router as OpenClaw. " +
      "Retry after confirming topology; optionally set AGENTICROS_ZENOH_LIST_TOPICS_MS for a longer sample window."
    );
  }
  if (mode === "local") {
    return (
      "Local DDS returned no external topics. The gateway is on the graph, but no other ROS 2 nodes are visible. " +
      "Start the robot stack in the same ROS_DOMAIN_ID as this gateway (default 0). This is not a Zenoh sample."
    );
  }
  if (mode === "rosbridge") {
    return "rosbridge returned no topics. Confirm rosbridge_server is running and connected to the same ROS graph.";
  }
  return "The transport returned no topics.";
}

/**
 * Register the ros2_list_topics tool with the AI agent.
 * Allows the agent to discover available ROS2 topics at runtime.
 */
export function registerIntrospectTool(api: OpenClawPluginApi): void {
  api.registerTool({
    name: "ros2_list_topics",
    label: "ROS2 List Topics",
    description:
      "List ROS 2 topics seen by the transport (authoritative for this moment). " +
      "Use when the user asks what topics exist, or when system context did not list discovery results—" +
      "do not assume names like /odom, /scan, or /battery_state exist without this tool (or subscribe) confirming them.",
    parameters: Type.Object({}),

    async execute(_toolCallId, _params) {
      const transport = getTransport();
      const mode = getTransportMode();
      const topics = await transport.listTopics();

      // Cap output size to avoid rate limits / token burn when robot has many topics
      const MAX_TOPICS_IN_RESPONSE = 50;
      const MAX_CHARS = 6000;
      const truncated =
        topics.length > MAX_TOPICS_IN_RESPONSE
          ? topics.slice(0, MAX_TOPICS_IN_RESPONSE)
          : topics;
      const result = {
        success: true,
        topics: truncated,
        total: topics.length,
        truncated: topics.length > MAX_TOPICS_IN_RESPONSE,
        ...(topics.length === 0 ? { transport: mode, hint: emptyTopicsHint(mode) } : {}),
      };
      let text = JSON.stringify(result);
      if (text.length > MAX_CHARS) {
        const fewer = truncated.slice(0, 20);
        text = JSON.stringify({
          success: true,
          total: topics.length,
          message: `Topic list truncated to save tokens (${topics.length} total). Showing first 20.`,
          topics: fewer,
        });
      }

      return {
        content: [{ type: "text", text }],
        details: result,
      };
    },
  });
}
