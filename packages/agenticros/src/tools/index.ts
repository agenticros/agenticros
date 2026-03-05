import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { registerPublishTool } from "./ros2-publish.js";
import { registerSubscribeTool } from "./ros2-subscribe.js";
import { registerServiceTool } from "./ros2-service.js";
import { registerActionTool } from "./ros2-action.js";
import { registerParamTools } from "./ros2-param.js";
import { registerIntrospectTool } from "./ros2-introspect.js";
import { registerCameraTool } from "./ros2-camera.js";
import { registerDepthDistanceTool } from "./ros2-depth-distance.js";

/**
 * Register core ROS2 tools with the OpenClaw AI agent.
 * Optional skills (e.g. Follow Me) register their own tools via the skill loader.
 */
export function registerTools(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  registerPublishTool(api, config);
  registerSubscribeTool(api, config);
  registerServiceTool(api, config);
  registerActionTool(api, config);
  registerParamTools(api, config);
  registerIntrospectTool(api);
  registerCameraTool(api, config);
  registerDepthDistanceTool(api, config);
}
