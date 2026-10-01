// generated from rosidl_generator_c/resource/idl__struct.h.em
// with input from agenticros_msgs:srv/FollowMeSetTarget.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/srv/follow_me_set_target.h"


#ifndef AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_SET_TARGET__STRUCT_H_
#define AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_SET_TARGET__STRUCT_H_

#ifdef __cplusplus
extern "C"
{
#endif

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>


// Constants defined in the message

// Include directives for member types
// Member 'description'
#include "rosidl_runtime_c/string.h"

/// Struct defined in srv/FollowMeSetTarget in the package agenticros_msgs.
typedef struct agenticros_msgs__srv__FollowMeSetTarget_Request
{
  rosidl_runtime_c__String description;
} agenticros_msgs__srv__FollowMeSetTarget_Request;

// Struct for a sequence of agenticros_msgs__srv__FollowMeSetTarget_Request.
typedef struct agenticros_msgs__srv__FollowMeSetTarget_Request__Sequence
{
  agenticros_msgs__srv__FollowMeSetTarget_Request * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__srv__FollowMeSetTarget_Request__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'message'
// already included above
// #include "rosidl_runtime_c/string.h"

/// Struct defined in srv/FollowMeSetTarget in the package agenticros_msgs.
typedef struct agenticros_msgs__srv__FollowMeSetTarget_Response
{
  bool success;
  int32_t person_id;
  float confidence;
  rosidl_runtime_c__String message;
} agenticros_msgs__srv__FollowMeSetTarget_Response;

// Struct for a sequence of agenticros_msgs__srv__FollowMeSetTarget_Response.
typedef struct agenticros_msgs__srv__FollowMeSetTarget_Response__Sequence
{
  agenticros_msgs__srv__FollowMeSetTarget_Response * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__srv__FollowMeSetTarget_Response__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'info'
#include "service_msgs/msg/detail/service_event_info__struct.h"

// constants for array fields with an upper bound
// request
enum
{
  agenticros_msgs__srv__FollowMeSetTarget_Event__request__MAX_SIZE = 1
};
// response
enum
{
  agenticros_msgs__srv__FollowMeSetTarget_Event__response__MAX_SIZE = 1
};

/// Struct defined in srv/FollowMeSetTarget in the package agenticros_msgs.
typedef struct agenticros_msgs__srv__FollowMeSetTarget_Event
{
  service_msgs__msg__ServiceEventInfo info;
  agenticros_msgs__srv__FollowMeSetTarget_Request__Sequence request;
  agenticros_msgs__srv__FollowMeSetTarget_Response__Sequence response;
} agenticros_msgs__srv__FollowMeSetTarget_Event;

// Struct for a sequence of agenticros_msgs__srv__FollowMeSetTarget_Event.
typedef struct agenticros_msgs__srv__FollowMeSetTarget_Event__Sequence
{
  agenticros_msgs__srv__FollowMeSetTarget_Event * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__srv__FollowMeSetTarget_Event__Sequence;

#ifdef __cplusplus
}
#endif

#endif  // AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_SET_TARGET__STRUCT_H_
