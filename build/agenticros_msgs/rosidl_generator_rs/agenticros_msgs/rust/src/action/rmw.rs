
#[cfg(feature = "serde")]
use serde::{Deserialize, Serialize};


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_Goal() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__action__Explore_Goal__init(msg: *mut Explore_Goal) -> bool;
    fn agenticros_msgs__action__Explore_Goal__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<Explore_Goal>, size: usize) -> bool;
    fn agenticros_msgs__action__Explore_Goal__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<Explore_Goal>);
    fn agenticros_msgs__action__Explore_Goal__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<Explore_Goal>, out_seq: *mut rosidl_runtime_rs::Sequence<Explore_Goal>) -> bool;
}

// Corresponds to agenticros_msgs__action__Explore_Goal
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct Explore_Goal {

    // This member is not documented.
    #[allow(missing_docs)]
    pub mode: rosidl_runtime_rs::String,


    // This member is not documented.
    #[allow(missing_docs)]
    pub timeout_s: f32,


    // This member is not documented.
    #[allow(missing_docs)]
    pub min_frontier_m: f32,


    // This member is not documented.
    #[allow(missing_docs)]
    pub max_goals: i32,

}



impl Default for Explore_Goal {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__action__Explore_Goal__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__action__Explore_Goal__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for Explore_Goal {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_Goal__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_Goal__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_Goal__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for Explore_Goal {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for Explore_Goal where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/action/Explore_Goal";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_Goal() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_Result() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__action__Explore_Result__init(msg: *mut Explore_Result) -> bool;
    fn agenticros_msgs__action__Explore_Result__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<Explore_Result>, size: usize) -> bool;
    fn agenticros_msgs__action__Explore_Result__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<Explore_Result>);
    fn agenticros_msgs__action__Explore_Result__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<Explore_Result>, out_seq: *mut rosidl_runtime_rs::Sequence<Explore_Result>) -> bool;
}

// Corresponds to agenticros_msgs__action__Explore_Result
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct Explore_Result {

    // This member is not documented.
    #[allow(missing_docs)]
    pub success: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub message: rosidl_runtime_rs::String,


    // This member is not documented.
    #[allow(missing_docs)]
    pub coverage_ratio: f32,


    // This member is not documented.
    #[allow(missing_docs)]
    pub goals_sent: u32,

}



impl Default for Explore_Result {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__action__Explore_Result__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__action__Explore_Result__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for Explore_Result {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_Result__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_Result__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_Result__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for Explore_Result {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for Explore_Result where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/action/Explore_Result";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_Result() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_Feedback() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__action__Explore_Feedback__init(msg: *mut Explore_Feedback) -> bool;
    fn agenticros_msgs__action__Explore_Feedback__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<Explore_Feedback>, size: usize) -> bool;
    fn agenticros_msgs__action__Explore_Feedback__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<Explore_Feedback>);
    fn agenticros_msgs__action__Explore_Feedback__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<Explore_Feedback>, out_seq: *mut rosidl_runtime_rs::Sequence<Explore_Feedback>) -> bool;
}

// Corresponds to agenticros_msgs__action__Explore_Feedback
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct Explore_Feedback {

    // This member is not documented.
    #[allow(missing_docs)]
    pub state: rosidl_runtime_rs::String,


    // This member is not documented.
    #[allow(missing_docs)]
    pub coverage_ratio: f32,


    // This member is not documented.
    #[allow(missing_docs)]
    pub goals_sent: u32,


    // This member is not documented.
    #[allow(missing_docs)]
    pub elapsed_s: f32,

}



impl Default for Explore_Feedback {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__action__Explore_Feedback__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__action__Explore_Feedback__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for Explore_Feedback {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_Feedback__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_Feedback__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_Feedback__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for Explore_Feedback {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for Explore_Feedback where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/action/Explore_Feedback";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_Feedback() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_FeedbackMessage() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__action__Explore_FeedbackMessage__init(msg: *mut Explore_FeedbackMessage) -> bool;
    fn agenticros_msgs__action__Explore_FeedbackMessage__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<Explore_FeedbackMessage>, size: usize) -> bool;
    fn agenticros_msgs__action__Explore_FeedbackMessage__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<Explore_FeedbackMessage>);
    fn agenticros_msgs__action__Explore_FeedbackMessage__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<Explore_FeedbackMessage>, out_seq: *mut rosidl_runtime_rs::Sequence<Explore_FeedbackMessage>) -> bool;
}

// Corresponds to agenticros_msgs__action__Explore_FeedbackMessage
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct Explore_FeedbackMessage {

    // This member is not documented.
    #[allow(missing_docs)]
    pub goal_id: unique_identifier_msgs::msg::rmw::UUID,


    // This member is not documented.
    #[allow(missing_docs)]
    pub feedback: super::super::action::rmw::Explore_Feedback,

}



impl Default for Explore_FeedbackMessage {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__action__Explore_FeedbackMessage__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__action__Explore_FeedbackMessage__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for Explore_FeedbackMessage {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_FeedbackMessage__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_FeedbackMessage__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_FeedbackMessage__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for Explore_FeedbackMessage {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for Explore_FeedbackMessage where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/action/Explore_FeedbackMessage";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_FeedbackMessage() }
  }
}




#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_SendGoal_Request() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__action__Explore_SendGoal_Request__init(msg: *mut Explore_SendGoal_Request) -> bool;
    fn agenticros_msgs__action__Explore_SendGoal_Request__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<Explore_SendGoal_Request>, size: usize) -> bool;
    fn agenticros_msgs__action__Explore_SendGoal_Request__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<Explore_SendGoal_Request>);
    fn agenticros_msgs__action__Explore_SendGoal_Request__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<Explore_SendGoal_Request>, out_seq: *mut rosidl_runtime_rs::Sequence<Explore_SendGoal_Request>) -> bool;
}

// Corresponds to agenticros_msgs__action__Explore_SendGoal_Request
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct Explore_SendGoal_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub goal_id: unique_identifier_msgs::msg::rmw::UUID,


    // This member is not documented.
    #[allow(missing_docs)]
    pub goal: super::super::action::rmw::Explore_Goal,

}



impl Default for Explore_SendGoal_Request {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__action__Explore_SendGoal_Request__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__action__Explore_SendGoal_Request__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for Explore_SendGoal_Request {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_SendGoal_Request__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_SendGoal_Request__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_SendGoal_Request__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for Explore_SendGoal_Request {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for Explore_SendGoal_Request where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/action/Explore_SendGoal_Request";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_SendGoal_Request() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_SendGoal_Response() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__action__Explore_SendGoal_Response__init(msg: *mut Explore_SendGoal_Response) -> bool;
    fn agenticros_msgs__action__Explore_SendGoal_Response__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<Explore_SendGoal_Response>, size: usize) -> bool;
    fn agenticros_msgs__action__Explore_SendGoal_Response__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<Explore_SendGoal_Response>);
    fn agenticros_msgs__action__Explore_SendGoal_Response__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<Explore_SendGoal_Response>, out_seq: *mut rosidl_runtime_rs::Sequence<Explore_SendGoal_Response>) -> bool;
}

// Corresponds to agenticros_msgs__action__Explore_SendGoal_Response
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct Explore_SendGoal_Response {

    // This member is not documented.
    #[allow(missing_docs)]
    pub accepted: bool,


    // This member is not documented.
    #[allow(missing_docs)]
    pub stamp: builtin_interfaces::msg::rmw::Time,

}



impl Default for Explore_SendGoal_Response {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__action__Explore_SendGoal_Response__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__action__Explore_SendGoal_Response__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for Explore_SendGoal_Response {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_SendGoal_Response__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_SendGoal_Response__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_SendGoal_Response__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for Explore_SendGoal_Response {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for Explore_SendGoal_Response where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/action/Explore_SendGoal_Response";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_SendGoal_Response() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_GetResult_Request() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__action__Explore_GetResult_Request__init(msg: *mut Explore_GetResult_Request) -> bool;
    fn agenticros_msgs__action__Explore_GetResult_Request__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<Explore_GetResult_Request>, size: usize) -> bool;
    fn agenticros_msgs__action__Explore_GetResult_Request__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<Explore_GetResult_Request>);
    fn agenticros_msgs__action__Explore_GetResult_Request__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<Explore_GetResult_Request>, out_seq: *mut rosidl_runtime_rs::Sequence<Explore_GetResult_Request>) -> bool;
}

// Corresponds to agenticros_msgs__action__Explore_GetResult_Request
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct Explore_GetResult_Request {

    // This member is not documented.
    #[allow(missing_docs)]
    pub goal_id: unique_identifier_msgs::msg::rmw::UUID,

}



impl Default for Explore_GetResult_Request {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__action__Explore_GetResult_Request__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__action__Explore_GetResult_Request__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for Explore_GetResult_Request {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_GetResult_Request__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_GetResult_Request__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_GetResult_Request__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for Explore_GetResult_Request {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for Explore_GetResult_Request where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/action/Explore_GetResult_Request";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_GetResult_Request() }
  }
}


#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_GetResult_Response() -> *const std::ffi::c_void;
}

#[link(name = "agenticros_msgs__rosidl_generator_c")]
extern "C" {
    fn agenticros_msgs__action__Explore_GetResult_Response__init(msg: *mut Explore_GetResult_Response) -> bool;
    fn agenticros_msgs__action__Explore_GetResult_Response__Sequence__init(seq: *mut rosidl_runtime_rs::Sequence<Explore_GetResult_Response>, size: usize) -> bool;
    fn agenticros_msgs__action__Explore_GetResult_Response__Sequence__fini(seq: *mut rosidl_runtime_rs::Sequence<Explore_GetResult_Response>);
    fn agenticros_msgs__action__Explore_GetResult_Response__Sequence__copy(in_seq: &rosidl_runtime_rs::Sequence<Explore_GetResult_Response>, out_seq: *mut rosidl_runtime_rs::Sequence<Explore_GetResult_Response>) -> bool;
}

// Corresponds to agenticros_msgs__action__Explore_GetResult_Response
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]


// This struct is not documented.
#[allow(missing_docs)]

#[allow(non_camel_case_types)]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, PartialOrd)]
pub struct Explore_GetResult_Response {

    // This member is not documented.
    #[allow(missing_docs)]
    pub status: i8,


    // This member is not documented.
    #[allow(missing_docs)]
    pub result: super::super::action::rmw::Explore_Result,

}



impl Default for Explore_GetResult_Response {
  fn default() -> Self {
    unsafe {
      let mut msg = std::mem::zeroed();
      if !agenticros_msgs__action__Explore_GetResult_Response__init(&mut msg as *mut _) {
        panic!("Call to agenticros_msgs__action__Explore_GetResult_Response__init() failed");
      }
      msg
    }
  }
}

impl rosidl_runtime_rs::SequenceAlloc for Explore_GetResult_Response {
  fn sequence_init(seq: &mut rosidl_runtime_rs::Sequence<Self>, size: usize) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_GetResult_Response__Sequence__init(seq as *mut _, size) }
  }
  fn sequence_fini(seq: &mut rosidl_runtime_rs::Sequence<Self>) {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_GetResult_Response__Sequence__fini(seq as *mut _) }
  }
  fn sequence_copy(in_seq: &rosidl_runtime_rs::Sequence<Self>, out_seq: &mut rosidl_runtime_rs::Sequence<Self>) -> bool {
    // SAFETY: This is safe since the pointer is guaranteed to be valid/initialized.
    unsafe { agenticros_msgs__action__Explore_GetResult_Response__Sequence__copy(in_seq, out_seq as *mut _) }
  }
}

impl rosidl_runtime_rs::Message for Explore_GetResult_Response {
  type RmwMsg = Self;
  fn into_rmw_message(msg_cow: std::borrow::Cow<'_, Self>) -> std::borrow::Cow<'_, Self::RmwMsg> { msg_cow }
  fn from_rmw_message(msg: Self::RmwMsg) -> Self { msg }
}

impl rosidl_runtime_rs::RmwMessage for Explore_GetResult_Response where Self: Sized {
  const TYPE_NAME: &'static str = "agenticros_msgs/action/Explore_GetResult_Response";
  fn get_type_support() -> *const std::ffi::c_void {
    // SAFETY: No preconditions for this function.
    unsafe { rosidl_typesupport_c__get_message_type_support_handle__agenticros_msgs__action__Explore_GetResult_Response() }
  }
}






#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__action__Explore_SendGoal() -> *const std::ffi::c_void;
}

// Corresponds to agenticros_msgs__action__Explore_SendGoal
#[allow(missing_docs, non_camel_case_types)]
pub struct Explore_SendGoal;

impl rosidl_runtime_rs::Service for Explore_SendGoal {
    type Request = Explore_SendGoal_Request;
    type Response = Explore_SendGoal_Response;

    fn get_type_support() -> *const std::ffi::c_void {
        // SAFETY: No preconditions for this function.
        unsafe { rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__action__Explore_SendGoal() }
    }
}




#[link(name = "agenticros_msgs__rosidl_typesupport_c")]
extern "C" {
    fn rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__action__Explore_GetResult() -> *const std::ffi::c_void;
}

// Corresponds to agenticros_msgs__action__Explore_GetResult
#[allow(missing_docs, non_camel_case_types)]
pub struct Explore_GetResult;

impl rosidl_runtime_rs::Service for Explore_GetResult {
    type Request = Explore_GetResult_Request;
    type Response = Explore_GetResult_Response;

    fn get_type_support() -> *const std::ffi::c_void {
        // SAFETY: No preconditions for this function.
        unsafe { rosidl_typesupport_c__get_service_type_support_handle__agenticros_msgs__action__Explore_GetResult() }
    }
}


