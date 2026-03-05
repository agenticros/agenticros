import type { OpenClawPluginApi } from "./plugin-api.js";
import { parseConfig, isCdrTypeSupported } from "@agenticros/core";
import { readAgenticROSConfigFromFile } from "./config-file.js";
import { registerService } from "./service.js";
import { registerTools } from "./tools/index.js";
import { loadSkills } from "./skill-loader.js";
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

  async register(api: OpenClawPluginApi): Promise<void> {
    api.logger.info("AgenticROS plugin loading...");
    const imageSupported = isCdrTypeSupported("sensor_msgs/msg/CompressedImage");
    api.logger.info(`AgenticROS: Zenoh CDR Image/CompressedImage supported=${imageSupported}`);

    let config: ReturnType<typeof parseConfig>;
    try {
      config = readAgenticROSConfigFromFile();
      api.logger.info("AgenticROS: using config from file (transport, namespace, etc.)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      api.logger.warn("AgenticROS: could not read config from file: " + msg + " — using gateway pluginConfig.");
      config = parseConfig(api.pluginConfig ?? {});
    }
    const mode = config.transport?.mode ?? "rosbridge";
    const zenohEndpoint = config.zenoh?.routerEndpoint ?? "";
    api.logger.info(`AgenticROS: transport mode=${mode}${mode === "zenoh" && zenohEndpoint ? ` endpoint=${zenohEndpoint}` : ""}`);

    // Register the rosbridge WebSocket connection as a managed service
    registerService(api, config);

    // Register core ROS2 tools (no Follow Me — that lives in agenticros-skill-followme)
    registerTools(api, config);

    // Load optional skills from skillPackages and skillPaths
    await loadSkills(api, config);

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

export type { OpenClawPluginApi } from "./plugin-api.js";
export type { SkillContext, RegisterSkill, DepthSampleResult, DepthSectorsResult } from "./skill-api.js";
