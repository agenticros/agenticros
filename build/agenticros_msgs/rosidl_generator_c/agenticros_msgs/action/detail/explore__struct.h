// generated from rosidl_generator_c/resource/idl__struct.h.em
// with input from agenticros_msgs:action/Explore.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/action/explore.h"


#ifndef AGENTICROS_MSGS__ACTION__DETAIL__EXPLORE__STRUCT_H_
#define AGENTICROS_MSGS__ACTION__DETAIL__EXPLORE__STRUCT_H_

#ifdef __cplusplus
extern "C"
{
#endif

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>


// Constants defined in the message

// Include directives for member types
// Member 'mode'
#include "rosidl_runtime_c/string.h"

/// Struct defined in action/Explore in the package agenticros_msgs.
typedef struct agenticros_msgs__action__Explore_Goal
{
  rosidl_runtime_c__String mode;
  float timeout_s;
  float min_frontier_m;
  int32_t max_goals;
} agenticros_msgs__action__Explore_Goal;

// Struct for a sequence of agenticros_msgs__action__Explore_Goal.
typedef struct agenticros_msgs__action__Explore_Goal__Sequence
{
  agenticros_msgs__action__Explore_Goal * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__action__Explore_Goal__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'message'
// already included above
// #include "rosidl_runtime_c/string.h"

/// Struct defined in action/Explore in the package agenticros_msgs.
typedef struct agenticros_msgs__action__Explore_Result
{
  bool success;
  rosidl_runtime_c__String message;
  float coverage_ratio;
  uint32_t goals_sent;
} agenticros_msgs__action__Explore_Result;

// Struct for a sequence of agenticros_msgs__action__Explore_Result.
typedef struct agenticros_msgs__action__Explore_Result__Sequence
{
  agenticros_msgs__action__Explore_Result * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__action__Explore_Result__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'state'
// already included above
// #include "rosidl_runtime_c/string.h"

/// Struct defined in action/Explore in the package agenticros_msgs.
typedef struct agenticros_msgs__action__Explore_Feedback
{
  rosidl_runtime_c__String state;
  float coverage_ratio;
  uint32_t goals_sent;
  float elapsed_s;
} agenticros_msgs__action__Explore_Feedback;

// Struct for a sequence of agenticros_msgs__action__Explore_Feedback.
typedef struct agenticros_msgs__action__Explore_Feedback__Sequence
{
  agenticros_msgs__action__Explore_Feedback * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__action__Explore_Feedback__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'goal_id'
#include "unique_identifier_msgs/msg/detail/uuid__struct.h"
// Member 'goal'
#include "agenticros_msgs/action/detail/explore__struct.h"

/// Struct defined in action/Explore in the package agenticros_msgs.
typedef struct agenticros_msgs__action__Explore_SendGoal_Request
{
  unique_identifier_msgs__msg__UUID goal_id;
  agenticros_msgs__action__Explore_Goal goal;
} agenticros_msgs__action__Explore_SendGoal_Request;

// Struct for a sequence of agenticros_msgs__action__Explore_SendGoal_Request.
typedef struct agenticros_msgs__action__Explore_SendGoal_Request__Sequence
{
  agenticros_msgs__action__Explore_SendGoal_Request * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__action__Explore_SendGoal_Request__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'stamp'
#include "builtin_interfaces/msg/detail/time__struct.h"

/// Struct defined in action/Explore in the package agenticros_msgs.
typedef struct agenticros_msgs__action__Explore_SendGoal_Response
{
  bool accepted;
  builtin_interfaces__msg__Time stamp;
} agenticros_msgs__action__Explore_SendGoal_Response;

// Struct for a sequence of agenticros_msgs__action__Explore_SendGoal_Response.
typedef struct agenticros_msgs__action__Explore_SendGoal_Response__Sequence
{
  agenticros_msgs__action__Explore_SendGoal_Response * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__action__Explore_SendGoal_Response__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'info'
#include "service_msgs/msg/detail/service_event_info__struct.h"

// constants for array fields with an upper bound
// request
enum
{
  agenticros_msgs__action__Explore_SendGoal_Event__request__MAX_SIZE = 1
};
// response
enum
{
  agenticros_msgs__action__Explore_SendGoal_Event__response__MAX_SIZE = 1
};

/// Struct defined in action/Explore in the package agenticros_msgs.
typedef struct agenticros_msgs__action__Explore_SendGoal_Event
{
  service_msgs__msg__ServiceEventInfo info;
  agenticros_msgs__action__Explore_SendGoal_Request__Sequence request;
  agenticros_msgs__action__Explore_SendGoal_Response__Sequence response;
} agenticros_msgs__action__Explore_SendGoal_Event;

// Struct for a sequence of agenticros_msgs__action__Explore_SendGoal_Event.
typedef struct agenticros_msgs__action__Explore_SendGoal_Event__Sequence
{
  agenticros_msgs__action__Explore_SendGoal_Event * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__action__Explore_SendGoal_Event__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'goal_id'
// already included above
// #include "unique_identifier_msgs/msg/detail/uuid__struct.h"

/// Struct defined in action/Explore in the package agenticros_msgs.
typedef struct agenticros_msgs__action__Explore_GetResult_Request
{
  unique_identifier_msgs__msg__UUID goal_id;
} agenticros_msgs__action__Explore_GetResult_Request;

// Struct for a sequence of agenticros_msgs__action__Explore_GetResult_Request.
typedef struct agenticros_msgs__action__Explore_GetResult_Request__Sequence
{
  agenticros_msgs__action__Explore_GetResult_Request * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__action__Explore_GetResult_Request__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'result'
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.h"

/// Struct defined in action/Explore in the package agenticros_msgs.
typedef struct agenticros_msgs__action__Explore_GetResult_Response
{
  int8_t status;
  agenticros_msgs__action__Explore_Result result;
} agenticros_msgs__action__Explore_GetResult_Response;

// Struct for a sequence of agenticros_msgs__action__Explore_GetResult_Response.
typedef struct agenticros_msgs__action__Explore_GetResult_Response__Sequence
{
  agenticros_msgs__action__Explore_GetResult_Response * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__action__Explore_GetResult_Response__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'info'
// already included above
// #include "service_msgs/msg/detail/service_event_info__struct.h"

// constants for array fields with an upper bound
// request
enum
{
  agenticros_msgs__action__Explore_GetResult_Event__request__MAX_SIZE = 1
};
// response
enum
{
  agenticros_msgs__action__Explore_GetResult_Event__response__MAX_SIZE = 1
};

/// Struct defined in action/Explore in the package agenticros_msgs.
typedef struct agenticros_msgs__action__Explore_GetResult_Event
{
  service_msgs__msg__ServiceEventInfo info;
  agenticros_msgs__action__Explore_GetResult_Request__Sequence request;
  agenticros_msgs__action__Explore_GetResult_Response__Sequence response;
} agenticros_msgs__action__Explore_GetResult_Event;

// Struct for a sequence of agenticros_msgs__action__Explore_GetResult_Event.
typedef struct agenticros_msgs__action__Explore_GetResult_Event__Sequence
{
  agenticros_msgs__action__Explore_GetResult_Event * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__action__Explore_GetResult_Event__Sequence;

// Constants defined in the message

// Include directives for member types
// Member 'goal_id'
// already included above
// #include "unique_identifier_msgs/msg/detail/uuid__struct.h"
// Member 'feedback'
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.h"

/// Struct defined in action/Explore in the package agenticros_msgs.
typedef struct agenticros_msgs__action__Explore_FeedbackMessage
{
  unique_identifier_msgs__msg__UUID goal_id;
  agenticros_msgs__action__Explore_Feedback feedback;
} agenticros_msgs__action__Explore_FeedbackMessage;

// Struct for a sequence of agenticros_msgs__action__Explore_FeedbackMessage.
typedef struct agenticros_msgs__action__Explore_FeedbackMessage__Sequence
{
  agenticros_msgs__action__Explore_FeedbackMessage * data;
  /// The number of valid items in data
  size_t size;
  /// The number of allocated items in data
  size_t capacity;
} agenticros_msgs__action__Explore_FeedbackMessage__Sequence;

#ifdef __cplusplus
}
#endif

#endif  // AGENTICROS_MSGS__ACTION__DETAIL__EXPLORE__STRUCT_H_
