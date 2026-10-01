// generated from rosidl_typesupport_cpp/resource/idl__type_support.cpp.em
// with input from agenticros_msgs:srv/GetCapabilities.idl
// generated code does not contain a copyright notice

#include "cstddef"
#include "rosidl_runtime_c/message_type_support_struct.h"
#include "agenticros_msgs/srv/detail/get_capabilities__functions.h"
#include "agenticros_msgs/srv/detail/get_capabilities__struct.hpp"
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

typedef struct _GetCapabilities_Request_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _GetCapabilities_Request_type_support_ids_t;

static const _GetCapabilities_Request_type_support_ids_t _GetCapabilities_Request_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _GetCapabilities_Request_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _GetCapabilities_Request_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _GetCapabilities_Request_type_support_symbol_names_t _GetCapabilities_Request_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, srv, GetCapabilities_Request)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, srv, GetCapabilities_Request)),
  }
};

typedef struct _GetCapabilities_Request_type_support_data_t
{
  void * data[2];
} _GetCapabilities_Request_type_support_data_t;

static _GetCapabilities_Request_type_support_data_t _GetCapabilities_Request_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _GetCapabilities_Request_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_GetCapabilities_Request_message_typesupport_ids.typesupport_identifier[0],
  &_GetCapabilities_Request_message_typesupport_symbol_names.symbol_name[0],
  &_GetCapabilities_Request_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t GetCapabilities_Request_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_GetCapabilities_Request_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__srv__GetCapabilities_Request__get_type_hash,
  &agenticros_msgs__srv__GetCapabilities_Request__get_type_description,
  &agenticros_msgs__srv__GetCapabilities_Request__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace srv

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::srv::GetCapabilities_Request>()
{
  return &::agenticros_msgs::srv::rosidl_typesupport_cpp::GetCapabilities_Request_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, srv, GetCapabilities_Request)() {
  return get_message_type_support_handle<agenticros_msgs::srv::GetCapabilities_Request>();
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
// #include "agenticros_msgs/srv/detail/get_capabilities__functions.h"
// already included above
// #include "agenticros_msgs/srv/detail/get_capabilities__struct.hpp"
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

typedef struct _GetCapabilities_Response_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _GetCapabilities_Response_type_support_ids_t;

static const _GetCapabilities_Response_type_support_ids_t _GetCapabilities_Response_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _GetCapabilities_Response_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _GetCapabilities_Response_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _GetCapabilities_Response_type_support_symbol_names_t _GetCapabilities_Response_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, srv, GetCapabilities_Response)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, srv, GetCapabilities_Response)),
  }
};

typedef struct _GetCapabilities_Response_type_support_data_t
{
  void * data[2];
} _GetCapabilities_Response_type_support_data_t;

static _GetCapabilities_Response_type_support_data_t _GetCapabilities_Response_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _GetCapabilities_Response_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_GetCapabilities_Response_message_typesupport_ids.typesupport_identifier[0],
  &_GetCapabilities_Response_message_typesupport_symbol_names.symbol_name[0],
  &_GetCapabilities_Response_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t GetCapabilities_Response_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_GetCapabilities_Response_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__srv__GetCapabilities_Response__get_type_hash,
  &agenticros_msgs__srv__GetCapabilities_Response__get_type_description,
  &agenticros_msgs__srv__GetCapabilities_Response__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace srv

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::srv::GetCapabilities_Response>()
{
  return &::agenticros_msgs::srv::rosidl_typesupport_cpp::GetCapabilities_Response_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, srv, GetCapabilities_Response)() {
  return get_message_type_support_handle<agenticros_msgs::srv::GetCapabilities_Response>();
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
// #include "agenticros_msgs/srv/detail/get_capabilities__functions.h"
// already included above
// #include "agenticros_msgs/srv/detail/get_capabilities__struct.hpp"
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

typedef struct _GetCapabilities_Event_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _GetCapabilities_Event_type_support_ids_t;

static const _GetCapabilities_Event_type_support_ids_t _GetCapabilities_Event_message_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _GetCapabilities_Event_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _GetCapabilities_Event_type_support_symbol_names_t;

#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _GetCapabilities_Event_type_support_symbol_names_t _GetCapabilities_Event_message_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, srv, GetCapabilities_Event)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, srv, GetCapabilities_Event)),
  }
};

typedef struct _GetCapabilities_Event_type_support_data_t
{
  void * data[2];
} _GetCapabilities_Event_type_support_data_t;

static _GetCapabilities_Event_type_support_data_t _GetCapabilities_Event_message_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _GetCapabilities_Event_message_typesupport_map = {
  2,
  "agenticros_msgs",
  &_GetCapabilities_Event_message_typesupport_ids.typesupport_identifier[0],
  &_GetCapabilities_Event_message_typesupport_symbol_names.symbol_name[0],
  &_GetCapabilities_Event_message_typesupport_data.data[0],
};

static const rosidl_message_type_support_t GetCapabilities_Event_message_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_GetCapabilities_Event_message_typesupport_map),
  ::rosidl_typesupport_cpp::get_message_typesupport_handle_function,
  &agenticros_msgs__srv__GetCapabilities_Event__get_type_hash,
  &agenticros_msgs__srv__GetCapabilities_Event__get_type_description,
  &agenticros_msgs__srv__GetCapabilities_Event__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace srv

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::srv::GetCapabilities_Event>()
{
  return &::agenticros_msgs::srv::rosidl_typesupport_cpp::GetCapabilities_Event_message_type_support_handle;
}

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, srv, GetCapabilities_Event)() {
  return get_message_type_support_handle<agenticros_msgs::srv::GetCapabilities_Event>();
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
// #include "agenticros_msgs/srv/detail/get_capabilities__struct.hpp"
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

typedef struct _GetCapabilities_type_support_ids_t
{
  const char * typesupport_identifier[2];
} _GetCapabilities_type_support_ids_t;

static const _GetCapabilities_type_support_ids_t _GetCapabilities_service_typesupport_ids = {
  {
    "rosidl_typesupport_fastrtps_cpp",  // ::rosidl_typesupport_fastrtps_cpp::typesupport_identifier,
    "rosidl_typesupport_introspection_cpp",  // ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  }
};

typedef struct _GetCapabilities_type_support_symbol_names_t
{
  const char * symbol_name[2];
} _GetCapabilities_type_support_symbol_names_t;
#define STRINGIFY_(s) #s
#define STRINGIFY(s) STRINGIFY_(s)

static const _GetCapabilities_type_support_symbol_names_t _GetCapabilities_service_typesupport_symbol_names = {
  {
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, srv, GetCapabilities)),
    STRINGIFY(ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, srv, GetCapabilities)),
  }
};

typedef struct _GetCapabilities_type_support_data_t
{
  void * data[2];
} _GetCapabilities_type_support_data_t;

static _GetCapabilities_type_support_data_t _GetCapabilities_service_typesupport_data = {
  {
    0,  // will store the shared library later
    0,  // will store the shared library later
  }
};

static const type_support_map_t _GetCapabilities_service_typesupport_map = {
  2,
  "agenticros_msgs",
  &_GetCapabilities_service_typesupport_ids.typesupport_identifier[0],
  &_GetCapabilities_service_typesupport_symbol_names.symbol_name[0],
  &_GetCapabilities_service_typesupport_data.data[0],
};

static const rosidl_service_type_support_t GetCapabilities_service_type_support_handle = {
  ::rosidl_typesupport_cpp::typesupport_identifier,
  reinterpret_cast<const type_support_map_t *>(&_GetCapabilities_service_typesupport_map),
  ::rosidl_typesupport_cpp::get_service_typesupport_handle_function,
  ::rosidl_typesupport_cpp::get_message_type_support_handle<agenticros_msgs::srv::GetCapabilities_Request>(),
  ::rosidl_typesupport_cpp::get_message_type_support_handle<agenticros_msgs::srv::GetCapabilities_Response>(),
  ::rosidl_typesupport_cpp::get_message_type_support_handle<agenticros_msgs::srv::GetCapabilities_Event>(),
  &::rosidl_typesupport_cpp::service_create_event_message<agenticros_msgs::srv::GetCapabilities>,
  &::rosidl_typesupport_cpp::service_destroy_event_message<agenticros_msgs::srv::GetCapabilities>,
  &agenticros_msgs__srv__GetCapabilities__get_type_hash,
  &agenticros_msgs__srv__GetCapabilities__get_type_description,
  &agenticros_msgs__srv__GetCapabilities__get_type_description_sources,
};

}  // namespace rosidl_typesupport_cpp

}  // namespace srv

}  // namespace agenticros_msgs

namespace rosidl_typesupport_cpp
{

template<>
ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_service_type_support_t *
get_service_type_support_handle<agenticros_msgs::srv::GetCapabilities>()
{
  return &::agenticros_msgs::srv::rosidl_typesupport_cpp::GetCapabilities_service_type_support_handle;
}

}  // namespace rosidl_typesupport_cpp

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_CPP_PUBLIC
const rosidl_service_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__SERVICE_SYMBOL_NAME(rosidl_typesupport_cpp, agenticros_msgs, srv, GetCapabilities)() {
  return ::rosidl_typesupport_cpp::get_service_type_support_handle<agenticros_msgs::srv::GetCapabilities>();
}

#ifdef __cplusplus
}
#endif
