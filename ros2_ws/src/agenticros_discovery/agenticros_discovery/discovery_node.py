"""
AgenticROS Discovery Node

Introspects the running ROS2 system and publishes two manifests:

  1. A capability manifest describing the available topics, services, and
     actions on the ROS2 graph (consumed by the OpenClaw plugin to inform
     the AI agent about what the robot can do).
  2. (Phase 1.e) A robot heartbeat (`RobotInfo`) carrying id, name, kind,
     capabilities, and sensor flags — published on `<namespace>/agenticros/
     robot_info` at 1 Hz. This is the live counterpart to the TS-side
     `config.robots[i]` block: the TS agent can subscribe to a fleet's
     heartbeats and answer `ros2_find_robots_for(capability=…)` against
     robots it has never been configured for. See docs/strategy-ai-agents-
     plus-ros.md §4(d).

Published topics:
  /agenticros/capabilities                  (agenticros_msgs/msg/CapabilityManifest)
  <namespace>/agenticros/robot_info         (agenticros_msgs/msg/RobotInfo, Phase 1.e)

Service:
  /agenticros/get_capabilities  (agenticros_msgs/srv/GetCapabilities)

Parameters:
  robot_name        — Display name (default: "Robot")
  robot_namespace   — ROS2 namespace, also used as the heartbeat id fallback (default: "")
  robot_id          — Stable id for the robot (Phase 1.e). When empty, falls back to robot_namespace.
  robot_kind        — Robot kind: amr | arm | drone | rover | … (Phase 1.e, default: "amr")
  capability_ids    — Per-robot capability allowlist for ros2_find_robots_for. Empty = inherit gateway registry. (Phase 1.e)
  has_realsense     — Sensor tag, surfaces in RobotInfo + ros2_find_robots_for (Phase 1.e)
  has_lidar         — Sensor tag (Phase 1.e)
  has_arm           — Sensor tag (Phase 1.e)
  publish_interval  — Seconds between CapabilityManifest publications (default: 5.0)
  heartbeat_interval — Seconds between RobotInfo heartbeats (Phase 1.e, default: 1.0)
"""

from __future__ import annotations

import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, DurabilityPolicy

from agenticros_msgs.msg import CapabilityManifest, RobotInfo
from agenticros_msgs.srv import GetCapabilities


# Internal ROS2 topics/services that clutter the manifest
_INTERNAL_PREFIXES = (
    "/rosout",
    "/parameter_events",
    "/agenticros/",
)


def _normalize_namespace_for_topic(ns: str) -> str:
    """Return `<ns>/agenticros/robot_info` with exactly one leading slash.

    Empty namespace falls back to a single global topic (no per-robot prefix)
    so single-robot deployments without an explicit namespace still get a
    heartbeat at `/agenticros/robot_info`.
    """
    cleaned = ns.strip().lstrip("/")
    if not cleaned:
        return "/agenticros/robot_info"
    return f"/{cleaned}/agenticros/robot_info"


class DiscoveryNode(Node):
    """Periodically discovers ROS2 capabilities and publishes a manifest."""

    def __init__(self) -> None:
        super().__init__("agenticros_discovery")

        # Parameters — historical first, then Phase 1.e additions.
        self.declare_parameter("robot_name", "Robot")
        self.declare_parameter("robot_namespace", "")
        self.declare_parameter("publish_interval", 5.0)

        # Phase 1.e identity + fleet-metadata parameters. Declared with
        # back-compat defaults so existing single-robot launches keep
        # working without setting anything new.
        self.declare_parameter("robot_id", "")
        self.declare_parameter("robot_kind", "amr")
        self.declare_parameter("capability_ids", [""])
        self.declare_parameter("has_realsense", False)
        self.declare_parameter("has_lidar", False)
        self.declare_parameter("has_arm", False)
        self.declare_parameter("heartbeat_interval", 1.0)

        self.robot_name: str = self.get_parameter("robot_name").value
        self.robot_namespace: str = self.get_parameter("robot_namespace").value
        self.publish_interval: float = self.get_parameter("publish_interval").value

        # rclpy can't declare an empty string-array default — it falls
        # back to TYPE_NOT_SET unless we seed with [""]. Strip the
        # placeholder here so the published heartbeat carries an
        # accurate count.
        raw_capability_ids = self.get_parameter("capability_ids").value or []
        self.capability_ids = [c for c in raw_capability_ids if c]

        # robot_id falls back to robot_namespace, matching the TS-side
        # listRobots() legacy-fallback contract.
        configured_id: str = self.get_parameter("robot_id").value
        self.robot_id: str = configured_id.strip() or (self.robot_namespace.strip() or "default")
        self.robot_kind: str = self.get_parameter("robot_kind").value
        self.has_realsense: bool = self.get_parameter("has_realsense").value
        self.has_lidar: bool = self.get_parameter("has_lidar").value
        self.has_arm: bool = self.get_parameter("has_arm").value
        self.heartbeat_interval: float = self.get_parameter("heartbeat_interval").value

        # Publisher — transient local so late subscribers get the last manifest
        qos = QoSProfile(depth=1, durability=DurabilityPolicy.TRANSIENT_LOCAL)
        self.manifest_pub = self.create_publisher(
            CapabilityManifest, "/agenticros/capabilities", qos
        )
        # Phase 1.e heartbeat publisher. Transient-local QoS so a TS
        # adapter that subscribes mid-flight immediately gets the
        # latest sample without waiting up to `heartbeat_interval` for
        # the next tick.
        self.robot_info_topic = _normalize_namespace_for_topic(self.robot_namespace)
        self.robot_info_pub = self.create_publisher(RobotInfo, self.robot_info_topic, qos)

        # Service — on-demand query
        self.get_caps_srv = self.create_service(
            GetCapabilities, "/agenticros/get_capabilities", self._handle_get_capabilities
        )

        # Timers — keep manifest + heartbeat on independent cadences.
        # The manifest is comparatively heavy (whole topic graph) and
        # changes rarely, so the existing 5 s default stays. The
        # heartbeat at 1 Hz matches the strategy memo's
        # "1 Hz with 5 s staleness window" recommendation.
        self.timer = self.create_timer(self.publish_interval, self._on_timer)
        self.heartbeat_timer = self.create_timer(self.heartbeat_interval, self._on_heartbeat)

        self.get_logger().info(
            f"Discovery node started: robot={self.robot_name}, "
            f"namespace='{self.robot_namespace}', interval={self.publish_interval}s, "
            f"id={self.robot_id}, kind={self.robot_kind}, "
            f"heartbeat={self.heartbeat_interval}s on {self.robot_info_topic}"
        )

    def _on_timer(self) -> None:
        """Discover capabilities and publish the manifest."""
        manifest = self._build_manifest()
        self.manifest_pub.publish(manifest)
        self.get_logger().debug(
            f"Published manifest: {len(manifest.topic_names)} topics, "
            f"{len(manifest.service_names)} services, "
            f"{len(manifest.action_names)} actions"
        )

    def _on_heartbeat(self) -> None:
        """Publish a `RobotInfo` heartbeat on `<namespace>/agenticros/robot_info`.

        Carries id, name, kind, capability ids, sensor flags, and a
        timestamp so subscribers can apply a staleness window without
        relying on transport-level keepalives.
        """
        info = self._build_robot_info()
        self.robot_info_pub.publish(info)

    def _build_robot_info(self) -> RobotInfo:
        """Materialise the Phase 1.e heartbeat payload from declared params."""
        msg = RobotInfo()
        msg.id = self.robot_id
        msg.name = self.robot_name
        msg.kind = self.robot_kind
        msg.robot_namespace = self.robot_namespace
        msg.capability_ids = list(self.capability_ids)
        msg.has_realsense = bool(self.has_realsense)
        msg.has_lidar = bool(self.has_lidar)
        msg.has_arm = bool(self.has_arm)
        msg.stamp = self.get_clock().now().to_msg()
        return msg

    def _handle_get_capabilities(
        self,
        request: GetCapabilities.Request,
        response: GetCapabilities.Response,
    ) -> GetCapabilities.Response:
        """Handle on-demand capability query."""
        # Allow overriding namespace per-request
        saved_ns = self.robot_namespace
        if request.robot_namespace:
            self.robot_namespace = request.robot_namespace

        try:
            response.manifest = self._build_manifest()
            response.success = True
            response.error_message = ""
        except Exception as e:
            response.success = False
            response.error_message = str(e)
        finally:
            self.robot_namespace = saved_ns

        return response

    def _build_manifest(self) -> CapabilityManifest:
        """Query the ROS2 graph and build a CapabilityManifest message."""
        manifest = CapabilityManifest()
        manifest.robot_name = self.robot_name
        manifest.robot_namespace = self.robot_namespace
        manifest.stamp = self.get_clock().now().to_msg()

        ns_prefix = self.robot_namespace if self.robot_namespace else ""

        # Discover topics
        for name, types in self.get_topic_names_and_types():
            if not self._should_include(name, ns_prefix):
                continue
            manifest.topic_names.append(name)
            manifest.topic_types.append(types[0] if types else "")

        # Discover services
        for name, types in self.get_service_names_and_types():
            if not self._should_include(name, ns_prefix):
                continue
            manifest.service_names.append(name)
            manifest.service_types.append(types[0] if types else "")

        # Discover actions — heuristic: look for */_action/feedback topics
        feedback_suffix = "/_action/feedback"
        for name, types in self.get_topic_names_and_types():
            if name.endswith(feedback_suffix):
                action_name = name[: -len(feedback_suffix)]
                if not self._should_include(action_name, ns_prefix):
                    continue
                action_type = types[0] if types else ""
                # Convert feedback type to action type
                if action_type.endswith("_FeedbackMessage"):
                    action_type = action_type[: -len("_FeedbackMessage")]
                manifest.action_names.append(action_name)
                manifest.action_types.append(action_type)

        return manifest

    def _should_include(self, name: str, ns_prefix: str) -> bool:
        """Check if a topic/service/action should be included in the manifest."""
        # Filter by namespace if set
        if ns_prefix and not name.startswith(ns_prefix):
            return False

        # Exclude ROS2 internal topics
        for prefix in _INTERNAL_PREFIXES:
            if name.startswith(prefix):
                return False

        return True


def main() -> None:
    """Entry point for the discovery node."""
    rclpy.init()
    node = DiscoveryNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
