#[cfg(feature = "serde")]
use serde::{Deserialize, Serialize};


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__msg__CapabilityManifest() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__msg__CapabilityManifest__init(msg: *mut CapabilityManifest) -> bool;
    fn agenticros_msgs__msg__CapabilityManifest__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<CapabilityManifest>, size: usize) -> bool;
    fn agenticros_msgs__msg__CapabilityManifest__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<CapabilityManifest>);
    fn agenticros_msgs__msg__CapabilityManifest__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<CapabilityManifest>, out_seq: *mut rosidl_runtime_rs::Sequence<CapabilityManifest>) -> bool;
}

// Corresponds to agenticros_msgs__msg__CapabilityManifest
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct CapabilityManifest {

    // This member is not documented.
    #[allow(missing_docs)]
    pub robot_name: rosidl_runtime_rs::String,


    // This member is not documented.
    #[allow(missing_docs)]
    pub robot_namespace: rosidl_runtime_rs::String,


    // This member is not documented.
    #[allow(missing_docs)]
    pub topic_names: rosidl_runtime_rs::Sequence<rosidl_runtime_rs::String>,


    // This member is not documented.
    #[allow(missing_docs)]
    pub topic_types: rosidl_runtime_rs::Sequence<rosidl_runtime_rs::String>,


    // This member is not documented.
    #[allow(missing_docs)]
    pub service_names: rosidl_runtime_rs::Sequence<rosidl_runtime_rs::String>,


    // This member is not documented.
    #[allow(missing_docs)]
    pub service_types: rosidl_runtime_rs::Sequence<rosidl_runtime_rs::String>,


    // This member is not documented.
    #[allow(missing_docs)]
    pub action_names: rosidl_runtime_rs::Sequence<rosidl_runtime_rs::String>,


    // This member is not documented.
    #[allow(missing_docs)]
    pub action_types: rosidl_runtime_rs::Sequence<rosidl_runtime_rs::String>,


    // This member is not documented.
    #[allow(missing_docs)]
    pub stamp: builtin_interfaces::msg::rmw::Time,

}



impl Default for CapabilityManifest {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__msg__CapabilityManifest__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__msg__CapabilityManifest__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for CapabilityManifest {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__msg__CapabilityManifest__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__msg__CapabilityManifest__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__msg__CapabilityManifest__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for CapabilityManifest {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for CapabilityManifest where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/msg/CapabilityManifest";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__msg__CapabilityManifest() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__msg__RobotInfo() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__msg__RobotInfo__init(msg: *mut RobotInfo) -> bool;
    fn agenticros_msgs__msg__RobotInfo__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<RobotInfo>, size: usize) -> bool;
    fn agenticros_msgs__msg__RobotInfo__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<RobotInfo>);
    fn agenticros_msgs__msg__RobotInfo__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<RobotInfo>, out_seq: *mut rosidl_runtime_rs::Sequence<RobotInfo>) -> bool;
}

// Corresponds to agenticros_msgs__msg__RobotInfo
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]

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

#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct RobotInfo {
    /// Stable, human-readable identifier — the same `id` the TS side uses as
    /// `robot_id` in tool calls (`ros2_publish(robot_id, …)`). Falls back to
    /// `robot_namespace` when not set.
    pub id: rosidl_runtime_rs::String,

    /// Display name shown to users / the chat agent (e.g. "Kitchen Bot").
    pub name: rosidl_runtime_rs::String,

    /// Robot kind — "amr" | "arm" | "drone" | "rover" | (free-form). Used by
    /// `ros2_find_robots_for(kind=…)` to partition heterogeneous fleets.
    pub kind: rosidl_runtime_rs::String,

    /// ROS2 topic namespace prefix (e.g. "robot3946b404…"). Without leading
    /// slash — consumers prepend "/" + this when computing topic paths.
    pub robot_namespace: rosidl_runtime_rs::String,

    /// Capability ids the robot advertises (matches the verbs returned by
    /// `ros2_list_capabilities`, e.g. "drive_base", "follow_person",
    /// "arm_grasp"). When empty, consumers fall back to the gateway-wide
    /// global registry — same precedence as the TS-side per-robot allowlist.
    pub capability_ids: rosidl_runtime_rs::Sequence<rosidl_runtime_rs::String>,

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
    pub stamp: builtin_interfaces::msg::rmw::Time,

}



impl Default for RobotInfo {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__msg__RobotInfo__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__msg__RobotInfo__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for RobotInfo {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__msg__RobotInfo__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__msg__RobotInfo__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__msg__RobotInfo__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for RobotInfo {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for RobotInfo where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/msg/RobotInfo";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__msg__RobotInfo() }
  }
}


