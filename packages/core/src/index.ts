/**
 * @agenticros/core — Platform-agnostic ROS2 transport, config, and utilities.
 */

export type { AgenticROSConfig, RobotTransportOverride } from "./config.js";
export {
  AgenticROSConfigSchema,
  parseConfig,
  prepareConfigForPersistence,
  getTransportConfig,
} from "./config.js";

export { createTransport } from "./transport/factory.js";
export type { RosTransport } from "./transport/transport.js";
export type {
  ConnectionStatus,
  ConnectionHandler,
  Subscription,
  PublishOptions,
  AdvertiseOptions,
  SubscribeOptions,
  ServiceCallOptions,
  ServiceCallResult,
  ActionGoalOptions,
  ActionResult,
  TopicInfo,
  ServiceInfo,
  ActionInfo,
  MessageHandler,
  TransportConfig,
} from "./transport/types.js";

export {
  toNamespacedTopic,
  toNamespacedTopicFull,
  toTeleopCameraTopicShort,
  resolveCameraSubscribeTopic,
} from "./topic-utils.js";
export { applyCmdVelTwistSignConvention } from "./cmd-vel-twist.js";
export { isCdrTypeSupported } from "./transport/zenoh/cdr.js";
export {
  renderAgenticROSBanner,
  agenticROSBannerLines,
  type AgenticROSBannerOptions,
} from "./banner.js";

export { createMemory, resolveMemoryNamespace } from "./memory/index.js";
export type {
  MemoryProvider,
  MemoryRecord,
  MemoryStatus,
  RememberInput,
  RecallInput,
  ForgetInput,
} from "./memory/index.js";

export {
  BUILTIN_CAPABILITIES,
  readSkillCapabilities,
  listAllCapabilities,
} from "./capabilities.js";
export type {
  Capability,
  CapabilityField,
  CapabilityImplementation,
  CapabilitySource,
} from "./capabilities.js";

export {
  CapabilitySchema,
  CapabilityFieldSchema,
  CapabilityImplementationSchema,
  parseCapability,
  safeParseCapability,
} from "./capability-schema.js";
export type { ParsedCapability } from "./capability-schema.js";

export {
  buildExternalGoal,
  executeExternalCapability,
} from "./external-capability.js";
export type {
  ExecuteExternalOptions,
  ExecuteExternalResult,
} from "./external-capability.js";

export { runMission, MissionStepAbortedError } from "./mission.js";
export type {
  Mission,
  MissionStep,
  MissionResult,
  MissionStepResult,
  MissionToolDispatcher,
  MissionDispatchContext,
  CapabilityToolBinding,
  CapabilityToolBindings,
  MissionCancellationToken,
  MissionControlToken,
  MissionTranscriptEntry,
  MissionTranscriptSink,
  RunMissionOptions,
} from "./mission.js";

export {
  BUILTIN_MISSION_BINDINGS,
  EXTERNAL_TOOL_PREFIX,
  buildMissionBindings,
  capabilityIdFromExternalTool,
  defaultToolForCapability,
  externalToolName,
  isExternalToolName,
  passthroughBuildArgs,
} from "./mission-bindings.js";
export type {
  BuildMissionBindingsOptions,
  CapabilityWithTool,
} from "./mission-bindings.js";

export {
  MissionRegistry,
  generateMissionId,
  missionTranscriptNamespace,
} from "./mission-registry.js";
export type { MissionRegistryEntry } from "./mission-registry.js";

export { createMemoryTranscriptSink } from "./mission-transcript-sink.js";

export { compileGoalToMission } from "./planner/index.js";
export type { PlannerResult, PlannerCandidate } from "./planner/index.js";

export {
  listRobots,
  resolveRobot,
  resolveRobotFromArgs,
  getActiveRobotId,
  getTransportConfigForRobot,
  hasRobotTransportOverride,
} from "./robots.js";
export type { ResolvedRobot, RobotSensors } from "./robots.js";

export {
  detectRobotsFromTopics,
  discoverRobots,
  effectiveCmdVelNamespace,
} from "./discovery.js";
export type { DetectedRobot, RobotDiscoveryResult } from "./discovery.js";

export {
  DEFAULT_HEARTBEAT_STALENESS_MS,
  detectHeartbeatNamespacesFromTopics,
  isHeartbeatFresh,
  isRobotInfoTopic,
  mergeRobotHeartbeats,
  namespaceFromRobotInfoTopic,
  onlineIdsFromHeartbeats,
  parseRobotInfoMessage,
} from "./heartbeat.js";
export type { HeartbeatOnlineOptions, RobotHeartbeat } from "./heartbeat.js";

export {
  DEFAULT_FLEET_FILENAME,
  applyFleetOverride,
  loadFleetFile,
  resolveFleetPath,
} from "./fleet-config.js";
export type { FleetFileResult } from "./fleet-config.js";

export { findRobotsFor } from "./find-robots-for.js";
export type {
  FindRobotsForQuery,
  FindRobotsForMatch,
  FindRobotsForResult,
} from "./find-robots-for.js";

export {
  DEFAULT_SKILLS_API,
  DEFAULT_SKILLS_CACHE_DIR,
  ensureSkillRefCached,
  ensureNpmPackageCached,
  fetchInstallDescriptor,
  githubRepoBasename,
  parseSkillRef,
  resolveSkillRefs,
  skillsApiBase,
  skillsCacheDir,
  withResolvedSkillRefs,
  applyCachedSkillRefs,
} from "./skill-refs.js";
export type {
  InstallDescriptor,
  ParsedSkillRef,
  ResolveSkillRefsOptions,
  ResolveSkillRefsResult,
} from "./skill-refs.js";

export {
  fetchMarketplaceSkills,
  listCapabilitiesWithDiscoverable,
} from "./discoverable-capabilities.js";
export type {
  DiscoverableCapability,
  ListCapabilitiesOptions,
  ListedCapability,
} from "./discoverable-capabilities.js";

export { TransportPool, TRANSPORT_POOL_GLOBAL_KEY } from "./transport-pool.js";
export type { TransportFactory } from "./transport-pool.js";
