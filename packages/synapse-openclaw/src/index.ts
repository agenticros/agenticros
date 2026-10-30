import type { OpenClawPluginApi } from "./plugin-api.js";
import { parseConfig, isCdrTypeSupported, synapseBannerLines, applyCachedSkillRefs } from "@corebrum/core";
import { readSynapseConfigFromFile } from "./config-file.js";
import { registerService } from "./service.js";
import { registerTools } from "./tools/index.js";
import { registerMemoryTools } from "./tools/ros2-memory.js";
import { initMemory } from "./memory.js";
import { registerHiveTools } from "./tools/hive-tools.js";
import { initHive } from "./hive.js";
import { loadSkills } from "./skill-loader.js";
import { registerSafetyHook } from "./safety/validator.js";
import { registerRobotContext } from "./context/robot-context.js";
import { registerEstopCommand } from "./commands/estop.js";
import { registerTransportCommand } from "./commands/transport.js";
import { registerRoutes } from "./routes.js";

/**
 * Corebrum Synapse — OpenClaw plugin for ROS2 robot control via natural language.
 */
export default {
  id: "synapse",
  name: "Corebrum Synapse",

  register(api: OpenClawPluginApi): void {
    for (const line of synapseBannerLines({ tagline: true })) {
      api.logger.info(line);
    }
    api.logger.info("Corebrum Synapse plugin loading...");

    let config: ReturnType<typeof parseConfig>;
    try {
      config = readSynapseConfigFromFile();
      api.logger.info("Corebrum Synapse: using config from file (transport, namespace, etc.)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      api.logger.warn("Corebrum Synapse: could not read config from file: " + msg + " — using gateway pluginConfig.");
      config = parseConfig(api.pluginConfig ?? {});
    }
    // Merge skillRefs that are already cached (no network in sync register).
    config = applyCachedSkillRefs(config);
    if ((config.skillRefs?.length ?? 0) > 0) {
      api.logger.info(
        `Corebrum Synapse: skillRefs=${config.skillRefs!.length} (cached paths merged into skillPaths; run skills install to warm cache)`,
      );
    }
    const mode = config.transport?.mode ?? "local";
    const zenohEndpoint = config.zenoh?.routerEndpoint ?? "";
    api.logger.info(`Corebrum Synapse: transport mode=${mode}${mode === "zenoh" && zenohEndpoint ? ` endpoint=${zenohEndpoint}` : ""}`);

    // Informational only — skip unless Zenoh is the active transport.
    if (mode === "zenoh") {
      const imageSupported = isCdrTypeSupported("sensor_msgs/msg/CompressedImage");
      api.logger.info(`Corebrum Synapse: Zenoh CDR Image/CompressedImage supported=${imageSupported}`);
    }

    // Register HTTP routes before any await so OpenClaw gateways that don't await register() still mount them (e.g. 2026.3.11 "async registration is ignored")
    if (typeof api.registerHttpRoute === "function") {
      registerRoutes(api, config);
    }

    // Register the rosbridge WebSocket connection as a managed service
    registerService(api, config);

    // Register core ROS2 tools (no Follow Me — that lives in corebrum-skill-followme)
    registerTools(api, config);

    // Initialize optional memory subsystem (async; off-by-default; same pattern as skills below).
    void initMemory(config, api.logger)
      .then((memory) => {
        if (memory) registerMemoryTools(api, config);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        api.logger.error("Corebrum Synapse: memory init failed: " + msg);
      });

    void initHive(config, api.logger)
      .then((hive) => {
        if (hive) registerHiveTools(api, config);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        api.logger.error("Corebrum Synapse: hive init failed: " + msg);
      });

    // Load optional skills synchronously. OpenClaw 2026.6's plugin host snapshots
    // captured.tools the instant register() returns, so any skill that registers
    // tools must do so inline with this call (not via a Promise). See
    // skill-loader.ts for the require(esm)-based mechanism.
    try {
      loadSkills(api, config);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      api.logger.error("Corebrum Synapse: skill load failed: " + msg);
    }

    // Register safety validation hook (before_tool_call)
    registerSafetyHook(api, config);

    // Register robot capability injection (before_prompt_build)
    registerRobotContext(api, config);

    // Register direct commands (bypass AI)
    registerEstopCommand(api, config);
    registerTransportCommand(api, config);

    api.logger.info("Corebrum Synapse plugin loaded successfully");
  },
};

export type { OpenClawPluginApi } from "./plugin-api.js";
export type { SkillContext, RegisterSkill, DepthSampleResult, DepthSectorsResult } from "./skill-api.js";
