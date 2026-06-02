import type { OpenClawPluginApi } from "./plugin-api.js";
import { parseConfig, isCdrTypeSupported, agenticROSBannerLines } from "@agenticros/core";
import { readAgenticROSConfigFromFile } from "./config-file.js";
import { registerService } from "./service.js";
import { registerTools } from "./tools/index.js";
import { registerMemoryTools } from "./tools/ros2-memory.js";
import { initMemory } from "./memory.js";
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

  register(api: OpenClawPluginApi): void {
    for (const line of agenticROSBannerLines({ tagline: true })) {
      api.logger.info(line);
    }
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

    // Register HTTP routes before any await so OpenClaw gateways that don't await register() still mount them (e.g. 2026.3.11 "async registration is ignored")
    if (typeof api.registerHttpRoute === "function") {
      registerRoutes(api, config);
    }

    // Register the rosbridge WebSocket connection as a managed service
    registerService(api, config);

    // Register core ROS2 tools (no Follow Me — that lives in agenticros-skill-followme)
    registerTools(api, config);

    // Initialize optional memory subsystem (async; off-by-default; same pattern as skills below).
    void initMemory(config, api.logger)
      .then((memory) => {
        if (memory) registerMemoryTools(api, config);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        api.logger.error("AgenticROS: memory init failed: " + msg);
      });

    // Load optional skills from skillPackages and skillPaths (async; OpenClaw 2026.5+ requires sync register())
    void loadSkills(api, config).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      api.logger.error("AgenticROS: skill load failed: " + msg);
    });

    // Register safety validation hook (before_tool_call)
    registerSafetyHook(api, config);

    // Register robot capability injection (before_agent_start)
    registerRobotContext(api, config);

    // Register direct commands (bypass AI)
    registerEstopCommand(api, config);
    registerTransportCommand(api, config);

    api.logger.info("AgenticROS plugin loaded successfully");
  },
};

export type { OpenClawPluginApi } from "./plugin-api.js";
export type { SkillContext, RegisterSkill, DepthSampleResult, DepthSectorsResult } from "./skill-api.js";
