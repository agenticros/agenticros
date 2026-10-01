#[cfg(feature = "serde")]
use serde::{Deserialize, Serialize};




// Corresponds to agenticros_msgs__srv__GetCapabilities_Request

// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct GetCapabilities_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub robot_namespace: std::string::String,

}



impl Default for GetCapabilities_Request {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::srv::rmw::GetCapabilities_Request::default())
  }
}

impl rosidl_runtime_rs::Message for GetCapabilities_Request {
  type RmwMsg = super::srv::rmw::GetCapabilities_Request;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        robot_namespace: msg.robot_namespace.as_str().into(),
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        robot_namespace: msg.robot_namespace.as_str().into(),
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      robot_namespace: msg.robot_namespace.to_string(),
    }
  }
}


// Corresponds to agenticros_msgs__srv__GetCapabilities_Response

// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct GetCapabilities_Response {

    // This member is not documented.
    #[allow(missing_docs)]
    pub manifest: super::msg::CapabilityManifest,


    // This member is not documented.
    #[allow(missing_docs)]
    pub success: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub error_message: std::string::String,

}



impl Default for GetCapabilities_Response {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::srv::rmw::GetCapabilities_Response::default())
  }
}

impl rosidl_runtime_rs::Message for GetCapabilities_Response {
  type RmwMsg = super::srv::rmw::GetCapabilities_Response;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        manifest: super::msg::CapabilityManifest::into_rmw_message(std::borrow::Cow::Owned(msg.manifest)).into_owned(),
        success: msg.success,
        error_message: msg.error_message.as_str().into(),
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        manifest: super::msg::CapabilityManifest::into_rmw_message(std::borrow::Cow::Borrowed(&msg.manifest)).into_owned(),
      success: msg.success,
        error_message: msg.error_message.as_str().into(),
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      manifest: super::msg::CapabilityManifest::from_rmw_message(msg.manifest),
      success: msg.success,
      error_message: msg.error_message.to_string(),
    }
  }
}


// Corresponds to agenticros_msgs__srv__FollowMeStart_Request

// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeStart_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub target_description: std::string::String,

}



impl Default for FollowMeStart_Request {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::srv::rmw::FollowMeStart_Request::default())
  }
}

impl rosidl_runtime_rs::Message for FollowMeStart_Request {
  type RmwMsg = super::srv::rmw::FollowMeStart_Request;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        target_description: msg.target_description.as_str().into(),
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        target_description: msg.target_description.as_str().into(),
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      target_description: msg.target_description.to_string(),
    }
  }
}


// Corresponds to agenticros_msgs__srv__FollowMeStart_Response

// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeStart_Response {

    // This member is not documented.
    #[allow(missing_docs)]
    pub success: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub message: std::string::String,

}



impl Default for FollowMeStart_Response {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::srv::rmw::FollowMeStart_Response::default())
  }
}

impl rosidl_runtime_rs::Message for FollowMeStart_Response {
  type RmwMsg = super::srv::rmw::FollowMeStart_Response;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        success: msg.success,
        message: msg.message.as_str().into(),
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
      success: msg.success,
        message: msg.message.as_str().into(),
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      success: msg.success,
      message: msg.message.to_string(),
    }
  }
}


// Corresponds to agenticros_msgs__srv__FollowMeStop_Request

// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeStop_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub structure_needs_at_least_one_member: u8,

}



impl Default for FollowMeStop_Request {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::srv::rmw::FollowMeStop_Request::default())
  }
}

impl rosidl_runtime_rs::Message for FollowMeStop_Request {
  type RmwMsg = super::srv::rmw::FollowMeStop_Request;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        structure_needs_at_least_one_member: msg.structure_needs_at_least_one_member,
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
      structure_needs_at_least_one_member: msg.structure_needs_at_least_one_member,
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      structure_needs_at_least_one_member: msg.structure_needs_at_least_one_member,
    }
  }
}


// Corresponds to agenticros_msgs__srv__FollowMeStop_Response

// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeStop_Response {

    // This member is not documented.
    #[allow(missing_docs)]
    pub success: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub message: std::string::String,

}



impl Default for FollowMeStop_Response {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::srv::rmw::FollowMeStop_Response::default())
  }
}

impl rosidl_runtime_rs::Message for FollowMeStop_Response {
  type RmwMsg = super::srv::rmw::FollowMeStop_Response;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        success: msg.success,
        message: msg.message.as_str().into(),
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
      success: msg.success,
        message: msg.message.as_str().into(),
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      success: msg.success,
      message: msg.message.to_string(),
    }
  }
}


// Corresponds to agenticros_msgs__srv__FollowMeSetDistance_Request

// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeSetDistance_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub distance: f32,

}



impl Default for FollowMeSetDistance_Request {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::srv::rmw::FollowMeSetDistance_Request::default())
  }
}

impl rosidl_runtime_rs::Message for FollowMeSetDistance_Request {
  type RmwMsg = super::srv::rmw::FollowMeSetDistance_Request;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        distance: msg.distance,
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
      distance: msg.distance,
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      distance: msg.distance,
    }
  }
}


// Corresponds to agenticros_msgs__srv__FollowMeSetDistance_Response

// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeSetDistance_Response {

    // This member is not documented.
    #[allow(missing_docs)]
    pub success: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub target_distance: f32,

}



impl Default for FollowMeSetDistance_Response {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::srv::rmw::FollowMeSetDistance_Response::default())
  }
}

impl rosidl_runtime_rs::Message for FollowMeSetDistance_Response {
  type RmwMsg = super::srv::rmw::FollowMeSetDistance_Response;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        success: msg.success,
        target_distance: msg.target_distance,
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
      success: msg.success,
      target_distance: msg.target_distance,
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      success: msg.success,
      target_distance: msg.target_distance,
    }
  }
}


// Corresponds to agenticros_msgs__srv__FollowMeGetStatus_Request

// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeGetStatus_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub structure_needs_at_least_one_member: u8,

}



impl Default for FollowMeGetStatus_Request {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::srv::rmw::FollowMeGetStatus_Request::default())
  }
}

impl rosidl_runtime_rs::Message for FollowMeGetStatus_Request {
  type RmwMsg = super::srv::rmw::FollowMeGetStatus_Request;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        structure_needs_at_least_one_member: msg.structure_needs_at_least_one_member,
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
      structure_needs_at_least_one_member: msg.structure_needs_at_least_one_member,
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      structure_needs_at_least_one_member: msg.structure_needs_at_least_one_member,
    }
  }
}


// Corresponds to agenticros_msgs__srv__FollowMeGetStatus_Response

// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeGetStatus_Response {

    // This member is not documented.
    #[allow(missing_docs)]
    pub success: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub enabled: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub tracking: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub target_distance: f32,


    // This member is not documented.
    #[allow(missing_docs)]
    pub current_distance: f32,


    // This member is not documented.
    #[allow(missing_docs)]
    pub target_person_id: i32,


    // This member is not documented.
    #[allow(missing_docs)]
    pub target_description: std::string::String,


    // This member is not documented.
    #[allow(missing_docs)]
    pub persons_detected: i32,


    // This member is not documented.
    #[allow(missing_docs)]
    pub twist: geometry_msgs::msg::Twist,


    // This member is not documented.
    #[allow(missing_docs)]
    pub error_message: std::string::String,

}



impl Default for FollowMeGetStatus_Response {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::srv::rmw::FollowMeGetStatus_Response::default())
  }
}

impl rosidl_runtime_rs::Message for FollowMeGetStatus_Response {
  type RmwMsg = super::srv::rmw::FollowMeGetStatus_Response;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        success: msg.success,
        enabled: msg.enabled,
        tracking: msg.tracking,
        target_distance: msg.target_distance,
        current_distance: msg.current_distance,
        target_person_id: msg.target_person_id,
        target_description: msg.target_description.as_str().into(),
        persons_detected: msg.persons_detected,
        twist: geometry_msgs::msg::Twist::into_rmw_message(std::borrow::Cow::Owned(msg.twist)).into_owned(),
        error_message: msg.error_message.as_str().into(),
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
      success: msg.success,
      enabled: msg.enabled,
      tracking: msg.tracking,
      target_distance: msg.target_distance,
      current_distance: msg.current_distance,
      target_person_id: msg.target_person_id,
        target_description: msg.target_description.as_str().into(),
      persons_detected: msg.persons_detected,
        twist: geometry_msgs::msg::Twist::into_rmw_message(std::borrow::Cow::Borrowed(&msg.twist)).into_owned(),
        error_message: msg.error_message.as_str().into(),
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      success: msg.success,
      enabled: msg.enabled,
      tracking: msg.tracking,
      target_distance: msg.target_distance,
      current_distance: msg.current_distance,
      target_person_id: msg.target_person_id,
      target_description: msg.target_description.to_string(),
      persons_detected: msg.persons_detected,
      twist: geometry_msgs::msg::Twist::from_rmw_message(msg.twist),
      error_message: msg.error_message.to_string(),
    }
  }
}


// Corresponds to agenticros_msgs__srv__FollowMeSetTarget_Request

// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeSetTarget_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub description: std::string::String,

}



impl Default for FollowMeSetTarget_Request {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::srv::rmw::FollowMeSetTarget_Request::default())
  }
}

impl rosidl_runtime_rs::Message for FollowMeSetTarget_Request {
  type RmwMsg = super::srv::rmw::FollowMeSetTarget_Request;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        description: msg.description.as_str().into(),
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        description: msg.description.as_str().into(),
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      description: msg.description.to_string(),
    }
  }
}


// Corresponds to agenticros_msgs__srv__FollowMeSetTarget_Response

// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeSetTarget_Response {

    // This member is not documented.
    #[allow(missing_docs)]
    pub success: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub person_id: i32,


    // This member is not documented.
    #[allow(missing_docs)]
    pub confidence: f32,


    // This member is not documented.
    #[allow(missing_docs)]
    pub message: std::string::String,

}



impl Default for FollowMeSetTarget_Response {
  fn default() -> Self {
    <Self as rosidl_runtime_rs::Message>::from_rmw_message(super::srv::rmw::FollowMeSetTarget_Response::default())
  }
}

impl rosidl_runtime_rs::Message for FollowMeSetTarget_Response {
  type RmwMsg = super::srv::rmw::FollowMeSetTarget_Response;

  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> {
    match msg_cow {
      std::borrow::Cow::Owned(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
        success: msg.success,
        person_id: msg.person_id,
        confidence: msg.confidence,
        message: msg.message.as_str().into(),
      }),
      std::borrow::Cow::Borrowed(msg) => std::borrow::Cow::Owned(Self::RmwMsg {
      success: msg.success,
      person_id: msg.person_id,
      confidence: msg.confidence,
        message: msg.message.as_str().into(),
      })
    }
  }

  fn from_rmw_message(msg: Self::RmwMsg) -> Self {
    Self {
      success: msg.success,
      person_id: msg.person_id,
      confidence: msg.confidence,
      message: msg.message.to_string(),
    }
  }
}






#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__srv__GetCapabilities() -> *const std::ffi::c_void;
}

// Corresponds to agenticros_msgs__srv__GetCapabilities
#[allow(missing_docs, non_camel_case_types)]
pub struct GetCapabilities;

impl rosidl_runtime_rs::Service for GetCapabilities {
    type Request = GetCapabilities_Request;
    type Response = GetCapabilities_Response;

    fn get_type_support() -> *const std::ffi::c_void {
        // SAFETY: No preconditions for this function.
        unsafe { rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__srv__GetCapabilities() }
    }
}




#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__srv__FollowMeStart() -> *const std::ffi::c_void;
}

// Corresponds to agenticros_msgs__srv__FollowMeStart
#[allow(missing_docs, non_camel_case_types)]
pub struct FollowMeStart;

impl rosidl_runtime_rs::Service for FollowMeStart {
    type Request = FollowMeStart_Request;
    type Response = FollowMeStart_Response;

    fn get_type_support() -> *const std::ffi::c_void {
        // SAFETY: No preconditions for this function.
        unsafe { rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__srv__FollowMeStart() }
    }
}




#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__srv__FollowMeStop() -> *const std::ffi::c_void;
}

// Corresponds to agenticros_msgs__srv__FollowMeStop
#[allow(missing_docs, non_camel_case_types)]
pub struct FollowMeStop;

impl rosidl_runtime_rs::Service for FollowMeStop {
    type Request = FollowMeStop_Request;
    type Response = FollowMeStop_Response;

    fn get_type_support() -> *const std::ffi::c_void {
        // SAFETY: No preconditions for this function.
        unsafe { rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__srv__FollowMeStop() }
    }
}




#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__srv__FollowMeSetDistance() -> *const std::ffi::c_void;
}

// Corresponds to agenticros_msgs__srv__FollowMeSetDistance
#[allow(missing_docs, non_camel_case_types)]
pub struct FollowMeSetDistance;

impl rosidl_runtime_rs::Service for FollowMeSetDistance {
    type Request = FollowMeSetDistance_Request;
    type Response = FollowMeSetDistance_Response;

    fn get_type_support() -> *const std::ffi::c_void {
        // SAFETY: No preconditions for this function.
        unsafe { rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__srv__FollowMeSetDistance() }
    }
}




#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__srv__FollowMeGetStatus() -> *const std::ffi::c_void;
}

// Corresponds to agenticros_msgs__srv__FollowMeGetStatus
#[allow(missing_docs, non_camel_case_types)]
pub struct FollowMeGetStatus;

impl rosidl_runtime_rs::Service for FollowMeGetStatus {
    type Request = FollowMeGetStatus_Request;
    type Response = FollowMeGetStatus_Response;

    fn get_type_support() -> *const std::ffi::c_void {
        // SAFETY: No preconditions for this function.
        unsafe { rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__srv__FollowMeGetStatus() }
    }
}




#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__srv__FollowMeSetTarget() -> *const std::ffi::c_void;
}

// Corresponds to agenticros_msgs__srv__FollowMeSetTarget
#[allow(missing_docs, non_camel_case_types)]
pub struct FollowMeSetTarget;

impl rosidl_runtime_rs::Service for FollowMeSetTarget {
    type Request = FollowMeSetTarget_Request;
    type Response = FollowMeSetTarget_Response;

    fn get_type_support() -> *const std::ffi::c_void {
        // SAFETY: No preconditions for this function.
        unsafe { rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__srv__FollowMeSetTarget() }
    }
}


