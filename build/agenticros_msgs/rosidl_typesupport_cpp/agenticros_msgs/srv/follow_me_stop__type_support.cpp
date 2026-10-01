// generated from rosidl_typesupport_cpp/resource/idl__type_support.cpp.em
// with input from agenticros_msgs:srv/FollowMeStop.idl
// generated code does not contain a copyright notice

#include "cstddef"
#include "rosidl_runtime_c/message_type_support_struct.h"
#include "agenticros_msgs/srv/detail/follow_me_stop__functions.h"
#include "agenticros_msgs/srv/detail/follow_me_stop__struct.hpp"
#include "rosidl_typesupport_cpp/identifier.hpp"
#include "rosidl_typesupport_cpp/message_type_support.hpp"
#include "rosidl_typesupport_c/type_support_map.h"
#include "rosidl_typesupport_cpp/message_type_support_dispatch.hpp"
#include "rosidl_typesupport_cpp/visibility_control.h"
#include "rosidl_typesupport_interface/macros.h"

namespace agenticros_msgs
{

namespace srv
{

namespace rosidl_typesupport_cpp
{

typedef struct _FollowMeStop_Request_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _FollowMeStop_Request_type_support_ids_t;

static const _FollowMeStop_Request_type_support_ids_t _FollowMeStop_Request_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _FollowMeStop_Request_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _FollowMeStop_Request_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _FollowMeStop_Request_type_support_symbol_names_t _FollowMeStop_Request_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, srv, FollowMeStop_Request)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, srv, FollowMeStop_Request)),
  }
};

typedef struct _FollowMeStop_Request_type_support_data_t
{
  void * data[2];
} _FollowMeStop_Request_type_support_data_t;

static _FollowMeStop_Request_type_support_data_t _FollowMeStop_Request_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _FollowMeStop_Request_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_FollowMeStop_Request_message_typesupport_ids.typesupport_identifier[0],
  &_FollowMeStop_Request_message_typesupport_symbol_names.symbol_name[0],
  &_FollowMeStop_Request_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t FollowMeStop_Request_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_FollowMeStop_Request_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__srv__FollowMeStop_Request__get_type_hash,
  &agenticros_msgs__srv__FollowMeStop_Request__get_type_description,
  &agenticros_msgs__srv__FollowMeStop_Request__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace srv

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::srv::FollowMeStop_Request>()
{
  return &::agenticros_msgs::srv::rosidl_typesupport_cpp::FollowMeStop_Request_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, srv, FollowMeStop_Request)() {
  return get_message_type_support_handle<agenticros_msgs::srv::FollowMeStop_Request>();
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
// #include "agenticros_msgs/srv/detail/follow_me_stop__functions.h"
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_stop__struct.hpp"
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

namespace srv
{

namespace rosidl_typesupport_cpp
{

typedef struct _FollowMeStop_Response_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _FollowMeStop_Response_type_support_ids_t;

static const _FollowMeStop_Response_type_support_ids_t _FollowMeStop_Response_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _FollowMeStop_Response_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _FollowMeStop_Response_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _FollowMeStop_Response_type_support_symbol_names_t _FollowMeStop_Response_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, srv, FollowMeStop_Response)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, srv, FollowMeStop_Response)),
  }
};

typedef struct _FollowMeStop_Response_type_support_data_t
{
  void * data[2];
} _FollowMeStop_Response_type_support_data_t;

static _FollowMeStop_Response_type_support_data_t _FollowMeStop_Response_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _FollowMeStop_Response_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_FollowMeStop_Response_message_typesupport_ids.typesupport_identifier[0],
  &_FollowMeStop_Response_message_typesupport_symbol_names.symbol_name[0],
  &_FollowMeStop_Response_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t FollowMeStop_Response_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_FollowMeStop_Response_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__srv__FollowMeStop_Response__get_type_hash,
  &agenticros_msgs__srv__FollowMeStop_Response__get_type_description,
  &agenticros_msgs__srv__FollowMeStop_Response__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace srv

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::srv::FollowMeStop_Response>()
{
  return &::agenticros_msgs::srv::rosidl_typesupport_cpp::FollowMeStop_Response_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, srv, FollowMeStop_Response)() {
  return get_message_type_support_handle<agenticros_msgs::srv::FollowMeStop_Response>();
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
// #include "agenticros_msgs/srv/detail/follow_me_stop__functions.h"
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_stop__struct.hpp"
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

namespace srv
{

namespace rosidl_typesupport_cpp
{

typedef struct _FollowMeStop_Event_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _FollowMeStop_Event_type_support_ids_t;

static const _FollowMeStop_Event_type_support_ids_t _FollowMeStop_Event_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _FollowMeStop_Event_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _FollowMeStop_Event_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _FollowMeStop_Event_type_support_symbol_names_t _FollowMeStop_Event_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, srv, FollowMeStop_Event)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, srv, FollowMeStop_Event)),
  }
};

typedef struct _FollowMeStop_Event_type_support_data_t
{
  void * data[2];
} _FollowMeStop_Event_type_support_data_t;

static _FollowMeStop_Event_type_support_data_t _FollowMeStop_Event_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _FollowMeStop_Event_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_FollowMeStop_Event_message_typesupport_ids.typesupport_identifier[0],
  &_FollowMeStop_Event_message_typesupport_symbol_names.symbol_name[0],
  &_FollowMeStop_Event_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t FollowMeStop_Event_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_FollowMeStop_Event_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__srv__FollowMeStop_Event__get_type_hash,
  &agenticros_msgs__srv__FollowMeStop_Event__get_type_description,
  &agenticros_msgs__srv__FollowMeStop_Event__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace srv

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::srv::FollowMeStop_Event>()
{
  return &::agenticros_msgs::srv::rosidl_typesupport_cpp::FollowMeStop_Event_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, srv, FollowMeStop_Event)() {
  return get_message_type_support_handle<agenticros_msgs::srv::FollowMeStop_Event>();
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
// #include "agenticros_msgs/srv/detail/follow_me_stop__struct.hpp"
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

namespace srv
{

namespace rosidl_typesupport_cpp
{

typedef struct _FollowMeStop_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _FollowMeStop_type_support_ids_t;

static const _FollowMeStop_type_support_ids_t _FollowMeStop_service_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _FollowMeStop_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _FollowMeStop_type_support_symbol_names_t;
#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _FollowMeStop_type_support_symbol_names_t _FollowMeStop_service_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, srv, FollowMeStop)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, srv, FollowMeStop)),
  }
};

typedef struct _FollowMeStop_type_support_data_t
{
  void * data[2];
} _FollowMeStop_type_support_data_t;

static _FollowMeStop_type_support_data_t _FollowMeStop_service_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _FollowMeStop_service_typesupport_map = {
  2,
  "agenticros_msgs",
  &_FollowMeStop_service_typesupport_ids.typesupport_identifier[0],
  &_FollowMeStop_service_typesupport_symbol_names.symbol_name[0],
  &_FollowMeStop_service_typesupport_data.data[0],
};

static const rosidl_service_type_support_t FollowMeStop_service_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_FollowMeStop_service_typesupport_map),
  ::rosidl_typesupport_cpp::get_service_typesupport_handle_function,
  ::rosidl_typesupport_cpp::get_message_type_support_handle<agenticros_msgs::srv::FollowMeStop_Request>(),
  ::rosidl_typesupport_cpp::get_message_type_support_handle<agenticros_msgs::srv::FollowMeStop_Response>(),
  ::rosidl_typesupport_cpp::get_message_type_support_handle<agenticros_msgs::srv::FollowMeStop_Event>(),
  &::rosidl_typesupport_cpp::service_create_event_message<agenticros_msgs::srv::FollowMeStop>,
  &::rosidl_typesupport_cpp::service_destroy_event_message<agenticros_msgs::srv::FollowMeStop>,
  &agenticros_msgs__srv__FollowMeStop__get_type_hash,
  &agenticros_msgs__srv__FollowMeStop__get_type_description,
  &agenticros_msgs__srv__FollowMeStop__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace srv

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_service_type_support_t *
get_service_type_support_handle<agenticros_msgs::srv::FollowMeStop>()
{
  return &::agenticros_msgs::srv::rosidl_typesupport_cpp::FollowMeStop_service_type_support_handle;
}

}  // namespace rosidl_typesupport_cpp

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_service_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, srv, FollowMeStop)() {
  return ::rosidl_typesupport_cpp::get_service_type_support_handle<agenticros_msgs::srv::FollowMeStop>();
}

#ifdef __cplusplus
}
#endif
