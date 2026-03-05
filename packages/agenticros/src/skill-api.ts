/**
 * Skill contract types for AgenticROS skill packages.
 * Skill packages implement registerSkill(api, config, context) and receive
 * context.getTransport(), context.getDepthDistance(), and context.logger.
 */

import type { RosTransport } from "@agenticros/core";
import type { OpenClawPluginApi } from "./plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import type { PluginLogger } from "./plugin-api.js";

/** Result of sampling a depth topic (e.g. RealSense). */
export interface DepthSampleResult {
  distance_m: number;
  valid: boolean;
  topic: string;
  encoding: string;
  width: number;
  height: number;
  sample_count: number;
  min_m: number;
  max_m: number;
}

/** Result of sampling left/center/right sectors of a depth image (for turning toward person). */
export interface DepthSectorsResult {
  left_m: number;
  center_m: number;
  right_m: number;
  valid: boolean;
  topic: string;
}

/**
 * Context passed to each skill when it registers.
 * - getTransport(): active ROS2 transport (throws if not connected).
 * - getDepthDistance(transport, topic, timeoutMs?): sample depth in meters from a topic.
 * - getDepthSectors(transport, topic, timeoutMs?): sample left/center/right sectors for turn direction.
 * - logger: plugin logger.
 */
export interface SkillContext {
  getTransport(): RosTransport;
  getDepthDistance(
    transport: RosTransport,
    topic: string,
    timeoutMs?: number,
  ): Promise<DepthSampleResult>;
  getDepthSectors(
    transport: RosTransport,
    topic: string,
    timeoutMs?: number,
  ): Promise<DepthSectorsResult>;
  logger: PluginLogger;
}

/**
 * Skill package entry: called once at gateway start with the plugin api, full config, and skill context.
 * The skill reads its config from config.skills.<skillId> and registers tools/commands via api.
 */
export type RegisterSkill = (
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
  context: SkillContext,
) => void | Promise<void>;
