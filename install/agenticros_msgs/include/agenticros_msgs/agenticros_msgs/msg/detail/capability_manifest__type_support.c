// generated from rosidl_typesupport_introspection_c/resource/idl__type_support.c.em
// with input from agenticros_msgs:msg/CapabilityManifest.idl
// generated code does not contain a copyright notice

#include <stddef.h>
#include "agenticros_msgs/msg/detail/capability_manifest__rosidl_typesupport_introspection_c.h"
#include "agenticros_msgs/msg/rosidl_typesupport_introspection_c__visibility_control.h"
#include "rosidl_typesupport_introspection_c/field_types.h"
#include "rosidl_typesupport_introspection_c/identifier.h"
#include "rosidl_typesupport_introspection_c/message_introspection.h"
#include "agenticros_msgs/msg/detail/capability_manifest__functions.h"
#include "agenticros_msgs/msg/detail/capability_manifest__struct.h"


// Include directives for member types
// Member `robot_name`
// Member `robot_namespace`
// Member `topic_names`
// Member `topic_types`
// Member `service_names`
// Member `service_types`
// Member `action_names`
// Member `action_types`
#include "rosidl_runtime_c/string_functions.h"
// Member `stamp`
#include "builtin_interfaces/msg/time.h"
// Member `stamp`
#include "builtin_interfaces/msg/detail/time__rosidl_typesupport_introspection_c.h"

#ifdef __cplusplus
extern "C"
{
#endif

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_init_function(
  void * message_memory, enum rosidl_runtime_c__message_initialization _init)
{
  // TODO(karsten1987): initializers are not yet implemented for typesupport c
  // see https://github.com/ros2/ros2/issues/397
  (void) _init;
  agenticros_msgs__msg__CapabilityManifest__init(message_memory);
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_fini_function(void * message_memory)
{
  agenticros_msgs__msg__CapabilityManifest__fini(message_memory);
}

size_t agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__size_function__CapabilityManifest__topic_names(
  const void * untyped_member)
{
  const rosidl_runtime_c__String__Sequence * member =
    (const rosidl_runtime_c__String__Sequence *)(untyped_member);
  return member->size;
}

const void * agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__topic_names(
  const void * untyped_member, size_t index)
{
  const rosidl_runtime_c__String__Sequence * member =
    (const rosidl_runtime_c__String__Sequence *)(untyped_member);
  return &member->data[index];
}

void * agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__topic_names(
  void * untyped_member, size_t index)
{
  rosidl_runtime_c__String__Sequence * member =
    (rosidl_runtime_c__String__Sequence *)(untyped_member);
  return &member->data[index];
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__fetch_function__CapabilityManifest__topic_names(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const rosidl_runtime_c__String * item =
    ((const rosidl_runtime_c__String *)
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__topic_names(untyped_member, index));
  rosidl_runtime_c__String * value =
    (rosidl_runtime_c__String *)(untyped_value);
  *value = *item;
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__assign_function__CapabilityManifest__topic_names(
  void * untyped_member, size_t index, const void * untyped_value)
{
  rosidl_runtime_c__String * item =
    ((rosidl_runtime_c__String *)
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__topic_names(untyped_member, index));
  const rosidl_runtime_c__String * value =
    (const rosidl_runtime_c__String *)(untyped_value);
  *item = *value;
}

bool agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__resize_function__CapabilityManifest__topic_names(
  void * untyped_member, size_t size)
{
  rosidl_runtime_c__String__Sequence * member =
    (rosidl_runtime_c__String__Sequence *)(untyped_member);
  rosidl_runtime_c__String__Sequence__fini(member);
  return rosidl_runtime_c__String__Sequence__init(member, size);
}

size_t agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__size_function__CapabilityManifest__topic_types(
  const void * untyped_member)
{
  const rosidl_runtime_c__String__Sequence * member =
    (const rosidl_runtime_c__String__Sequence *)(untyped_member);
  return member->size;
}

const void * agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__topic_types(
  const void * untyped_member, size_t index)
{
  const rosidl_runtime_c__String__Sequence * member =
    (const rosidl_runtime_c__String__Sequence *)(untyped_member);
  return &member->data[index];
}

void * agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__topic_types(
  void * untyped_member, size_t index)
{
  rosidl_runtime_c__String__Sequence * member =
    (rosidl_runtime_c__String__Sequence *)(untyped_member);
  return &member->data[index];
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__fetch_function__CapabilityManifest__topic_types(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const rosidl_runtime_c__String * item =
    ((const rosidl_runtime_c__String *)
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__topic_types(untyped_member, index));
  rosidl_runtime_c__String * value =
    (rosidl_runtime_c__String *)(untyped_value);
  *value = *item;
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__assign_function__CapabilityManifest__topic_types(
  void * untyped_member, size_t index, const void * untyped_value)
{
  rosidl_runtime_c__String * item =
    ((rosidl_runtime_c__String *)
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__topic_types(untyped_member, index));
  const rosidl_runtime_c__String * value =
    (const rosidl_runtime_c__String *)(untyped_value);
  *item = *value;
}

bool agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__resize_function__CapabilityManifest__topic_types(
  void * untyped_member, size_t size)
{
  rosidl_runtime_c__String__Sequence * member =
    (rosidl_runtime_c__String__Sequence *)(untyped_member);
  rosidl_runtime_c__String__Sequence__fini(member);
  return rosidl_runtime_c__String__Sequence__init(member, size);
}

size_t agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__size_function__CapabilityManifest__service_names(
  const void * untyped_member)
{
  const rosidl_runtime_c__String__Sequence * member =
    (const rosidl_runtime_c__String__Sequence *)(untyped_member);
  return member->size;
}

const void * agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__service_names(
  const void * untyped_member, size_t index)
{
  const rosidl_runtime_c__String__Sequence * member =
    (const rosidl_runtime_c__String__Sequence *)(untyped_member);
  return &member->data[index];
}

void * agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__service_names(
  void * untyped_member, size_t index)
{
  rosidl_runtime_c__String__Sequence * member =
    (rosidl_runtime_c__String__Sequence *)(untyped_member);
  return &member->data[index];
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__fetch_function__CapabilityManifest__service_names(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const rosidl_runtime_c__String * item =
    ((const rosidl_runtime_c__String *)
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__service_names(untyped_member, index));
  rosidl_runtime_c__String * value =
    (rosidl_runtime_c__String *)(untyped_value);
  *value = *item;
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__assign_function__CapabilityManifest__service_names(
  void * untyped_member, size_t index, const void * untyped_value)
{
  rosidl_runtime_c__String * item =
    ((rosidl_runtime_c__String *)
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__service_names(untyped_member, index));
  const rosidl_runtime_c__String * value =
    (const rosidl_runtime_c__String *)(untyped_value);
  *item = *value;
}

bool agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__resize_function__CapabilityManifest__service_names(
  void * untyped_member, size_t size)
{
  rosidl_runtime_c__String__Sequence * member =
    (rosidl_runtime_c__String__Sequence *)(untyped_member);
  rosidl_runtime_c__String__Sequence__fini(member);
  return rosidl_runtime_c__String__Sequence__init(member, size);
}

size_t agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__size_function__CapabilityManifest__service_types(
  const void * untyped_member)
{
  const rosidl_runtime_c__String__Sequence * member =
    (const rosidl_runtime_c__String__Sequence *)(untyped_member);
  return member->size;
}

const void * agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__service_types(
  const void * untyped_member, size_t index)
{
  const rosidl_runtime_c__String__Sequence * member =
    (const rosidl_runtime_c__String__Sequence *)(untyped_member);
  return &member->data[index];
}

void * agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__service_types(
  void * untyped_member, size_t index)
{
  rosidl_runtime_c__String__Sequence * member =
    (rosidl_runtime_c__String__Sequence *)(untyped_member);
  return &member->data[index];
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__fetch_function__CapabilityManifest__service_types(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const rosidl_runtime_c__String * item =
    ((const rosidl_runtime_c__String *)
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__service_types(untyped_member, index));
  rosidl_runtime_c__String * value =
    (rosidl_runtime_c__String *)(untyped_value);
  *value = *item;
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__assign_function__CapabilityManifest__service_types(
  void * untyped_member, size_t index, const void * untyped_value)
{
  rosidl_runtime_c__String * item =
    ((rosidl_runtime_c__String *)
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__service_types(untyped_member, index));
  const rosidl_runtime_c__String * value =
    (const rosidl_runtime_c__String *)(untyped_value);
  *item = *value;
}

bool agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__resize_function__CapabilityManifest__service_types(
  void * untyped_member, size_t size)
{
  rosidl_runtime_c__String__Sequence * member =
    (rosidl_runtime_c__String__Sequence *)(untyped_member);
  rosidl_runtime_c__String__Sequence__fini(member);
  return rosidl_runtime_c__String__Sequence__init(member, size);
}

size_t agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__size_function__CapabilityManifest__action_names(
  const void * untyped_member)
{
  const rosidl_runtime_c__String__Sequence * member =
    (const rosidl_runtime_c__String__Sequence *)(untyped_member);
  return member->size;
}

const void * agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__action_names(
  const void * untyped_member, size_t index)
{
  const rosidl_runtime_c__String__Sequence * member =
    (const rosidl_runtime_c__String__Sequence *)(untyped_member);
  return &member->data[index];
}

void * agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__action_names(
  void * untyped_member, size_t index)
{
  rosidl_runtime_c__String__Sequence * member =
    (rosidl_runtime_c__String__Sequence *)(untyped_member);
  return &member->data[index];
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__fetch_function__CapabilityManifest__action_names(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const rosidl_runtime_c__String * item =
    ((const rosidl_runtime_c__String *)
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__action_names(untyped_member, index));
  rosidl_runtime_c__String * value =
    (rosidl_runtime_c__String *)(untyped_value);
  *value = *item;
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__assign_function__CapabilityManifest__action_names(
  void * untyped_member, size_t index, const void * untyped_value)
{
  rosidl_runtime_c__String * item =
    ((rosidl_runtime_c__String *)
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__action_names(untyped_member, index));
  const rosidl_runtime_c__String * value =
    (const rosidl_runtime_c__String *)(untyped_value);
  *item = *value;
}

bool agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__resize_function__CapabilityManifest__action_names(
  void * untyped_member, size_t size)
{
  rosidl_runtime_c__String__Sequence * member =
    (rosidl_runtime_c__String__Sequence *)(untyped_member);
  rosidl_runtime_c__String__Sequence__fini(member);
  return rosidl_runtime_c__String__Sequence__init(member, size);
}

size_t agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__size_function__CapabilityManifest__action_types(
  const void * untyped_member)
{
  const rosidl_runtime_c__String__Sequence * member =
    (const rosidl_runtime_c__String__Sequence *)(untyped_member);
  return member->size;
}

const void * agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__action_types(
  const void * untyped_member, size_t index)
{
  const rosidl_runtime_c__String__Sequence * member =
    (const rosidl_runtime_c__String__Sequence *)(untyped_member);
  return &member->data[index];
}

void * agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__action_types(
  void * untyped_member, size_t index)
{
  rosidl_runtime_c__String__Sequence * member =
    (rosidl_runtime_c__String__Sequence *)(untyped_member);
  return &member->data[index];
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__fetch_function__CapabilityManifest__action_types(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const rosidl_runtime_c__String * item =
    ((const rosidl_runtime_c__String *)
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__action_types(untyped_member, index));
  rosidl_runtime_c__String * value =
    (rosidl_runtime_c__String *)(untyped_value);
  *value = *item;
}

void agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__assign_function__CapabilityManifest__action_types(
  void * untyped_member, size_t index, const void * untyped_value)
{
  rosidl_runtime_c__String * item =
    ((rosidl_runtime_c__String *)
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__action_types(untyped_member, index));
  const rosidl_runtime_c__String * value =
    (const rosidl_runtime_c__String *)(untyped_value);
  *item = *value;
}

bool agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__resize_function__CapabilityManifest__action_types(
  void * untyped_member, size_t size)
{
  rosidl_runtime_c__String__Sequence * member =
    (rosidl_runtime_c__String__Sequence *)(untyped_member);
  rosidl_runtime_c__String__Sequence__fini(member);
  return rosidl_runtime_c__String__Sequence__init(member, size);
}

static rosidl_typesupport_introspection_c__MessageMember agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_message_member_array[9] = {
  {
    "robot_name",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    NULL,  // members of sub message
    false,  // is key
    false,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__msg__CapabilityManifest, robot_name),  // bytes offset in struct
    NULL,  // default value
    NULL,  // size() function pointer
    NULL,  // get_const(index) function pointer
    NULL,  // get(index) function pointer
    NULL,  // fetch(index, &value) function pointer
    NULL,  // assign(index, value) function pointer
    NULL  // resize(index) function pointer
  },
  {
    "robot_namespace",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    NULL,  // members of sub message
    false,  // is key
    false,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__msg__CapabilityManifest, robot_namespace),  // bytes offset in struct
    NULL,  // default value
    NULL,  // size() function pointer
    NULL,  // get_const(index) function pointer
    NULL,  // get(index) function pointer
    NULL,  // fetch(index, &value) function pointer
    NULL,  // assign(index, value) function pointer
    NULL  // resize(index) function pointer
  },
  {
    "topic_names",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    NULL,  // members of sub message
    false,  // is key
    true,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__msg__CapabilityManifest, topic_names),  // bytes offset in struct
    NULL,  // default value
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__size_function__CapabilityManifest__topic_names,  // size() function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__topic_names,  // get_const(index) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__topic_names,  // get(index) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__fetch_function__CapabilityManifest__topic_names,  // fetch(index, &value) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__assign_function__CapabilityManifest__topic_names,  // assign(index, value) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__resize_function__CapabilityManifest__topic_names  // resize(index) function pointer
  },
  {
    "topic_types",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    NULL,  // members of sub message
    false,  // is key
    true,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__msg__CapabilityManifest, topic_types),  // bytes offset in struct
    NULL,  // default value
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__size_function__CapabilityManifest__topic_types,  // size() function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__topic_types,  // get_const(index) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__topic_types,  // get(index) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__fetch_function__CapabilityManifest__topic_types,  // fetch(index, &value) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__assign_function__CapabilityManifest__topic_types,  // assign(index, value) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__resize_function__CapabilityManifest__topic_types  // resize(index) function pointer
  },
  {
    "service_names",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    NULL,  // members of sub message
    false,  // is key
    true,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__msg__CapabilityManifest, service_names),  // bytes offset in struct
    NULL,  // default value
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__size_function__CapabilityManifest__service_names,  // size() function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__service_names,  // get_const(index) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__service_names,  // get(index) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__fetch_function__CapabilityManifest__service_names,  // fetch(index, &value) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__assign_function__CapabilityManifest__service_names,  // assign(index, value) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__resize_function__CapabilityManifest__service_names  // resize(index) function pointer
  },
  {
    "service_types",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    NULL,  // members of sub message
    false,  // is key
    true,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__msg__CapabilityManifest, service_types),  // bytes offset in struct
    NULL,  // default value
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__size_function__CapabilityManifest__service_types,  // size() function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__service_types,  // get_const(index) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__service_types,  // get(index) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__fetch_function__CapabilityManifest__service_types,  // fetch(index, &value) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__assign_function__CapabilityManifest__service_types,  // assign(index, value) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__resize_function__CapabilityManifest__service_types  // resize(index) function pointer
  },
  {
    "action_names",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    NULL,  // members of sub message
    false,  // is key
    true,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__msg__CapabilityManifest, action_names),  // bytes offset in struct
    NULL,  // default value
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__size_function__CapabilityManifest__action_names,  // size() function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__action_names,  // get_const(index) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__action_names,  // get(index) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__fetch_function__CapabilityManifest__action_names,  // fetch(index, &value) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__assign_function__CapabilityManifest__action_names,  // assign(index, value) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__resize_function__CapabilityManifest__action_names  // resize(index) function pointer
  },
  {
    "action_types",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    NULL,  // members of sub message
    false,  // is key
    true,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__msg__CapabilityManifest, action_types),  // bytes offset in struct
    NULL,  // default value
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__size_function__CapabilityManifest__action_types,  // size() function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_const_function__CapabilityManifest__action_types,  // get_const(index) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__get_function__CapabilityManifest__action_types,  // get(index) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__fetch_function__CapabilityManifest__action_types,  // fetch(index, &value) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__assign_function__CapabilityManifest__action_types,  // assign(index, value) function pointer
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__resize_function__CapabilityManifest__action_types  // resize(index) function pointer
  },
  {
    "stamp",  // name
    rosidl_typesupport_introspection_c__ROS_TYPE_MESSAGE,  // type
    0,  // upper bound of string
    NULL,  // members of sub message (initialized later)
    false,  // is key
    false,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs__msg__CapabilityManifest, stamp),  // bytes offset in struct
    NULL,  // default value
    NULL,  // size() function pointer
    NULL,  // get_const(index) function pointer
    NULL,  // get(index) function pointer
    NULL,  // fetch(index, &value) function pointer
    NULL,  // assign(index, value) function pointer
    NULL  // resize(index) function pointer
  }
};

static const rosidl_typesupport_introspection_c__MessageMembers agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_message_members = {
  "agenticros_msgs__msg",  // message namespace
  "CapabilityManifest",  // message name
  9,  // number of fields
  sizeof(agenticros_msgs__msg__CapabilityManifest),
  false,  // has_any_key_member_
  agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_message_member_array,  // message members
  agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_init_function,  // function to initialize message memory (memory has to be allocated)
  agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_fini_function  // function to terminate message instance (will not free memory)
};

// this is not const since it must be initialized on first access
// since C does not allow non-integral compile-time constants
static rosidl_message_type_support_t agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_message_type_support_handle = {
  0,
  &agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_message_members,
  get_message_typesupport_handle_function,
  &agenticros_msgs__msg__CapabilityManifest__get_type_hash,
  &agenticros_msgs__msg__CapabilityManifest__get_type_description,
  &agenticros_msgs__msg__CapabilityManifest__get_type_description_sources,
};

ROSIDL_TYPESUPPORT_INTROSPECTION_C_EXPORT_agenticros_msgs
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, agenticros_msgs, msg, CapabilityManifest)() {
  agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_message_member_array[8].members_ =
    ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_c, builtin_interfaces, msg, Time)();
  if (!agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_message_type_support_handle.typesupport_identifier) {
    agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_message_type_support_handle.typesupport_identifier =
      rosidl_typesupport_introspection_c__identifier;
  }
  return &agenticros_msgs__msg__CapabilityManifest__rosidl_typesupport_introspection_c__CapabilityManifest_message_type_support_handle;
}
#ifdef __cplusplus
}
#endif
