import type { OpenClawPluginApi } from "./plugin-api.js";
import { parseConfig, isCdrTypeSupported } from "@agenticros/core";
import { registerService } from "./service.js";
import { registerTools } from "./tools/index.js";
import { registerSafetyHook } from "./safety/validator.js";
import { registerRobotContext } from "./context/robot-context.js";
import { registerEstopCommand } from "./commands/estop.js";
import { registerTransportCommand } from "./commands/transport.js";
import { registerRoutes } from "./routes.js";

/**
 * AgenticROS — OpenClaw plugin for ROS2 robot control via natural language.
 */
export default {
  id: "agenticros",
  name: "AgenticROS",

  register(api: OpenClawPluginApi): void {
    api.logger.info("AgenticROS plugin loading...");
    const imageSupported = isCdrTypeSupported("sensor_msgs/msg/CompressedImage");
    api.logger.info(`AgenticROS: Zenoh CDR Image/CompressedImage supported=${imageSupported}`);

    const config = parseConfig(api.pluginConfig ?? {});

    // Register the rosbridge WebSocket connection as a managed service
    registerService(api, config);

    // Register all ROS2 tools and mission tools with the AI agent
    registerTools(api, config);

    // Register safety validation hook (before_tool_call)
    registerSafetyHook(api, config);

    // Register robot capability injection (before_agent_start)
    registerRobotContext(api, config);

    // Register direct commands (bypass AI)
    registerEstopCommand(api, config);
    registerTransportCommand(api, config);

    if (typeof api.registerHttpRoute === "function") {
      registerRoutes(api, config);
    }

    api.logger.info("AgenticROS plugin loaded successfully");
  },
};
