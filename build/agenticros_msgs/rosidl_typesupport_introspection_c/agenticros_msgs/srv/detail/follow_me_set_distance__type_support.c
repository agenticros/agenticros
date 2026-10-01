// generated from rosidl_typesupport_introspection_c/resource/idl__type_support.c.em
// with input from agenticros_msgs:srv/FollowMeSetDistance.idl
// generated code does not contain a copyright notice

#include <stddef.h>
#include "agenticros_msgs/srv/detail/follow_me_set_distance__rosidl_typesupport_introspection_c.h"
#include "agenticros_msgs/msg/rosidl_typesupport_introspection_c__visibility_control.h"
#include "rosidl_typesupport_introspection_c/field_types.h"
#include "rosidl_typesupport_introspection_c/identifier.h"
#include "rosidl_typesupport_introspection_c/message_introspection.h"
#include "agenticros_msgs/srv/detail/follow_me_set_distance__functions.h"
#include "agenticros_msgs/srv/detail/follow_me_set_distance__struct.h"


#ifdef __cplusplus
extern "C"
{
#endif

void agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_init_function(
  void * message_memory, enum rosidl_runtime_c__message_initialization _init)
{
  // TODO(karsten1987): initializers are not yet implemented for typesupport c
  // see https://github.com/ros2/ros2/issues/397
  (void) _init;
  agenticros_msgs__srv__FollowMeSetDistance_Request__init(message_memory);
}

void agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_fini_function(void * message_memory)
{
  agenticros_msgs__srv__FollowMeSetDistance_Request__fini(message_memory);
}

static rosidl_typesupport_introspection_c__MessageMember agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_message_member_array[1] = {
  {
    "distance",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_FLOAT,  // type
    0,  // upper bound of string
    NULL,  // members of sub message
    false,  // is key
    false,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__srv__FollowMeSetDistance_Request, distance),  // bytes offset in struct
    NULL,  // default value
    NULL,  // size() function pointer
    NULL,  // get_const(index) function pointer
    NULL,  // get(index) function pointer
    NULL,  // fetch(index, &value) function pointer
    NULL,  // assign(index, value) function pointer
    NULL  // resize(index) function pointer
  }
};

static const rosidl_typesupport_introspection_c__MessageMembers agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_message_members = {
  "agenticros_msgs__srv",  // message namespace
  "FollowMeSetDistance_Request",  // message name
  1,  // number of fields
  sizeof(agenticros_msgs__srv__FollowMeSetDistance_Request),
  false,  // has_any_key_member_
  agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_message_member_array,  // message members
  agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_init_function,  // function to initialize message memory (memory has to be allocated)
  agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_fini_function  // function to terminate message instance (will not free memory)
};

// this is not const since it must be initialized on first access
// since C does not allow non-integral compile-time constants
static rosidl_message_type_support_t agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_message_type_support_handle = {
  0,
  &agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_message_members,
  get_message_typesupport_handle_function,
  &agenticros_msgs__srv__FollowMeSetDistance_Request__get_type_hash,
  &agenticros_msgs__srv__FollowMeSetDistance_Request__get_type_description,
  &agenticros_msgs__srv__FollowMeSetDistance_Request__get_type_description_sources,
};

ROSIDL_TYPESUPPORT_INTROSPECTION_C_EXPORT_agenticros_msgs
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, srv, FollowMeSetDistance_Request)() {
  if (!agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_message_type_support_handle.typesupport_identifier) {
    agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_message_type_support_handle.typesupport_identifier =
      rosidl_typesupport_introspection_c__identifier;
  }
  return &agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_message_type_support_handle;
}
#ifdef __cplusplus
}
#endif

// already included above
// #include <stddef.h>
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_set_distance__rosidl_typesupport_introspection_c.h"
// already included above
// #include "agenticros_msgs/msg/rosidl_typesupport_introspection_c__visibility_control.h"
// already included above
// #include "rosidl_typesupport_introspection_c/field_types.h"
// already included above
// #include "rosidl_typesupport_introspection_c/identifier.h"
// already included above
// #include "rosidl_typesupport_introspection_c/message_introspection.h"
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_set_distance__functions.h"
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_set_distance__struct.h"


#ifdef __cplusplus
extern "C"
{
#endif

void agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_init_function(
  void * message_memory, enum rosidl_runtime_c__message_initialization _init)
{
  // TODO(karsten1987): initializers are not yet implemented for typesupport c
  // see https://github.com/ros2/ros2/issues/397
  (void) _init;
  agenticros_msgs__srv__FollowMeSetDistance_Response__init(message_memory);
}

void agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_fini_function(void * message_memory)
{
  agenticros_msgs__srv__FollowMeSetDistance_Response__fini(message_memory);
}

static rosidl_typesupport_introspection_c__MessageMember agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_message_member_array[2] = {
  {
    "success",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_BOOLEAN,  // type
    0,  // upper bound of string
    NULL,  // members of sub message
    false,  // is key
    false,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__srv__FollowMeSetDistance_Response, success),  // bytes offset in struct
    NULL,  // default value
    NULL,  // size() function pointer
    NULL,  // get_const(index) function pointer
    NULL,  // get(index) function pointer
    NULL,  // fetch(index, &value) function pointer
    NULL,  // assign(index, value) function pointer
    NULL  // resize(index) function pointer
  },
  {
    "target_distance",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_FLOAT,  // type
    0,  // upper bound of string
    NULL,  // members of sub message
    false,  // is key
    false,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__srv__FollowMeSetDistance_Response, target_distance),  // bytes offset in struct
    NULL,  // default value
    NULL,  // size() function pointer
    NULL,  // get_const(index) function pointer
    NULL,  // get(index) function pointer
    NULL,  // fetch(index, &value) function pointer
    NULL,  // assign(index, value) function pointer
    NULL  // resize(index) function pointer
  }
};

static const rosidl_typesupport_introspection_c__MessageMembers agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_message_members = {
  "agenticros_msgs__srv",  // message namespace
  "FollowMeSetDistance_Response",  // message name
  2,  // number of fields
  sizeof(agenticros_msgs__srv__FollowMeSetDistance_Response),
  false,  // has_any_key_member_
  agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_message_member_array,  // message members
  agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_init_function,  // function to initialize message memory (memory has to be allocated)
  agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_fini_function  // function to terminate message instance (will not free memory)
};

// this is not const since it must be initialized on first access
// since C does not allow non-integral compile-time constants
static rosidl_message_type_support_t agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_message_type_support_handle = {
  0,
  &agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_message_members,
  get_message_typesupport_handle_function,
  &agenticros_msgs__srv__FollowMeSetDistance_Response__get_type_hash,
  &agenticros_msgs__srv__FollowMeSetDistance_Response__get_type_description,
  &agenticros_msgs__srv__FollowMeSetDistance_Response__get_type_description_sources,
};

ROSIDL_TYPESUPPORT_INTROSPECTION_C_EXPORT_agenticros_msgs
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, srv, FollowMeSetDistance_Response)() {
  if (!agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_message_type_support_handle.typesupport_identifier) {
    agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_message_type_support_handle.typesupport_identifier =
      rosidl_typesupport_introspection_c__identifier;
  }
  return &agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_message_type_support_handle;
}
#ifdef __cplusplus
}
#endif

// already included above
// #include <stddef.h>
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_set_distance__rosidl_typesupport_introspection_c.h"
// already included above
// #include "agenticros_msgs/msg/rosidl_typesupport_introspection_c__visibility_control.h"
// already included above
// #include "rosidl_typesupport_introspection_c/field_types.h"
// already included above
// #include "rosidl_typesupport_introspection_c/identifier.h"
// already included above
// #include "rosidl_typesupport_introspection_c/message_introspection.h"
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_set_distance__functions.h"
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_set_distance__struct.h"


// Include directives for member types
// Member `info`
#include "service_msgs/msg/service_event_info.h"
// Member `info`
#include "service_msgs/msg/detail/service_event_info__rosidl_typesupport_introspection_c.h"
// Member `request`
// Member `response`
#include "agenticros_msgs/srv/follow_me_set_distance.h"
// Member `request`
// Member `response`
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_set_distance__rosidl_typesupport_introspection_c.h"

#ifdef __cplusplus
extern "C"
{
#endif

void agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_init_function(
  void * message_memory, enum rosidl_runtime_c__message_initialization _init)
{
  // TODO(karsten1987): initializers are not yet implemented for typesupport c
  // see https://github.com/ros2/ros2/issues/397
  (void) _init;
  agenticros_msgs__srv__FollowMeSetDistance_Event__init(message_memory);
}

void agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_fini_function(void * message_memory)
{
  agenticros_msgs__srv__FollowMeSetDistance_Event__fini(message_memory);
}

size_t agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__size_function__FollowMeSetDistance_Event__request(
  const void * untyped_member)
{
  const agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence * member =
    (const agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence *)(untyped_member);
  return member->size;
}

const void * agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__get_const_function__FollowMeSetDistance_Event__request(
  const void * untyped_member, size_t index)
{
  const agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence * member =
    (const agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence *)(untyped_member);
  return &member->data[index];
}

void * agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__get_function__FollowMeSetDistance_Event__request(
  void * untyped_member, size_t index)
{
  agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence * member =
    (agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence *)(untyped_member);
  return &member->data[index];
}

void agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__fetch_function__FollowMeSetDistance_Event__request(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const agenticros_msgs__srv__FollowMeSetDistance_Request * item =
    ((const agenticros_msgs__srv__FollowMeSetDistance_Request *)
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__get_const_function__FollowMeSetDistance_Event__request(untyped_member, index));
  agenticros_msgs__srv__FollowMeSetDistance_Request * value =
    (agenticros_msgs__srv__FollowMeSetDistance_Request *)(untyped_value);
  *value = *item;
}

void agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__assign_function__FollowMeSetDistance_Event__request(
  void * untyped_member, size_t index, const void * untyped_value)
{
  agenticros_msgs__srv__FollowMeSetDistance_Request * item =
    ((agenticros_msgs__srv__FollowMeSetDistance_Request *)
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__get_function__FollowMeSetDistance_Event__request(untyped_member, index));
  const agenticros_msgs__srv__FollowMeSetDistance_Request * value =
    (const agenticros_msgs__srv__FollowMeSetDistance_Request *)(untyped_value);
  *item = *value;
}

bool agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__resize_function__FollowMeSetDistance_Event__request(
  void * untyped_member, size_t size)
{
  agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence * member =
    (agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence *)(untyped_member);
  agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__fini(member);
  return agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__init(member, size);
}

size_t agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__size_function__FollowMeSetDistance_Event__response(
  const void * untyped_member)
{
  const agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence * member =
    (const agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence *)(untyped_member);
  return member->size;
}

const void * agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__get_const_function__FollowMeSetDistance_Event__response(
  const void * untyped_member, size_t index)
{
  const agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence * member =
    (const agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence *)(untyped_member);
  return &member->data[index];
}

void * agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__get_function__FollowMeSetDistance_Event__response(
  void * untyped_member, size_t index)
{
  agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence * member =
    (agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence *)(untyped_member);
  return &member->data[index];
}

void agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__fetch_function__FollowMeSetDistance_Event__response(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const agenticros_msgs__srv__FollowMeSetDistance_Response * item =
    ((const agenticros_msgs__srv__FollowMeSetDistance_Response *)
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__get_const_function__FollowMeSetDistance_Event__response(untyped_member, index));
  agenticros_msgs__srv__FollowMeSetDistance_Response * value =
    (agenticros_msgs__srv__FollowMeSetDistance_Response *)(untyped_value);
  *value = *item;
}

void agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__assign_function__FollowMeSetDistance_Event__response(
  void * untyped_member, size_t index, const void * untyped_value)
{
  agenticros_msgs__srv__FollowMeSetDistance_Response * item =
    ((agenticros_msgs__srv__FollowMeSetDistance_Response *)
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__get_function__FollowMeSetDistance_Event__response(untyped_member, index));
  const agenticros_msgs__srv__FollowMeSetDistance_Response * value =
    (const agenticros_msgs__srv__FollowMeSetDistance_Response *)(untyped_value);
  *item = *value;
}

bool agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__resize_function__FollowMeSetDistance_Event__response(
  void * untyped_member, size_t size)
{
  agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence * member =
    (agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence *)(untyped_member);
  agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__fini(member);
  return agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__init(member, size);
}

static rosidl_typesupport_introspection_c__MessageMember agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_message_member_array[3] = {
  {
    "info",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_MESSAGE,  // type
    0,  // upper bound of string
    NULL,  // members of sub message (initialized later)
    false,  // is key
    false,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__srv__FollowMeSetDistance_Event, info),  // bytes offset in struct
    NULL,  // default value
    NULL,  // size() function pointer
    NULL,  // get_const(index) function pointer
    NULL,  // get(index) function pointer
    NULL,  // fetch(index, &value) function pointer
    NULL,  // assign(index, value) function pointer
    NULL  // resize(index) function pointer
  },
  {
    "request",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_MESSAGE,  // type
    0,  // upper bound of string
    NULL,  // members of sub message (initialized later)
    false,  // is key
    true,  // is array
    1,  // array size
    true,  // is upper bound
    offsetof(agenticros_msgs__srv__FollowMeSetDistance_Event, request),  // bytes offset in struct
    NULL,  // default value
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__size_function__FollowMeSetDistance_Event__request,  // size() function pointer
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__get_const_function__FollowMeSetDistance_Event__request,  // get_const(index) function pointer
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__get_function__FollowMeSetDistance_Event__request,  // get(index) function pointer
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__fetch_function__FollowMeSetDistance_Event__request,  // fetch(index, &value) function pointer
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__assign_function__FollowMeSetDistance_Event__request,  // assign(index, value) function pointer
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__resize_function__FollowMeSetDistance_Event__request  // resize(index) function pointer
  },
  {
    "response",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_MESSAGE,  // type
    0,  // upper bound of string
    NULL,  // members of sub message (initialized later)
    false,  // is key
    true,  // is array
    1,  // array size
    true,  // is upper bound
    offsetof(agenticros_msgs__srv__FollowMeSetDistance_Event, response),  // bytes offset in struct
    NULL,  // default value
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__size_function__FollowMeSetDistance_Event__response,  // size() function pointer
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__get_const_function__FollowMeSetDistance_Event__response,  // get_const(index) function pointer
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__get_function__FollowMeSetDistance_Event__response,  // get(index) function pointer
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__fetch_function__FollowMeSetDistance_Event__response,  // fetch(index, &value) function pointer
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__assign_function__FollowMeSetDistance_Event__response,  // assign(index, value) function pointer
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__resize_function__FollowMeSetDistance_Event__response  // resize(index) function pointer
  }
};

static const rosidl_typesupport_introspection_c__MessageMembers agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_message_members = {
  "agenticros_msgs__srv",  // message namespace
  "FollowMeSetDistance_Event",  // message name
  3,  // number of fields
  sizeof(agenticros_msgs__srv__FollowMeSetDistance_Event),
  false,  // has_any_key_member_
  agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_message_member_array,  // message members
  agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_init_function,  // function to initialize message memory (memory has to be allocated)
  agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_fini_function  // function to terminate message instance (will not free memory)
};

// this is not const since it must be initialized on first access
// since C does not allow non-integral compile-time constants
static rosidl_message_type_support_t agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_message_type_support_handle = {
  0,
  &agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_message_members,
  get_message_typesupport_handle_function,
  &agenticros_msgs__srv__FollowMeSetDistance_Event__get_type_hash,
  &agenticros_msgs__srv__FollowMeSetDistance_Event__get_type_description,
  &agenticros_msgs__srv__FollowMeSetDistance_Event__get_type_description_sources,
};

ROSIDL_TYPESUPPORT_INTROSPECTION_C_EXPORT_agenticros_msgs
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, srv, FollowMeSetDistance_Event)() {
  agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_message_member_array[0].members_ =
    ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, service_msgs, msg, ServiceEventInfo)();
  agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_message_member_array[1].members_ =
    ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, srv, FollowMeSetDistance_Request)();
  agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_message_member_array[2].members_ =
    ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, srv, FollowMeSetDistance_Response)();
  if (!agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_message_type_support_handle.typesupport_identifier) {
    agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_message_type_support_handle.typesupport_identifier =
      rosidl_typesupport_introspection_c__identifier;
  }
  return &agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_message_type_support_handle;
}
#ifdef __cplusplus
}
#endif

#include "rosidl_runtime_c/service_type_support_struct.h"
// already included above
// #include "agenticros_msgs/msg/rosidl_typesupport_introspection_c__visibility_control.h"
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_set_distance__rosidl_typesupport_introspection_c.h"
// already included above
// #include "rosidl_typesupport_introspection_c/identifier.h"
#include "rosidl_typesupport_introspection_c/service_introspection.h"

// this is intentionally not const to allow initialization later to prevent an initialization race
static rosidl_typesupport_introspection_c__ServiceMembers agenticros_msgs__srv__detail__follow_me_set_distance__rosidl_typesupport_introspection_c__FollowMeSetDistance_service_members = {
  "agenticros_msgs__srv",  // service namespace
  "FollowMeSetDistance",  // service name
  // the following fields are initialized below on first access
  NULL,  // request message
  // agenticros_msgs__srv__detail__follow_me_set_distance__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_message_type_support_handle,
  NULL,  // response message
  // agenticros_msgs__srv__detail__follow_me_set_distance__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_message_type_support_handle
  NULL  // event_message
  // agenticros_msgs__srv__detail__follow_me_set_distance__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_message_type_support_handle
};


static rosidl_service_type_support_t agenticros_msgs__srv__detail__follow_me_set_distance__rosidl_typesupport_introspection_c__FollowMeSetDistance_service_type_support_handle = {
  0,
  &agenticros_msgs__srv__detail__follow_me_set_distance__rosidl_typesupport_introspection_c__FollowMeSetDistance_service_members,
  get_service_typesupport_handle_function,
  &agenticros_msgs__srv__FollowMeSetDistance_Request__rosidl_typesupport_introspection_c__FollowMeSetDistance_Request_message_type_support_handle,
  &agenticros_msgs__srv__FollowMeSetDistance_Response__rosidl_typesupport_introspection_c__FollowMeSetDistance_Response_message_type_support_handle,
  &agenticros_msgs__srv__FollowMeSetDistance_Event__rosidl_typesupport_introspection_c__FollowMeSetDistance_Event_message_type_support_handle,
  ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_CREATE_EVENT_MESSAGE_SYMBOL_NAME(
    rosidl_typesupport_c,
    agenticros_msgs,
    srv,
    FollowMeSetDistance
  ),
  ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_DESTROY_EVENT_MESSAGE_SYMBOL_NAME(
    rosidl_typesupport_c,
    agenticros_msgs,
    srv,
    FollowMeSetDistance
  ),
  &agenticros_msgs__srv__FollowMeSetDistance__get_type_hash,
  &agenticros_msgs__srv__FollowMeSetDistance__get_type_description,
  &agenticros_msgs__srv__FollowMeSetDistance__get_type_description_sources,
};

// Forward declaration of message type support functions for service members
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, srv, FollowMeSetDistance_Request)(void);

const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, srv, FollowMeSetDistance_Response)(void);

const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, srv, FollowMeSetDistance_Event)(void);

ROSIDL_TYPESUPPORT_INTROSPECTION_C_EXPORT_agenticros_msgs
const rosidl_service_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, srv, FollowMeSetDistance)(void) {
  if (!agenticros_msgs__srv__detail__follow_me_set_distance__rosidl_typesupport_introspection_c__FollowMeSetDistance_service_type_support_handle.typesupport_identifier) {
    agenticros_msgs__srv__detail__follow_me_set_distance__rosidl_typesupport_introspection_c__FollowMeSetDistance_service_type_support_handle.typesupport_identifier =
      rosidl_typesupport_introspection_c__identifier;
  }
  rosidl_typesupport_introspection_c__ServiceMembers * service_members =
    (rosidl_typesupport_introspection_c__ServiceMembers *)agenticros_msgs__srv__detail__follow_me_set_distance__rosidl_typesupport_introspection_c__FollowMeSetDistance_service_type_support_handle.data;

  if (!service_members->request_members_) {
    service_members->request_members_ =
      (const rosidl_typesupport_introspection_c__MessageMembers *)
      ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, srv, FollowMeSetDistance_Request)()->data;
  }
  if (!service_members->response_members_) {
    service_members->response_members_ =
      (const rosidl_typesupport_introspection_c__MessageMembers *)
      ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, srv, FollowMeSetDistance_Response)()->data;
  }
  if (!service_members->event_members_) {
    service_members->event_members_ =
      (const rosidl_typesupport_introspection_c__MessageMembers *)
      ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, srv, FollowMeSetDistance_Event)()->data;
  }

  return &agenticros_msgs__srv__detail__follow_me_set_distance__rosidl_typesupport_introspection_c__FollowMeSetDistance_service_type_support_handle;
}
