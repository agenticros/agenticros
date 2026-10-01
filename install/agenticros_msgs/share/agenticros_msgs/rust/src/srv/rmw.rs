#[cfg(feature = "serde")]
use serde::{Deserialize, Serialize};



#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__GetCapabilities_Request() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__srv__GetCapabilities_Request__init(msg: *mut GetCapabilities_Request) -> bool;
    fn agenticros_msgs__srv__GetCapabilities_Request__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<GetCapabilities_Request>, size: usize) -> bool;
    fn agenticros_msgs__srv__GetCapabilities_Request__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<GetCapabilities_Request>);
    fn agenticros_msgs__srv__GetCapabilities_Request__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<GetCapabilities_Request>, out_seq: *mut rosidl_runtime_rs::Sequence<GetCapabilities_Request>) -> bool;
}

// Corresponds to agenticros_msgs__srv__GetCapabilities_Request
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct GetCapabilities_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub robot_namespace: rosidl_runtime_rs::String,

}



impl Default for GetCapabilities_Request {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__srv__GetCapabilities_Request__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__srv__GetCapabilities_Request__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for GetCapabilities_Request {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__GetCapabilities_Request__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__GetCapabilities_Request__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__GetCapabilities_Request__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for GetCapabilities_Request {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for GetCapabilities_Request where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/srv/GetCapabilities_Request";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__GetCapabilities_Request() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__GetCapabilities_Response() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__srv__GetCapabilities_Response__init(msg: *mut GetCapabilities_Response) -> bool;
    fn agenticros_msgs__srv__GetCapabilities_Response__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<GetCapabilities_Response>, size: usize) -> bool;
    fn agenticros_msgs__srv__GetCapabilities_Response__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<GetCapabilities_Response>);
    fn agenticros_msgs__srv__GetCapabilities_Response__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<GetCapabilities_Response>, out_seq: *mut rosidl_runtime_rs::Sequence<GetCapabilities_Response>) -> bool;
}

// Corresponds to agenticros_msgs__srv__GetCapabilities_Response
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct GetCapabilities_Response {

    // This member is not documented.
    #[allow(missing_docs)]
    pub manifest: super::super::msg::rmw::CapabilityManifest,


    // This member is not documented.
    #[allow(missing_docs)]
    pub success: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub error_message: rosidl_runtime_rs::String,

}



impl Default for GetCapabilities_Response {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__srv__GetCapabilities_Response__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__srv__GetCapabilities_Response__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for GetCapabilities_Response {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__GetCapabilities_Response__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__GetCapabilities_Response__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__GetCapabilities_Response__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for GetCapabilities_Response {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for GetCapabilities_Response where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/srv/GetCapabilities_Response";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__GetCapabilities_Response() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeStart_Request() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__srv__FollowMeStart_Request__init(msg: *mut FollowMeStart_Request) -> bool;
    fn agenticros_msgs__srv__FollowMeStart_Request__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<FollowMeStart_Request>, size: usize) -> bool;
    fn agenticros_msgs__srv__FollowMeStart_Request__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<FollowMeStart_Request>);
    fn agenticros_msgs__srv__FollowMeStart_Request__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<FollowMeStart_Request>, out_seq: *mut rosidl_runtime_rs::Sequence<FollowMeStart_Request>) -> bool;
}

// Corresponds to agenticros_msgs__srv__FollowMeStart_Request
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeStart_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub target_description: rosidl_runtime_rs::String,

}



impl Default for FollowMeStart_Request {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__srv__FollowMeStart_Request__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__srv__FollowMeStart_Request__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for FollowMeStart_Request {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeStart_Request__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeStart_Request__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeStart_Request__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for FollowMeStart_Request {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for FollowMeStart_Request where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/srv/FollowMeStart_Request";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeStart_Request() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeStart_Response() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__srv__FollowMeStart_Response__init(msg: *mut FollowMeStart_Response) -> bool;
    fn agenticros_msgs__srv__FollowMeStart_Response__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<FollowMeStart_Response>, size: usize) -> bool;
    fn agenticros_msgs__srv__FollowMeStart_Response__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<FollowMeStart_Response>);
    fn agenticros_msgs__srv__FollowMeStart_Response__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<FollowMeStart_Response>, out_seq: *mut rosidl_runtime_rs::Sequence<FollowMeStart_Response>) -> bool;
}

// Corresponds to agenticros_msgs__srv__FollowMeStart_Response
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeStart_Response {

    // This member is not documented.
    #[allow(missing_docs)]
    pub success: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub message: rosidl_runtime_rs::String,

}



impl Default for FollowMeStart_Response {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__srv__FollowMeStart_Response__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__srv__FollowMeStart_Response__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for FollowMeStart_Response {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeStart_Response__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeStart_Response__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeStart_Response__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for FollowMeStart_Response {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for FollowMeStart_Response where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/srv/FollowMeStart_Response";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeStart_Response() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeStop_Request() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__srv__FollowMeStop_Request__init(msg: *mut FollowMeStop_Request) -> bool;
    fn agenticros_msgs__srv__FollowMeStop_Request__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<FollowMeStop_Request>, size: usize) -> bool;
    fn agenticros_msgs__srv__FollowMeStop_Request__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<FollowMeStop_Request>);
    fn agenticros_msgs__srv__FollowMeStop_Request__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<FollowMeStop_Request>, out_seq: *mut rosidl_runtime_rs::Sequence<FollowMeStop_Request>) -> bool;
}

// Corresponds to agenticros_msgs__srv__FollowMeStop_Request
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeStop_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub structure_needs_at_least_one_member: u8,

}



impl Default for FollowMeStop_Request {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__srv__FollowMeStop_Request__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__srv__FollowMeStop_Request__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for FollowMeStop_Request {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeStop_Request__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeStop_Request__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeStop_Request__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for FollowMeStop_Request {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for FollowMeStop_Request where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/srv/FollowMeStop_Request";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeStop_Request() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeStop_Response() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__srv__FollowMeStop_Response__init(msg: *mut FollowMeStop_Response) -> bool;
    fn agenticros_msgs__srv__FollowMeStop_Response__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<FollowMeStop_Response>, size: usize) -> bool;
    fn agenticros_msgs__srv__FollowMeStop_Response__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<FollowMeStop_Response>);
    fn agenticros_msgs__srv__FollowMeStop_Response__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<FollowMeStop_Response>, out_seq: *mut rosidl_runtime_rs::Sequence<FollowMeStop_Response>) -> bool;
}

// Corresponds to agenticros_msgs__srv__FollowMeStop_Response
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeStop_Response {

    // This member is not documented.
    #[allow(missing_docs)]
    pub success: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub message: rosidl_runtime_rs::String,

}



impl Default for FollowMeStop_Response {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__srv__FollowMeStop_Response__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__srv__FollowMeStop_Response__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for FollowMeStop_Response {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeStop_Response__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeStop_Response__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeStop_Response__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for FollowMeStop_Response {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for FollowMeStop_Response where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/srv/FollowMeStop_Response";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeStop_Response() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeSetDistance_Request() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__srv__FollowMeSetDistance_Request__init(msg: *mut FollowMeSetDistance_Request) -> bool;
    fn agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<FollowMeSetDistance_Request>, size: usize) -> bool;
    fn agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<FollowMeSetDistance_Request>);
    fn agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<FollowMeSetDistance_Request>, out_seq: *mut rosidl_runtime_rs::Sequence<FollowMeSetDistance_Request>) -> bool;
}

// Corresponds to agenticros_msgs__srv__FollowMeSetDistance_Request
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeSetDistance_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub distance: f32,

}



impl Default for FollowMeSetDistance_Request {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__srv__FollowMeSetDistance_Request__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__srv__FollowMeSetDistance_Request__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for FollowMeSetDistance_Request {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for FollowMeSetDistance_Request {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for FollowMeSetDistance_Request where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/srv/FollowMeSetDistance_Request";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeSetDistance_Request() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeSetDistance_Response() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__srv__FollowMeSetDistance_Response__init(msg: *mut FollowMeSetDistance_Response) -> bool;
    fn agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<FollowMeSetDistance_Response>, size: usize) -> bool;
    fn agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<FollowMeSetDistance_Response>);
    fn agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<FollowMeSetDistance_Response>, out_seq: *mut rosidl_runtime_rs::Sequence<FollowMeSetDistance_Response>) -> bool;
}

// Corresponds to agenticros_msgs__srv__FollowMeSetDistance_Response
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
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
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__srv__FollowMeSetDistance_Response__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__srv__FollowMeSetDistance_Response__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for FollowMeSetDistance_Response {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for FollowMeSetDistance_Response {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for FollowMeSetDistance_Response where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/srv/FollowMeSetDistance_Response";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeSetDistance_Response() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeGetStatus_Request() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__srv__FollowMeGetStatus_Request__init(msg: *mut FollowMeGetStatus_Request) -> bool;
    fn agenticros_msgs__srv__FollowMeGetStatus_Request__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<FollowMeGetStatus_Request>, size: usize) -> bool;
    fn agenticros_msgs__srv__FollowMeGetStatus_Request__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<FollowMeGetStatus_Request>);
    fn agenticros_msgs__srv__FollowMeGetStatus_Request__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<FollowMeGetStatus_Request>, out_seq: *mut rosidl_runtime_rs::Sequence<FollowMeGetStatus_Request>) -> bool;
}

// Corresponds to agenticros_msgs__srv__FollowMeGetStatus_Request
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeGetStatus_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub structure_needs_at_least_one_member: u8,

}



impl Default for FollowMeGetStatus_Request {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__srv__FollowMeGetStatus_Request__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__srv__FollowMeGetStatus_Request__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for FollowMeGetStatus_Request {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeGetStatus_Request__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeGetStatus_Request__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeGetStatus_Request__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for FollowMeGetStatus_Request {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for FollowMeGetStatus_Request where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/srv/FollowMeGetStatus_Request";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeGetStatus_Request() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeGetStatus_Response() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__srv__FollowMeGetStatus_Response__init(msg: *mut FollowMeGetStatus_Response) -> bool;
    fn agenticros_msgs__srv__FollowMeGetStatus_Response__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<FollowMeGetStatus_Response>, size: usize) -> bool;
    fn agenticros_msgs__srv__FollowMeGetStatus_Response__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<FollowMeGetStatus_Response>);
    fn agenticros_msgs__srv__FollowMeGetStatus_Response__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<FollowMeGetStatus_Response>, out_seq: *mut rosidl_runtime_rs::Sequence<FollowMeGetStatus_Response>) -> bool;
}

// Corresponds to agenticros_msgs__srv__FollowMeGetStatus_Response
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
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
    pub target_description: rosidl_runtime_rs::String,


    // This member is not documented.
    #[allow(missing_docs)]
    pub persons_detected: i32,


    // This member is not documented.
    #[allow(missing_docs)]
    pub twist: geometry_msgs::msg::rmw::Twist,


    // This member is not documented.
    #[allow(missing_docs)]
    pub error_message: rosidl_runtime_rs::String,

}



impl Default for FollowMeGetStatus_Response {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__srv__FollowMeGetStatus_Response__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__srv__FollowMeGetStatus_Response__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for FollowMeGetStatus_Response {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeGetStatus_Response__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeGetStatus_Response__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeGetStatus_Response__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for FollowMeGetStatus_Response {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for FollowMeGetStatus_Response where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/srv/FollowMeGetStatus_Response";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeGetStatus_Response() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeSetTarget_Request() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__srv__FollowMeSetTarget_Request__init(msg: *mut FollowMeSetTarget_Request) -> bool;
    fn agenticros_msgs__srv__FollowMeSetTarget_Request__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<FollowMeSetTarget_Request>, size: usize) -> bool;
    fn agenticros_msgs__srv__FollowMeSetTarget_Request__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<FollowMeSetTarget_Request>);
    fn agenticros_msgs__srv__FollowMeSetTarget_Request__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<FollowMeSetTarget_Request>, out_seq: *mut rosidl_runtime_rs::Sequence<FollowMeSetTarget_Request>) -> bool;
}

// Corresponds to agenticros_msgs__srv__FollowMeSetTarget_Request
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct FollowMeSetTarget_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub description: rosidl_runtime_rs::String,

}



impl Default for FollowMeSetTarget_Request {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__srv__FollowMeSetTarget_Request__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__srv__FollowMeSetTarget_Request__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for FollowMeSetTarget_Request {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeSetTarget_Request__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeSetTarget_Request__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeSetTarget_Request__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for FollowMeSetTarget_Request {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for FollowMeSetTarget_Request where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/srv/FollowMeSetTarget_Request";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeSetTarget_Request() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeSetTarget_Response() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__srv__FollowMeSetTarget_Response__init(msg: *mut FollowMeSetTarget_Response) -> bool;
    fn agenticros_msgs__srv__FollowMeSetTarget_Response__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<FollowMeSetTarget_Response>, size: usize) -> bool;
    fn agenticros_msgs__srv__FollowMeSetTarget_Response__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<FollowMeSetTarget_Response>);
    fn agenticros_msgs__srv__FollowMeSetTarget_Response__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<FollowMeSetTarget_Response>, out_seq: *mut rosidl_runtime_rs::Sequence<FollowMeSetTarget_Response>) -> bool;
}

// Corresponds to agenticros_msgs__srv__FollowMeSetTarget_Response
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
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
    pub message: rosidl_runtime_rs::String,

}



impl Default for FollowMeSetTarget_Response {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__srv__FollowMeSetTarget_Response__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__srv__FollowMeSetTarget_Response__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for FollowMeSetTarget_Response {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeSetTarget_Response__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeSetTarget_Response__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__srv__FollowMeSetTarget_Response__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for FollowMeSetTarget_Response {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for FollowMeSetTarget_Response where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/srv/FollowMeSetTarget_Response";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__srv__FollowMeSetTarget_Response() }
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


