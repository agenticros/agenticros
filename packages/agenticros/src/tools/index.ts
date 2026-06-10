import type { AgentTool, OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { registerPublishTool } from "./ros2-publish.js";
import { registerSubscribeTool } from "./ros2-subscribe.js";
import { registerServiceTool } from "./ros2-service.js";
import { registerActionTool } from "./ros2-action.js";
import { registerParamTools } from "./ros2-param.js";
import { registerIntrospectTool } from "./ros2-introspect.js";
import { registerCameraTool } from "./ros2-camera.js";
import { registerDepthDistanceTool } from "./ros2-depth-distance.js";
import { registerCapabilitiesTool } from "./ros2-capabilities.js";
import { registerRobotsTool } from "./ros2-robots.js";
import { registerDiscoverRobotsTool } from "./ros2-discover.js";
import { registerFindRobotsForTool } from "./ros2-find-robots-for.js";
import { registerMissionTool, type ToolRegistry } from "./ros2-mission.js";
import { registerMissionCancelTool } from "./mission-cancel.js";

/**
 * Wrap the OpenClaw API so every registerTool() call is also recorded in
 * a local tool registry. The mission runner uses the registry to
 * dispatch sub-tool calls by name (e.g. capability "drive_base" routes
 * to the registered "ros2_publish" tool's execute()).
 *
 * We keep this internal — skills that register their own tools via
 * `api.registerTool` won't appear in the registry, which is fine for
 * v1: today the mission runner only supports the eight intrinsic
 * capability bindings declared in ros2-mission.ts. Phase 1.d will
 * extend this to capture skill-declared tools as well.
 */
function wrapApiWithToolCapture(api: OpenClawPluginApi): {
  wrappedApi: OpenClawPluginApi;
  registry: ToolRegistry;
} {
  const registry: ToolRegistry = new Map();
  const wrappedApi: OpenClawPluginApi = {
    ...api,
    registerTool: (tool: AgentTool, opts) => {
      registry.set(tool.name, tool);
      api.registerTool(tool, opts);
    },
  };
  return { wrappedApi, registry };
}

/**
 * Register core ROS2 tools with the OpenClaw AI agent.
 * Optional skills (e.g. Follow Me) register their own tools via the skill loader.
 * Memory tools register asynchronously from index.ts after initMemory resolves.
 */
export function registerTools(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  const { wrappedApi, registry } = wrapApiWithToolCapture(api);
  registerPublishTool(wrappedApi, config);
  registerSubscribeTool(wrappedApi, config);
  registerServiceTool(wrappedApi, config);
  registerActionTool(wrappedApi, config);
  registerParamTools(wrappedApi, config);
  registerIntrospectTool(wrappedApi);
  registerCameraTool(wrappedApi, config);
  registerDepthDistanceTool(wrappedApi, config);
  registerCapabilitiesTool(wrappedApi, config);
  registerRobotsTool(wrappedApi, config);
  registerDiscoverRobotsTool(wrappedApi, config);
  registerFindRobotsForTool(wrappedApi, config);
  registerMissionTool(wrappedApi, config, registry);
  registerMissionCancelTool(wrappedApi);
}
