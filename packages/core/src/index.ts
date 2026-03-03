/**
 * @agenticros/core — Platform-agnostic ROS2 transport, config, and utilities.
 */

export type { AgenticROSConfig } from "./config.js";
export {
  AgenticROSConfigSchema,
  parseConfig,
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

export { toNamespacedTopic, toNamespacedTopicFull } from "./topic-utils.js";
export { isCdrTypeSupported } from "./transport/zenoh/cdr.js";
