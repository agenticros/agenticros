#[cfg(feature = "serde")]
use serde::{Deserialize, Serialize};



// Corresponds to agenticros_msgs__msg__CapabilityManifest

// This struct is not documented.
#[allow(missing_docs)]

#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct CapabilityManifest {

    // This member is not documented.
    #[allow(missing_docs)]
    pub robot_name: std::string::String,


    // This member is not documented.
    #[allow(missing_docs)]
    pub robot_namespace: std::string::String,


    // This member is not documented.
    #[allow(missing_docs)]
    pub topic_names: Vec<std::string::String>,


    // This member is not documented.
    #[allow(missing_docs)]
    pub topic_types: Vec<std::string::String>,


    // This member is not documented.
    #[allow(missing_docs)]
    pub service_names: Vec<std::string::String>,


    // This member is not documented.
    #[allow(missing_docs)]
    pub service_types: Vec<std::string::String>,


    // This member is not documented.
    #[allow(missing_docs)]
    pub action_names: Vec<std::string::String>,


    // This member is not documented.
    #[allow(missing_docs)]
    pub action_types: Vec<std::string::String>,


    // This member is not documented.
    #[allow(missing_docs)]
    pub stamp: builtin_interfaces::msg::Time,

}



impl Default for CapabilityManifest {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::msg::rmw::CapabilityManifest::default())
  }
}

impl rosidl_runtime_rs::Message for CapabilityManifest {
  type RmwMsg = super::msg::rmw::CapabilityManifest;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        robot_name: msg.robot_name.as_str().into(),
        robot_namespace: msg.robot_namespace.as_str().into(),
        topic_names: msg.topic_names
          .into_iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        topic_types: msg.topic_types
          .into_iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        service_names: msg.service_names
          .into_iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        service_types: msg.service_types
          .into_iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        action_names: msg.action_names
          .into_iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        action_types: msg.action_types
          .into_iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        stamp: builtin_interfaces::msg::Time::into_rmw_message(std::borrow::Cow::Owned(msg.stamp)).into_owned(),
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        robot_name: msg.robot_name.as_str().into(),
        robot_namespace: msg.robot_namespace.as_str().into(),
        topic_names: msg.topic_names
          .iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        topic_types: msg.topic_types
          .iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        service_names: msg.service_names
          .iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        service_types: msg.service_types
          .iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        action_names: msg.action_names
          .iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        action_types: msg.action_types
          .iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        stamp: builtin_interfaces::msg::Time::into_rmw_message(std::borrow::Cow::Borrowed(&msg.stamp)).into_owned(),
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      robot_name: msg.robot_name.to_string(),
      robot_namespace: msg.robot_namespace.to_string(),
      topic_names: msg.topic_names
          .into_iter()
          .map(|elem| elem.to_string())
          .collect(),
      topic_types: msg.topic_types
          .into_iter()
          .map(|elem| elem.to_string())
          .collect(),
      service_names: msg.service_names
          .into_iter()
          .map(|elem| elem.to_string())
          .collect(),
      service_types: msg.service_types
          .into_iter()
          .map(|elem| elem.to_string())
          .collect(),
      action_names: msg.action_names
          .into_iter()
          .map(|elem| elem.to_string())
          .collect(),
      action_types: msg.action_types
          .into_iter()
          .map(|elem| elem.to_string())
          .collect(),
      stamp: builtin_interfaces::msg::Time::from_rmw_message(msg.stamp),
    }
  }
}


// Corresponds to agenticros_msgs__msg__RobotInfo
/// Phase 1.e robot heartbeat — published on `<namespace>/agenticros/robot_info`
/// by agenticros_discovery at 1 Hz. Mirrors the TS-side RobotEntry shape so
/// the discovery service can self-advertise without TS-side static config,
/// and so a future Phase 4 ACP/A2A agent-card payload is a strict superset
/// of these fields. See docs/strategy-ai-agents-plus-ros.md §4(d).
///
/// Required fields are at the top. Optional fields (sensors, battery, pose)
/// are below — Phase 1.e ships id/name/kind/namespace/capabilities/sensors
/// and leaves the others as forward-compatible placeholders so consumers
/// don't have to handle a schema bump for Phase 3 spatial memory.

#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct RobotInfo {
    /// Stable, human-readable identifier — the same `id` the TS side uses as
    /// `robot_id` in tool calls (`ros2_publish(robot_id, …)`). Falls back to
    /// `robot_namespace` when not set.
    pub id: std::string::String,

    /// Display name shown to users / the chat agent (e.g. "Kitchen Bot").
    pub name: std::string::String,

    /// Robot kind — "amr" | "arm" | "drone" | "rover" | (free-form). Used by
    /// `ros2_find_robots_for(kind=…)` to partition heterogeneous fleets.
    pub kind: std::string::String,

    /// ROS2 topic namespace prefix (e.g. "robot3946b404…"). Without leading
    /// slash — consumers prepend "/" + this when computing topic paths.
    pub robot_namespace: std::string::String,

    /// Capability ids the robot advertises (matches the verbs returned by
    /// `ros2_list_capabilities`, e.g. "drive_base", "follow_person",
    /// "arm_grasp"). When empty, consumers fall back to the gateway-wide
    /// global registry — same precedence as the TS-side per-robot allowlist.
    pub capability_ids: Vec<std::string::String>,

    /// Sensor / hardware flags. Three slots match the Phase 1.e schema; add
    /// new ones additively (default-false at the consumer when absent) so old
    /// subscribers don't break.
    pub has_realsense: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub has_lidar: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub has_arm: bool,

    /// Heartbeat timestamp — consumers treat the robot as offline when the
    /// last observed stamp is older than ~5 s (per the strategy memo's
    /// "1 Hz + 5 s staleness window" recommendation).
    pub stamp: builtin_interfaces::msg::Time,

}



impl Default for RobotInfo {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::msg::rmw::RobotInfo::default())
  }
}

impl rosidl_runtime_rs::Message for RobotInfo {
  type RmwMsg = super::msg::rmw::RobotInfo;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        id: msg.id.as_str().into(),
        name: msg.name.as_str().into(),
        kind: msg.kind.as_str().into(),
        robot_namespace: msg.robot_namespace.as_str().into(),
        capability_ids: msg.capability_ids
          .into_iter()
          .map(|elem| elem.as_str().into())
          .collect(),
        has_realsense: msg.has_realsense,
        has_lidar: msg.has_lidar,
        has_arm: msg.has_arm,
        stamp: builtin_interfaces::msg::Time::into_rmw_message(std::borrow::Cow::Owned(msg.stamp)).into_owned(),
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        id: msg.id.as_str().into(),
        name: msg.name.as_str().into(),
        kind: msg.kind.as_str().into(),
        robot_namespace: msg.robot_namespace.as_str().into(),
        capability_ids: msg.capability_ids
          .iter()
          .map(|elem| elem.as_str().into())
          .collect(),
      has_realsense: msg.has_realsense,
      has_lidar: msg.has_lidar,
      has_arm: msg.has_arm,
        stamp: builtin_interfaces::msg::Time::into_rmw_message(std::borrow::Cow::Borrowed(&msg.stamp)).into_owned(),
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      id: msg.id.to_string(),
      name: msg.name.to_string(),
      kind: msg.kind.to_string(),
      robot_namespace: msg.robot_namespace.to_string(),
      capability_ids: msg.capability_ids
          .into_iter()
          .map(|elem| elem.to_string())
          .collect(),
      has_realsense: msg.has_realsense,
      has_lidar: msg.has_lidar,
      has_arm: msg.has_arm,
      stamp: builtin_interfaces::msg::Time::from_rmw_message(msg.stamp),
    }
  }
}


