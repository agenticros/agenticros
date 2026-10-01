// generated from rosidl_generator_c/resource/idl__struct.h.em
// with input from agenticros_msgs:msg/CapabilityManifest.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/msg/capability_manifest.h"


#ifndef AGENTICROS_MSGS__MSG__DETAIL__CAPABILITY_MANIFEST__STRUCT_H_
#define AGENTICROS_MSGS__MSG__DETAIL__CAPABILITY_MANIFEST__STRUCT_H_

#ifdef __cplusplus
extern "C"
{
#endif

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

// Constants defined in the message

// Include directives for member types
// Member 'robot_name'
// Member 'robot_namespace'
// Member 'topic_names'
// Member 'topic_types'
// Member 'service_names'
// Member 'service_types'
// Member 'action_names'
// Member 'action_types'
#include "rosidl_runtime_c/string.h"
// Member 'stamp'
#include "builtin_interfaces/msg/detail/time__struct.h"

/// Struct defined in msg/CapabilityManifest in the package agenticros_msgs.
typedef struct agenticros_msgs__msg__CapabilityManifest
{
  rosidl_runtime_c__String robot_name;
  rosidl_runtime_c__String robot_namespace;
  rosidl_runtime_c__String__Sequence topic_names;
  rosidl_runtime_c__String__Sequence topic_types;
  rosidl_runtime_c__String__Sequence service_names;
  rosidl_runtime_c__String__Sequence service_types;
  rosidl_runtime_c__String__Sequence action_names;
  rosidl_runtime_c__String__Sequence action_types;
  builtin_interfaces__msg__Time stamp;
} agenticros_msgs__msg__CapabilityManifest;

// Struct for a sequence of agenticros_msgs__msg__CapabilityManifest.
typedef struct agenticros_msgs__msg__CapabilityManifest__Sequence
{
  agenticros_msgs__msg__CapabilityManifest * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__msg__CapabilityManifest__Sequence;

#ifdef __cplusplus
}
#endif

#endif  // AGENTICROS_MSGS__MSG__DETAIL__CAPABILITY_MANIFEST__STRUCT_H_
