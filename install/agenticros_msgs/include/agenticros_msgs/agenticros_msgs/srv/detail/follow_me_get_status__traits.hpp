// generated from rosidl_generator_cpp/resource/idl__traits.hpp.em
// with input from agenticros_msgs:srv/FollowMeGetStatus.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/srv/follow_me_get_status.hpp"


#ifndef AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_GET_STATUS__TRAITS_HPP_
#define AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_GET_STATUS__TRAITS_HPP_

#include <stdint.h>

#include <sstream>
#include <string>
#include <type_traits>

#include "agenticros_msgs/srv/detail/follow_me_get_status__struct.hpp"
#include "rosidl_runtime_cpp/traits.hpp"

namespace agenticros_msgs
{

namespace srv
{

inline void to_flow_style_yaml(
  const FollowMeGetStatus_Request & msg,
  std::ostream & out)
{
  (void)msg;
  out << "null";
}  // NOLINT(readability/fn_size)

inline void to_block_style_yaml(
  const FollowMeGetStatus_Request & msg,
  std::ostream & out, size_t indentation = 0)
{
  (void)msg;
  (void)indentation;
  out << "null\n";
}  // NOLINT(readability/fn_size)

inline std::string to_yaml(const FollowMeGetStatus_Request & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace srv

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::srv::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::srv::FollowMeGetStatus_Request & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::srv::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::srv::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::srv::FollowMeGetStatus_Request & msg)
{
  return agenticros_msgs::srv::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::srv::FollowMeGetStatus_Request>()
{
  return "agenticros_msgs::srv::FollowMeGetStatus_Request";
}

template<>
inline const char * name<agenticros_msgs::srv::FollowMeGetStatus_Request>()
{
  return "agenticros_msgs/srv/FollowMeGetStatus_Request";
}

template<>
struct has_fixed_size<agenticros_msgs::srv::FollowMeGetStatus_Request>
  : std::integral_constant<bool, true> {};

template<>
struct has_bounded_size<agenticros_msgs::srv::FollowMeGetStatus_Request>
  : std::integral_constant<bool, true> {};

template<>
struct is_message<agenticros_msgs::srv::FollowMeGetStatus_Request>
  : std::true_type {};

}  // namespace rosidl_generator_traits

// Include directives for member types
// Member 'twist'
#include "geometry_msgs/msg/detail/twist__traits.hpp"

namespace agenticros_msgs
{

namespace srv
{

inline void to_flow_style_yaml(
  const FollowMeGetStatus_Response & msg,
  std::ostream & out)
{
  out << "{";
  // member: success
  {
    out << "success: ";
    rosidl_generator_traits::value_to_yaml(msg.success, out);
    out << ", ";
  }

  // member: enabled
  {
    out << "enabled: ";
    rosidl_generator_traits::value_to_yaml(msg.enabled, out);
    out << ", ";
  }

  // member: tracking
  {
    out << "tracking: ";
    rosidl_generator_traits::value_to_yaml(msg.tracking, out);
    out << ", ";
  }

  // member: target_distance
  {
    out << "target_distance: ";
    rosidl_generator_traits::value_to_yaml(msg.target_distance, out);
    out << ", ";
  }

  // member: current_distance
  {
    out << "current_distance: ";
    rosidl_generator_traits::value_to_yaml(msg.current_distance, out);
    out << ", ";
  }

  // member: target_person_id
  {
    out << "target_person_id: ";
    rosidl_generator_traits::value_to_yaml(msg.target_person_id, out);
    out << ", ";
  }

  // member: target_description
  {
    out << "target_description: ";
    rosidl_generator_traits::value_to_yaml(msg.target_description, out);
    out << ", ";
  }

  // member: persons_detected
  {
    out << "persons_detected: ";
    rosidl_generator_traits::value_to_yaml(msg.persons_detected, out);
    out << ", ";
  }

  // member: twist
  {
    out << "twist: ";
    to_flow_style_yaml(msg.twist, out);
    out << ", ";
  }

  // member: error_message
  {
    out << "error_message: ";
    rosidl_generator_traits::value_to_yaml(msg.error_message, out);
  }
  out << "}";
}  // NOLINT(readability/fn_size)

inline void to_block_style_yaml(
  const FollowMeGetStatus_Response & msg,
  std::ostream & out, size_t indentation = 0)
{
  // member: success
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "success: ";
    rosidl_generator_traits::value_to_yaml(msg.success, out);
    out << "\n";
  }

  // member: enabled
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "enabled: ";
    rosidl_generator_traits::value_to_yaml(msg.enabled, out);
    out << "\n";
  }

  // member: tracking
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "tracking: ";
    rosidl_generator_traits::value_to_yaml(msg.tracking, out);
    out << "\n";
  }

  // member: target_distance
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "target_distance: ";
    rosidl_generator_traits::value_to_yaml(msg.target_distance, out);
    out << "\n";
  }

  // member: current_distance
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "current_distance: ";
    rosidl_generator_traits::value_to_yaml(msg.current_distance, out);
    out << "\n";
  }

  // member: target_person_id
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "target_person_id: ";
    rosidl_generator_traits::value_to_yaml(msg.target_person_id, out);
    out << "\n";
  }

  // member: target_description
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "target_description: ";
    rosidl_generator_traits::value_to_yaml(msg.target_description, out);
    out << "\n";
  }

  // member: persons_detected
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "persons_detected: ";
    rosidl_generator_traits::value_to_yaml(msg.persons_detected, out);
    out << "\n";
  }

  // member: twist
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "twist:\n";
    to_block_style_yaml(msg.twist, out, indentation + 2);
  }

  // member: error_message
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "error_message: ";
    rosidl_generator_traits::value_to_yaml(msg.error_message, out);
    out << "\n";
  }
}  // NOLINT(readability/fn_size)

inline std::string to_yaml(const FollowMeGetStatus_Response & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace srv

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::srv::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::srv::FollowMeGetStatus_Response & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::srv::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::srv::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::srv::FollowMeGetStatus_Response & msg)
{
  return agenticros_msgs::srv::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::srv::FollowMeGetStatus_Response>()
{
  return "agenticros_msgs::srv::FollowMeGetStatus_Response";
}

template<>
inline const char * name<agenticros_msgs::srv::FollowMeGetStatus_Response>()
{
  return "agenticros_msgs/srv/FollowMeGetStatus_Response";
}

template<>
struct has_fixed_size<agenticros_msgs::srv::FollowMeGetStatus_Response>
  : std::integral_constant<bool, false> {};

template<>
struct has_bounded_size<agenticros_msgs::srv::FollowMeGetStatus_Response>
  : std::integral_constant<bool, false> {};

template<>
struct is_message<agenticros_msgs::srv::FollowMeGetStatus_Response>
  : std::true_type {};

}  // namespace rosidl_generator_traits

// Include directives for member types
// Member 'info'
#include "service_msgs/msg/detail/service_event_info__traits.hpp"

namespace agenticros_msgs
{

namespace srv
{

inline void to_flow_style_yaml(
  const FollowMeGetStatus_Event & msg,
  std::ostream & out)
{
  out << "{";
  // member: info
  {
    out << "info: ";
    to_flow_style_yaml(msg.info, out);
    out << ", ";
  }

  // member: request
  {
    if (msg.request.size() == 0) {
      out << "request: []";
    } else {
      out << "request: [";
      size_t pending_items = msg.request.size();
      for (auto item : msg.request) {
        to_flow_style_yaml(item, out);
        if (--pending_items > 0) {
          out << ", ";
        }
      }
      out << "]";
    }
    out << ", ";
  }

  // member: response
  {
    if (msg.response.size() == 0) {
      out << "response: []";
    } else {
      out << "response: [";
      size_t pending_items = msg.response.size();
      for (auto item : msg.response) {
        to_flow_style_yaml(item, out);
        if (--pending_items > 0) {
          out << ", ";
        }
      }
      out << "]";
    }
  }
  out << "}";
}  // NOLINT(readability/fn_size)

inline void to_block_style_yaml(
  const FollowMeGetStatus_Event & msg,
  std::ostream & out, size_t indentation = 0)
{
  // member: info
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "info:\n";
    to_block_style_yaml(msg.info, out, indentation + 2);
  }

  // member: request
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    if (msg.request.size() == 0) {
      out << "request: []\n";
    } else {
      out << "request:\n";
      for (auto item : msg.request) {
        if (indentation > 0) {
          out << std::string(indentation, ' ');
        }
        out << "-\n";
        to_block_style_yaml(item, out, indentation + 2);
      }
    }
  }

  // member: response
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    if (msg.response.size() == 0) {
      out << "response: []\n";
    } else {
      out << "response:\n";
      for (auto item : msg.response) {
        if (indentation > 0) {
          out << std::string(indentation, ' ');
        }
        out << "-\n";
        to_block_style_yaml(item, out, indentation + 2);
      }
    }
  }
}  // NOLINT(readability/fn_size)

inline std::string to_yaml(const FollowMeGetStatus_Event & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace srv

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::srv::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::srv::FollowMeGetStatus_Event & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::srv::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::srv::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::srv::FollowMeGetStatus_Event & msg)
{
  return agenticros_msgs::srv::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::srv::FollowMeGetStatus_Event>()
{
  return "agenticros_msgs::srv::FollowMeGetStatus_Event";
}

template<>
inline const char * name<agenticros_msgs::srv::FollowMeGetStatus_Event>()
{
  return "agenticros_msgs/srv/FollowMeGetStatus_Event";
}

template<>
struct has_fixed_size<agenticros_msgs::srv::FollowMeGetStatus_Event>
  : std::integral_constant<bool, false> {};

template<>
struct has_bounded_size<agenticros_msgs::srv::FollowMeGetStatus_Event>
  : std::integral_constant<bool, has_bounded_size<agenticros_msgs::srv::FollowMeGetStatus_Request>::value && has_bounded_size<agenticros_msgs::srv::FollowMeGetStatus_Response>::value && has_bounded_size<service_msgs::msg::ServiceEventInfo>::value> {};

template<>
struct is_message<agenticros_msgs::srv::FollowMeGetStatus_Event>
  : std::true_type {};

}  // namespace rosidl_generator_traits

namespace rosidl_generator_traits
{

template<>
inline const char * data_type<agenticros_msgs::srv::FollowMeGetStatus>()
{
  return "agenticros_msgs::srv::FollowMeGetStatus";
}

template<>
inline const char * name<agenticros_msgs::srv::FollowMeGetStatus>()
{
  return "agenticros_msgs/srv/FollowMeGetStatus";
}

template<>
struct has_fixed_size<agenticros_msgs::srv::FollowMeGetStatus>
  : std::integral_constant<
    bool,
    has_fixed_size<agenticros_msgs::srv::FollowMeGetStatus_Request>::value &&
    has_fixed_size<agenticros_msgs::srv::FollowMeGetStatus_Response>::value
  >
{
};

template<>
struct has_bounded_size<agenticros_msgs::srv::FollowMeGetStatus>
  : std::integral_constant<
    bool,
    has_bounded_size<agenticros_msgs::srv::FollowMeGetStatus_Request>::value &&
    has_bounded_size<agenticros_msgs::srv::FollowMeGetStatus_Response>::value
  >
{
};

template<>
struct is_service<agenticros_msgs::srv::FollowMeGetStatus>
  : std::true_type
{
};

template<>
struct is_service_request<agenticros_msgs::srv::FollowMeGetStatus_Request>
  : std::true_type
{
};

template<>
struct is_service_response<agenticros_msgs::srv::FollowMeGetStatus_Response>
  : std::true_type
{
};

}  // namespace rosidl_generator_traits

#endif  // AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_GET_STATUS__TRAITS_HPP_
