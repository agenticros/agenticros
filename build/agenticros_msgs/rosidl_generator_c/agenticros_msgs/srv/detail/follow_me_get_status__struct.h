// generated from rosidl_generator_c/resource/idl__struct.h.em
// with input from agenticros_msgs:srv/FollowMeGetStatus.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/srv/follow_me_get_status.h"


#ifndef AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_GET_STATUS__STRUCT_H_
#define AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_GET_STATUS__STRUCT_H_

#ifdef __cplusplus
extern "C"
{
#endif

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>


// Constants defined in the message

/// Struct defined in srv/FollowMeGetStatus in the package agenticros_msgs.
typedef struct agenticros_msgs__srv__FollowMeGetStatus_Request
{
  uint8_t structure_needs_at_least_one_member;
} agenticros_msgs__srv__FollowMeGetStatus_Request;

// Struct for a sequence of agenticros_msgs__srv__FollowMeGetStatus_Request.
typedef struct agenticros_msgs__srv__FollowMeGetStatus_Request__Sequence
{
  agenticros_msgs__srv__FollowMeGetStatus_Request * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__srv__FollowMeGetStatus_Request__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'target_description'
// Member 'error_message'
#include "rosidl_runtime_c/string.h"
// Member 'twist'
#include "geometry_msgs/msg/detail/twist__struct.h"

/// Struct defined in srv/FollowMeGetStatus in the package agenticros_msgs.
typedef struct agenticros_msgs__srv__FollowMeGetStatus_Response
{
  bool success;
  bool enabled;
  bool tracking;
  float target_distance;
  float current_distance;
  int32_t target_person_id;
  rosidl_runtime_c__String target_description;
  int32_t persons_detected;
  geometry_msgs__msg__Twist twist;
  rosidl_runtime_c__String error_message;
} agenticros_msgs__srv__FollowMeGetStatus_Response;

// Struct for a sequence of agenticros_msgs__srv__FollowMeGetStatus_Response.
typedef struct agenticros_msgs__srv__FollowMeGetStatus_Response__Sequence
{
  agenticros_msgs__srv__FollowMeGetStatus_Response * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__srv__FollowMeGetStatus_Response__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'info'
#include "service_msgs/msg/detail/service_event_info__struct.h"

// constants for array fields with an upper bound
// request
enum
{
  agenticros_msgs__srv__FollowMeGetStatus_Event__request__MAX_SIZE = 1
};
// response
enum
{
  agenticros_msgs__srv__FollowMeGetStatus_Event__response__MAX_SIZE = 1
};

/// Struct defined in srv/FollowMeGetStatus in the package agenticros_msgs.
typedef struct agenticros_msgs__srv__FollowMeGetStatus_Event
{
  service_msgs__msg__ServiceEventInfo info;
  agenticros_msgs__srv__FollowMeGetStatus_Request__Sequence request;
  agenticros_msgs__srv__FollowMeGetStatus_Response__Sequence response;
} agenticros_msgs__srv__FollowMeGetStatus_Event;

// Struct for a sequence of agenticros_msgs__srv__FollowMeGetStatus_Event.
typedef struct agenticros_msgs__srv__FollowMeGetStatus_Event__Sequence
{
  agenticros_msgs__srv__FollowMeGetStatus_Event * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__srv__FollowMeGetStatus_Event__Sequence;

#ifdef __cplusplus
}
#endif

#endif  // AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_GET_STATUS__STRUCT_H_
