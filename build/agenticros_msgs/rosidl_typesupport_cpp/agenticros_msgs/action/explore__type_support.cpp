// generated from rosidl_typesupport_cpp/resource/idl__type_support.cpp.em
// with input from agenticros_msgs:action/Explore.idl
// generated code does not contain a copyright notice

#include "cstddef"
#include "rosidl_runtime_c/message_type_support_struct.h"
#include "agenticros_msgs/action/detail/explore__functions.h"
#include "agenticros_msgs/action/detail/explore__struct.hpp"
#include "rosidl_typesupport_cpp/identifier.hpp"
#include "rosidl_typesupport_cpp/message_type_support.hpp"
#include "rosidl_typesupport_c/type_support_map.h"
#include "rosidl_typesupport_cpp/message_type_support_dispatch.hpp"
#include "rosidl_typesupport_cpp/visibility_control.h"
#include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

typedef struct _Explore_Goal_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _Explore_Goal_type_support_ids_t;

static const _Explore_Goal_type_support_ids_t _Explore_Goal_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _Explore_Goal_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _Explore_Goal_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _Explore_Goal_type_support_symbol_names_t _Explore_Goal_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, action, Explore_Goal)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, action, Explore_Goal)),
  }
};

typedef struct _Explore_Goal_type_support_data_t
{
  void * data[2];
} _Explore_Goal_type_support_data_t;

static _Explore_Goal_type_support_data_t _Explore_Goal_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _Explore_Goal_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_Explore_Goal_message_typesupport_ids.typesupport_identifier[0],
  &_Explore_Goal_message_typesupport_symbol_names.symbol_name[0],
  &_Explore_Goal_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t Explore_Goal_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_Explore_Goal_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__action__Explore_Goal__get_type_hash,
  &agenticros_msgs__action__Explore_Goal__get_type_description,
  &agenticros_msgs__action__Explore_Goal__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::action::Explore_Goal>()
{
  return &::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_Goal_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore_Goal)() {
  return get_message_type_support_handle<agenticros_msgs::action::Explore_Goal>();
}

#ifdef __cplusplus
}
#endif
}  // namespace rosidl_typesupport_cpp

// already included above
// #include "cstddef"
// already included above
// #include "rosidl_runtime_c/message_type_support_struct.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"
// already included above
// #include "rosidl_typesupport_cpp/identifier.hpp"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support.hpp"
// already included above
// #include "rosidl_typesupport_c/type_support_map.h"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support_dispatch.hpp"
// already included above
// #include "rosidl_typesupport_cpp/visibility_control.h"
// already included above
// #include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

typedef struct _Explore_Result_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _Explore_Result_type_support_ids_t;

static const _Explore_Result_type_support_ids_t _Explore_Result_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _Explore_Result_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _Explore_Result_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _Explore_Result_type_support_symbol_names_t _Explore_Result_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, action, Explore_Result)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, action, Explore_Result)),
  }
};

typedef struct _Explore_Result_type_support_data_t
{
  void * data[2];
} _Explore_Result_type_support_data_t;

static _Explore_Result_type_support_data_t _Explore_Result_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _Explore_Result_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_Explore_Result_message_typesupport_ids.typesupport_identifier[0],
  &_Explore_Result_message_typesupport_symbol_names.symbol_name[0],
  &_Explore_Result_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t Explore_Result_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_Explore_Result_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__action__Explore_Result__get_type_hash,
  &agenticros_msgs__action__Explore_Result__get_type_description,
  &agenticros_msgs__action__Explore_Result__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::action::Explore_Result>()
{
  return &::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_Result_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore_Result)() {
  return get_message_type_support_handle<agenticros_msgs::action::Explore_Result>();
}

#ifdef __cplusplus
}
#endif
}  // namespace rosidl_typesupport_cpp

// already included above
// #include "cstddef"
// already included above
// #include "rosidl_runtime_c/message_type_support_struct.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"
// already included above
// #include "rosidl_typesupport_cpp/identifier.hpp"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support.hpp"
// already included above
// #include "rosidl_typesupport_c/type_support_map.h"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support_dispatch.hpp"
// already included above
// #include "rosidl_typesupport_cpp/visibility_control.h"
// already included above
// #include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

typedef struct _Explore_Feedback_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _Explore_Feedback_type_support_ids_t;

static const _Explore_Feedback_type_support_ids_t _Explore_Feedback_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _Explore_Feedback_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _Explore_Feedback_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _Explore_Feedback_type_support_symbol_names_t _Explore_Feedback_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, action, Explore_Feedback)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, action, Explore_Feedback)),
  }
};

typedef struct _Explore_Feedback_type_support_data_t
{
  void * data[2];
} _Explore_Feedback_type_support_data_t;

static _Explore_Feedback_type_support_data_t _Explore_Feedback_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _Explore_Feedback_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_Explore_Feedback_message_typesupport_ids.typesupport_identifier[0],
  &_Explore_Feedback_message_typesupport_symbol_names.symbol_name[0],
  &_Explore_Feedback_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t Explore_Feedback_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_Explore_Feedback_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__action__Explore_Feedback__get_type_hash,
  &agenticros_msgs__action__Explore_Feedback__get_type_description,
  &agenticros_msgs__action__Explore_Feedback__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::action::Explore_Feedback>()
{
  return &::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_Feedback_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore_Feedback)() {
  return get_message_type_support_handle<agenticros_msgs::action::Explore_Feedback>();
}

#ifdef __cplusplus
}
#endif
}  // namespace rosidl_typesupport_cpp

// already included above
// #include "cstddef"
// already included above
// #include "rosidl_runtime_c/message_type_support_struct.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"
// already included above
// #include "rosidl_typesupport_cpp/identifier.hpp"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support.hpp"
// already included above
// #include "rosidl_typesupport_c/type_support_map.h"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support_dispatch.hpp"
// already included above
// #include "rosidl_typesupport_cpp/visibility_control.h"
// already included above
// #include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

typedef struct _Explore_SendGoal_Request_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _Explore_SendGoal_Request_type_support_ids_t;

static const _Explore_SendGoal_Request_type_support_ids_t _Explore_SendGoal_Request_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _Explore_SendGoal_Request_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _Explore_SendGoal_Request_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _Explore_SendGoal_Request_type_support_symbol_names_t _Explore_SendGoal_Request_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, action, Explore_SendGoal_Request)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, action, Explore_SendGoal_Request)),
  }
};

typedef struct _Explore_SendGoal_Request_type_support_data_t
{
  void * data[2];
} _Explore_SendGoal_Request_type_support_data_t;

static _Explore_SendGoal_Request_type_support_data_t _Explore_SendGoal_Request_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _Explore_SendGoal_Request_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_Explore_SendGoal_Request_message_typesupport_ids.typesupport_identifier[0],
  &_Explore_SendGoal_Request_message_typesupport_symbol_names.symbol_name[0],
  &_Explore_SendGoal_Request_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t Explore_SendGoal_Request_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_Explore_SendGoal_Request_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__action__Explore_SendGoal_Request__get_type_hash,
  &agenticros_msgs__action__Explore_SendGoal_Request__get_type_description,
  &agenticros_msgs__action__Explore_SendGoal_Request__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::action::Explore_SendGoal_Request>()
{
  return &::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_SendGoal_Request_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore_SendGoal_Request)() {
  return get_message_type_support_handle<agenticros_msgs::action::Explore_SendGoal_Request>();
}

#ifdef __cplusplus
}
#endif
}  // namespace rosidl_typesupport_cpp

// already included above
// #include "cstddef"
// already included above
// #include "rosidl_runtime_c/message_type_support_struct.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"
// already included above
// #include "rosidl_typesupport_cpp/identifier.hpp"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support.hpp"
// already included above
// #include "rosidl_typesupport_c/type_support_map.h"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support_dispatch.hpp"
// already included above
// #include "rosidl_typesupport_cpp/visibility_control.h"
// already included above
// #include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

typedef struct _Explore_SendGoal_Response_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _Explore_SendGoal_Response_type_support_ids_t;

static const _Explore_SendGoal_Response_type_support_ids_t _Explore_SendGoal_Response_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _Explore_SendGoal_Response_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _Explore_SendGoal_Response_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _Explore_SendGoal_Response_type_support_symbol_names_t _Explore_SendGoal_Response_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, action, Explore_SendGoal_Response)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, action, Explore_SendGoal_Response)),
  }
};

typedef struct _Explore_SendGoal_Response_type_support_data_t
{
  void * data[2];
} _Explore_SendGoal_Response_type_support_data_t;

static _Explore_SendGoal_Response_type_support_data_t _Explore_SendGoal_Response_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _Explore_SendGoal_Response_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_Explore_SendGoal_Response_message_typesupport_ids.typesupport_identifier[0],
  &_Explore_SendGoal_Response_message_typesupport_symbol_names.symbol_name[0],
  &_Explore_SendGoal_Response_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t Explore_SendGoal_Response_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_Explore_SendGoal_Response_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__action__Explore_SendGoal_Response__get_type_hash,
  &agenticros_msgs__action__Explore_SendGoal_Response__get_type_description,
  &agenticros_msgs__action__Explore_SendGoal_Response__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::action::Explore_SendGoal_Response>()
{
  return &::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_SendGoal_Response_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore_SendGoal_Response)() {
  return get_message_type_support_handle<agenticros_msgs::action::Explore_SendGoal_Response>();
}

#ifdef __cplusplus
}
#endif
}  // namespace rosidl_typesupport_cpp

// already included above
// #include "cstddef"
// already included above
// #include "rosidl_runtime_c/message_type_support_struct.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"
// already included above
// #include "rosidl_typesupport_cpp/identifier.hpp"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support.hpp"
// already included above
// #include "rosidl_typesupport_c/type_support_map.h"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support_dispatch.hpp"
// already included above
// #include "rosidl_typesupport_cpp/visibility_control.h"
// already included above
// #include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

typedef struct _Explore_SendGoal_Event_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _Explore_SendGoal_Event_type_support_ids_t;

static const _Explore_SendGoal_Event_type_support_ids_t _Explore_SendGoal_Event_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _Explore_SendGoal_Event_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _Explore_SendGoal_Event_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _Explore_SendGoal_Event_type_support_symbol_names_t _Explore_SendGoal_Event_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, action, Explore_SendGoal_Event)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, action, Explore_SendGoal_Event)),
  }
};

typedef struct _Explore_SendGoal_Event_type_support_data_t
{
  void * data[2];
} _Explore_SendGoal_Event_type_support_data_t;

static _Explore_SendGoal_Event_type_support_data_t _Explore_SendGoal_Event_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _Explore_SendGoal_Event_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_Explore_SendGoal_Event_message_typesupport_ids.typesupport_identifier[0],
  &_Explore_SendGoal_Event_message_typesupport_symbol_names.symbol_name[0],
  &_Explore_SendGoal_Event_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t Explore_SendGoal_Event_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_Explore_SendGoal_Event_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__action__Explore_SendGoal_Event__get_type_hash,
  &agenticros_msgs__action__Explore_SendGoal_Event__get_type_description,
  &agenticros_msgs__action__Explore_SendGoal_Event__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::action::Explore_SendGoal_Event>()
{
  return &::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_SendGoal_Event_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore_SendGoal_Event)() {
  return get_message_type_support_handle<agenticros_msgs::action::Explore_SendGoal_Event>();
}

#ifdef __cplusplus
}
#endif
}  // namespace rosidl_typesupport_cpp

// already included above
// #include "cstddef"
#include "rosidl_runtime_c/service_type_support_struct.h"
#include "rosidl_typesupport_cpp/service_type_support.hpp"
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"
// already included above
// #include "rosidl_typesupport_cpp/identifier.hpp"
// already included above
// #include "rosidl_typesupport_c/type_support_map.h"
#include "rosidl_typesupport_cpp/service_type_support_dispatch.hpp"
// already included above
// #include "rosidl_typesupport_cpp/visibility_control.h"
// already included above
// #include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

typedef struct _Explore_SendGoal_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _Explore_SendGoal_type_support_ids_t;

static const _Explore_SendGoal_type_support_ids_t _Explore_SendGoal_service_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _Explore_SendGoal_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _Explore_SendGoal_type_support_symbol_names_t;
#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _Explore_SendGoal_type_support_symbol_names_t _Explore_SendGoal_service_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, action, Explore_SendGoal)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, action, Explore_SendGoal)),
  }
};

typedef struct _Explore_SendGoal_type_support_data_t
{
  void * data[2];
} _Explore_SendGoal_type_support_data_t;

static _Explore_SendGoal_type_support_data_t _Explore_SendGoal_service_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _Explore_SendGoal_service_typesupport_map = {
  2,
  "agenticros_msgs",
  &_Explore_SendGoal_service_typesupport_ids.typesupport_identifier[0],
  &_Explore_SendGoal_service_typesupport_symbol_names.symbol_name[0],
  &_Explore_SendGoal_service_typesupport_data.data[0],
};

static const rosidl_service_type_support_t Explore_SendGoal_service_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_Explore_SendGoal_service_typesupport_map),
  ::rosidl_typesupport_cpp::get_service_typesupport_handle_function,
  ::rosidl_typesupport_cpp::get_message_type_support_handle<agenticros_msgs::action::Explore_SendGoal_Request>(),
  ::rosidl_typesupport_cpp::get_message_type_support_handle<agenticros_msgs::action::Explore_SendGoal_Response>(),
  ::rosidl_typesupport_cpp::get_message_type_support_handle<agenticros_msgs::action::Explore_SendGoal_Event>(),
  &::rosidl_typesupport_cpp::service_create_event_message<agenticros_msgs::action::Explore_SendGoal>,
  &::rosidl_typesupport_cpp::service_destroy_event_message<agenticros_msgs::action::Explore_SendGoal>,
  &agenticros_msgs__action__Explore_SendGoal__get_type_hash,
  &agenticros_msgs__action__Explore_SendGoal__get_type_description,
  &agenticros_msgs__action__Explore_SendGoal__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_service_type_support_t *
get_service_type_support_handle<agenticros_msgs::action::Explore_SendGoal>()
{
  return &::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_SendGoal_service_type_support_handle;
}

}  // namespace rosidl_typesupport_cpp

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_service_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore_SendGoal)() {
  return ::rosidl_typesupport_cpp::get_service_type_support_handle<agenticros_msgs::action::Explore_SendGoal>();
}

#ifdef __cplusplus
}
#endif

// already included above
// #include "cstddef"
// already included above
// #include "rosidl_runtime_c/message_type_support_struct.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"
// already included above
// #include "rosidl_typesupport_cpp/identifier.hpp"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support.hpp"
// already included above
// #include "rosidl_typesupport_c/type_support_map.h"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support_dispatch.hpp"
// already included above
// #include "rosidl_typesupport_cpp/visibility_control.h"
// already included above
// #include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

typedef struct _Explore_GetResult_Request_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _Explore_GetResult_Request_type_support_ids_t;

static const _Explore_GetResult_Request_type_support_ids_t _Explore_GetResult_Request_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _Explore_GetResult_Request_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _Explore_GetResult_Request_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _Explore_GetResult_Request_type_support_symbol_names_t _Explore_GetResult_Request_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, action, Explore_GetResult_Request)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, action, Explore_GetResult_Request)),
  }
};

typedef struct _Explore_GetResult_Request_type_support_data_t
{
  void * data[2];
} _Explore_GetResult_Request_type_support_data_t;

static _Explore_GetResult_Request_type_support_data_t _Explore_GetResult_Request_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _Explore_GetResult_Request_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_Explore_GetResult_Request_message_typesupport_ids.typesupport_identifier[0],
  &_Explore_GetResult_Request_message_typesupport_symbol_names.symbol_name[0],
  &_Explore_GetResult_Request_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t Explore_GetResult_Request_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_Explore_GetResult_Request_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__action__Explore_GetResult_Request__get_type_hash,
  &agenticros_msgs__action__Explore_GetResult_Request__get_type_description,
  &agenticros_msgs__action__Explore_GetResult_Request__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::action::Explore_GetResult_Request>()
{
  return &::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_GetResult_Request_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore_GetResult_Request)() {
  return get_message_type_support_handle<agenticros_msgs::action::Explore_GetResult_Request>();
}

#ifdef __cplusplus
}
#endif
}  // namespace rosidl_typesupport_cpp

// already included above
// #include "cstddef"
// already included above
// #include "rosidl_runtime_c/message_type_support_struct.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"
// already included above
// #include "rosidl_typesupport_cpp/identifier.hpp"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support.hpp"
// already included above
// #include "rosidl_typesupport_c/type_support_map.h"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support_dispatch.hpp"
// already included above
// #include "rosidl_typesupport_cpp/visibility_control.h"
// already included above
// #include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

typedef struct _Explore_GetResult_Response_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _Explore_GetResult_Response_type_support_ids_t;

static const _Explore_GetResult_Response_type_support_ids_t _Explore_GetResult_Response_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _Explore_GetResult_Response_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _Explore_GetResult_Response_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _Explore_GetResult_Response_type_support_symbol_names_t _Explore_GetResult_Response_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, action, Explore_GetResult_Response)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, action, Explore_GetResult_Response)),
  }
};

typedef struct _Explore_GetResult_Response_type_support_data_t
{
  void * data[2];
} _Explore_GetResult_Response_type_support_data_t;

static _Explore_GetResult_Response_type_support_data_t _Explore_GetResult_Response_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _Explore_GetResult_Response_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_Explore_GetResult_Response_message_typesupport_ids.typesupport_identifier[0],
  &_Explore_GetResult_Response_message_typesupport_symbol_names.symbol_name[0],
  &_Explore_GetResult_Response_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t Explore_GetResult_Response_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_Explore_GetResult_Response_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__action__Explore_GetResult_Response__get_type_hash,
  &agenticros_msgs__action__Explore_GetResult_Response__get_type_description,
  &agenticros_msgs__action__Explore_GetResult_Response__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::action::Explore_GetResult_Response>()
{
  return &::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_GetResult_Response_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore_GetResult_Response)() {
  return get_message_type_support_handle<agenticros_msgs::action::Explore_GetResult_Response>();
}

#ifdef __cplusplus
}
#endif
}  // namespace rosidl_typesupport_cpp

// already included above
// #include "cstddef"
// already included above
// #include "rosidl_runtime_c/message_type_support_struct.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"
// already included above
// #include "rosidl_typesupport_cpp/identifier.hpp"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support.hpp"
// already included above
// #include "rosidl_typesupport_c/type_support_map.h"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support_dispatch.hpp"
// already included above
// #include "rosidl_typesupport_cpp/visibility_control.h"
// already included above
// #include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

typedef struct _Explore_GetResult_Event_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _Explore_GetResult_Event_type_support_ids_t;

static const _Explore_GetResult_Event_type_support_ids_t _Explore_GetResult_Event_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _Explore_GetResult_Event_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _Explore_GetResult_Event_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _Explore_GetResult_Event_type_support_symbol_names_t _Explore_GetResult_Event_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, action, Explore_GetResult_Event)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, action, Explore_GetResult_Event)),
  }
};

typedef struct _Explore_GetResult_Event_type_support_data_t
{
  void * data[2];
} _Explore_GetResult_Event_type_support_data_t;

static _Explore_GetResult_Event_type_support_data_t _Explore_GetResult_Event_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _Explore_GetResult_Event_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_Explore_GetResult_Event_message_typesupport_ids.typesupport_identifier[0],
  &_Explore_GetResult_Event_message_typesupport_symbol_names.symbol_name[0],
  &_Explore_GetResult_Event_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t Explore_GetResult_Event_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_Explore_GetResult_Event_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__action__Explore_GetResult_Event__get_type_hash,
  &agenticros_msgs__action__Explore_GetResult_Event__get_type_description,
  &agenticros_msgs__action__Explore_GetResult_Event__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::action::Explore_GetResult_Event>()
{
  return &::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_GetResult_Event_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore_GetResult_Event)() {
  return get_message_type_support_handle<agenticros_msgs::action::Explore_GetResult_Event>();
}

#ifdef __cplusplus
}
#endif
}  // namespace rosidl_typesupport_cpp

// already included above
// #include "cstddef"
// already included above
// #include "rosidl_runtime_c/service_type_support_struct.h"
// already included above
// #include "rosidl_typesupport_cpp/service_type_support.hpp"
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"
// already included above
// #include "rosidl_typesupport_cpp/identifier.hpp"
// already included above
// #include "rosidl_typesupport_c/type_support_map.h"
// already included above
// #include "rosidl_typesupport_cpp/service_type_support_dispatch.hpp"
// already included above
// #include "rosidl_typesupport_cpp/visibility_control.h"
// already included above
// #include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

typedef struct _Explore_GetResult_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _Explore_GetResult_type_support_ids_t;

static const _Explore_GetResult_type_support_ids_t _Explore_GetResult_service_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _Explore_GetResult_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _Explore_GetResult_type_support_symbol_names_t;
#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _Explore_GetResult_type_support_symbol_names_t _Explore_GetResult_service_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, action, Explore_GetResult)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, action, Explore_GetResult)),
  }
};

typedef struct _Explore_GetResult_type_support_data_t
{
  void * data[2];
} _Explore_GetResult_type_support_data_t;

static _Explore_GetResult_type_support_data_t _Explore_GetResult_service_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _Explore_GetResult_service_typesupport_map = {
  2,
  "agenticros_msgs",
  &_Explore_GetResult_service_typesupport_ids.typesupport_identifier[0],
  &_Explore_GetResult_service_typesupport_symbol_names.symbol_name[0],
  &_Explore_GetResult_service_typesupport_data.data[0],
};

static const rosidl_service_type_support_t Explore_GetResult_service_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_Explore_GetResult_service_typesupport_map),
  ::rosidl_typesupport_cpp::get_service_typesupport_handle_function,
  ::rosidl_typesupport_cpp::get_message_type_support_handle<agenticros_msgs::action::Explore_GetResult_Request>(),
  ::rosidl_typesupport_cpp::get_message_type_support_handle<agenticros_msgs::action::Explore_GetResult_Response>(),
  ::rosidl_typesupport_cpp::get_message_type_support_handle<agenticros_msgs::action::Explore_GetResult_Event>(),
  &::rosidl_typesupport_cpp::service_create_event_message<agenticros_msgs::action::Explore_GetResult>,
  &::rosidl_typesupport_cpp::service_destroy_event_message<agenticros_msgs::action::Explore_GetResult>,
  &agenticros_msgs__action__Explore_GetResult__get_type_hash,
  &agenticros_msgs__action__Explore_GetResult__get_type_description,
  &agenticros_msgs__action__Explore_GetResult__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_service_type_support_t *
get_service_type_support_handle<agenticros_msgs::action::Explore_GetResult>()
{
  return &::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_GetResult_service_type_support_handle;
}

}  // namespace rosidl_typesupport_cpp

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_service_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore_GetResult)() {
  return ::rosidl_typesupport_cpp::get_service_type_support_handle<agenticros_msgs::action::Explore_GetResult>();
}

#ifdef __cplusplus
}
#endif

// already included above
// #include "cstddef"
// already included above
// #include "rosidl_runtime_c/message_type_support_struct.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"
// already included above
// #include "rosidl_typesupport_cpp/identifier.hpp"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support.hpp"
// already included above
// #include "rosidl_typesupport_c/type_support_map.h"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support_dispatch.hpp"
// already included above
// #include "rosidl_typesupport_cpp/visibility_control.h"
// already included above
// #include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

typedef struct _Explore_FeedbackMessage_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _Explore_FeedbackMessage_type_support_ids_t;

static const _Explore_FeedbackMessage_type_support_ids_t _Explore_FeedbackMessage_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _Explore_FeedbackMessage_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _Explore_FeedbackMessage_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _Explore_FeedbackMessage_type_support_symbol_names_t _Explore_FeedbackMessage_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, action, Explore_FeedbackMessage)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, action, Explore_FeedbackMessage)),
  }
};

typedef struct _Explore_FeedbackMessage_type_support_data_t
{
  void * data[2];
} _Explore_FeedbackMessage_type_support_data_t;

static _Explore_FeedbackMessage_type_support_data_t _Explore_FeedbackMessage_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _Explore_FeedbackMessage_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_Explore_FeedbackMessage_message_typesupport_ids.typesupport_identifier[0],
  &_Explore_FeedbackMessage_message_typesupport_symbol_names.symbol_name[0],
  &_Explore_FeedbackMessage_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t Explore_FeedbackMessage_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_Explore_FeedbackMessage_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__action__Explore_FeedbackMessage__get_type_hash,
  &agenticros_msgs__action__Explore_FeedbackMessage__get_type_description,
  &agenticros_msgs__action__Explore_FeedbackMessage__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::action::Explore_FeedbackMessage>()
{
  return &::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_FeedbackMessage_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore_FeedbackMessage)() {
  return get_message_type_support_handle<agenticros_msgs::action::Explore_FeedbackMessage>();
}

#ifdef __cplusplus
}
#endif
}  // namespace rosidl_typesupport_cpp

#include "action_msgs/msg/goal_status_array.hpp"
#include "action_msgs/srv/cancel_goal.hpp"
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"
// already included above
// #include "rosidl_typesupport_cpp/visibility_control.h"
#include "rosidl_runtime_c/action_type_support_struct.h"
#include "rosidl_typesupport_cpp/action_type_support.hpp"
// already included above
// #include "rosidl_typesupport_cpp/message_type_support.hpp"
// already included above
// #include "rosidl_typesupport_cpp/service_type_support.hpp"

namespace agenticros_msgs
{

namespace action
{

namespace rosidl_typesupport_cpp
{

static rosidl_action_type_support_t Explore_action_type_support_handle = {
  NULL, NULL, NULL, NULL, NULL,
  &agenticros_msgs__action__Explore__get_type_hash,
  &agenticros_msgs__action__Explore__get_type_description,
  &agenticros_msgs__action__Explore__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_action_type_support_t *
get_action_type_support_handle<agenticros_msgs::action::Explore>()
{
  using ::agenticros_msgs::action::rosidl_typesupport_cpp::Explore_action_type_support_handle;
  // Thread-safe by always writing the same values to the static struct
  Explore_action_type_support_handle.goal_service_type_support = get_service_type_support_handle<::agenticros_msgs::action::Explore::Impl::SendGoalService>();
  Explore_action_type_support_handle.result_service_type_support = get_service_type_support_handle<::agenticros_msgs::action::Explore::Impl::GetResultService>();
  Explore_action_type_support_handle.cancel_service_type_support = get_service_type_support_handle<::agenticros_msgs::action::Explore::Impl::CancelGoalService>();
  Explore_action_type_support_handle.feedback_message_type_support = get_message_type_support_handle<::agenticros_msgs::action::Explore::Impl::FeedbackMessage>();
  Explore_action_type_support_handle.status_message_type_support = get_message_type_support_handle<::agenticros_msgs::action::Explore::Impl::GoalStatusMessage>();
  return &Explore_action_type_support_handle;
}

}  // namespace rosidl_typesupport_cpp

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_action_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__ACTION_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, action, Explore)() {
  return ::rosidl_typesupport_cpp::get_action_type_support_handle<agenticros_msgs::action::Explore>();
}

#ifdef __cplusplus
}
#endif
