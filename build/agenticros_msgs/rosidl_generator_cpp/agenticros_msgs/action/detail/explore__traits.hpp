// generated from rosidl_generator_cpp/resource/idl__traits.hpp.em
// with input from agenticros_msgs:action/Explore.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/action/explore.hpp"


#ifndef AGENTICROS_MSGS__ACTION__DETAIL__EXPLORE__TRAITS_HPP_
#define AGENTICROS_MSGS__ACTION__DETAIL__EXPLORE__TRAITS_HPP_

#include <stdint.h>

#include <sstream>
#include <string>
#include <type_traits>

#include "agenticros_msgs/action/detail/explore__struct.hpp"
#include "rosidl_runtime_cpp/traits.hpp"

namespace agenticros_msgs
{

namespace action
{

inline void to_flow_style_yaml(
  const Explore_Goal & msg,
  std::ostream & out)
{
  out << "{";
  // member: mode
  {
    out << "mode: ";
    rosidl_generator_traits::value_to_yaml(msg.mode, out);
    out << ", ";
  }

  // member: timeout_s
  {
    out << "timeout_s: ";
    rosidl_generator_traits::value_to_yaml(msg.timeout_s, out);
    out << ", ";
  }

  // member: min_frontier_m
  {
    out << "min_frontier_m: ";
    rosidl_generator_traits::value_to_yaml(msg.min_frontier_m, out);
    out << ", ";
  }

  // member: max_goals
  {
    out << "max_goals: ";
    rosidl_generator_traits::value_to_yaml(msg.max_goals, out);
  }
  out << "}";
}  // NOLINT(readability/fn_size)

inline void to_block_style_yaml(
  const Explore_Goal & msg,
  std::ostream & out, size_t indentation = 0)
{
  // member: mode
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "mode: ";
    rosidl_generator_traits::value_to_yaml(msg.mode, out);
    out << "\n";
  }

  // member: timeout_s
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "timeout_s: ";
    rosidl_generator_traits::value_to_yaml(msg.timeout_s, out);
    out << "\n";
  }

  // member: min_frontier_m
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "min_frontier_m: ";
    rosidl_generator_traits::value_to_yaml(msg.min_frontier_m, out);
    out << "\n";
  }

  // member: max_goals
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "max_goals: ";
    rosidl_generator_traits::value_to_yaml(msg.max_goals, out);
    out << "\n";
  }
}  // NOLINT(readability/fn_size)

inline std::string to_yaml(const Explore_Goal & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::action::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::action::Explore_Goal & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::action::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::action::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::action::Explore_Goal & msg)
{
  return agenticros_msgs::action::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::action::Explore_Goal>()
{
  return "agenticros_msgs::action::Explore_Goal";
}

template<>
inline const char * name<agenticros_msgs::action::Explore_Goal>()
{
  return "agenticros_msgs/action/Explore_Goal";
}

template<>
struct has_fixed_size<agenticros_msgs::action::Explore_Goal>
  : std::integral_constant<bool, false> {};

template<>
struct has_bounded_size<agenticros_msgs::action::Explore_Goal>
  : std::integral_constant<bool, false> {};

template<>
struct is_message<agenticros_msgs::action::Explore_Goal>
  : std::true_type {};

}  // namespace rosidl_generator_traits

namespace agenticros_msgs
{

namespace action
{

inline void to_flow_style_yaml(
  const Explore_Result & msg,
  std::ostream & out)
{
  out << "{";
  // member: success
  {
    out << "success: ";
    rosidl_generator_traits::value_to_yaml(msg.success, out);
    out << ", ";
  }

  // member: message
  {
    out << "message: ";
    rosidl_generator_traits::value_to_yaml(msg.message, out);
    out << ", ";
  }

  // member: coverage_ratio
  {
    out << "coverage_ratio: ";
    rosidl_generator_traits::value_to_yaml(msg.coverage_ratio, out);
    out << ", ";
  }

  // member: goals_sent
  {
    out << "goals_sent: ";
    rosidl_generator_traits::value_to_yaml(msg.goals_sent, out);
  }
  out << "}";
}  // NOLINT(readability/fn_size)

inline void to_block_style_yaml(
  const Explore_Result & msg,
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

  // member: message
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "message: ";
    rosidl_generator_traits::value_to_yaml(msg.message, out);
    out << "\n";
  }

  // member: coverage_ratio
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "coverage_ratio: ";
    rosidl_generator_traits::value_to_yaml(msg.coverage_ratio, out);
    out << "\n";
  }

  // member: goals_sent
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "goals_sent: ";
    rosidl_generator_traits::value_to_yaml(msg.goals_sent, out);
    out << "\n";
  }
}  // NOLINT(readability/fn_size)

inline std::string to_yaml(const Explore_Result & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::action::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::action::Explore_Result & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::action::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::action::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::action::Explore_Result & msg)
{
  return agenticros_msgs::action::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::action::Explore_Result>()
{
  return "agenticros_msgs::action::Explore_Result";
}

template<>
inline const char * name<agenticros_msgs::action::Explore_Result>()
{
  return "agenticros_msgs/action/Explore_Result";
}

template<>
struct has_fixed_size<agenticros_msgs::action::Explore_Result>
  : std::integral_constant<bool, false> {};

template<>
struct has_bounded_size<agenticros_msgs::action::Explore_Result>
  : std::integral_constant<bool, false> {};

template<>
struct is_message<agenticros_msgs::action::Explore_Result>
  : std::true_type {};

}  // namespace rosidl_generator_traits

namespace agenticros_msgs
{

namespace action
{

inline void to_flow_style_yaml(
  const Explore_Feedback & msg,
  std::ostream & out)
{
  out << "{";
  // member: state
  {
    out << "state: ";
    rosidl_generator_traits::value_to_yaml(msg.state, out);
    out << ", ";
  }

  // member: coverage_ratio
  {
    out << "coverage_ratio: ";
    rosidl_generator_traits::value_to_yaml(msg.coverage_ratio, out);
    out << ", ";
  }

  // member: goals_sent
  {
    out << "goals_sent: ";
    rosidl_generator_traits::value_to_yaml(msg.goals_sent, out);
    out << ", ";
  }

  // member: elapsed_s
  {
    out << "elapsed_s: ";
    rosidl_generator_traits::value_to_yaml(msg.elapsed_s, out);
  }
  out << "}";
}  // NOLINT(readability/fn_size)

inline void to_block_style_yaml(
  const Explore_Feedback & msg,
  std::ostream & out, size_t indentation = 0)
{
  // member: state
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "state: ";
    rosidl_generator_traits::value_to_yaml(msg.state, out);
    out << "\n";
  }

  // member: coverage_ratio
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "coverage_ratio: ";
    rosidl_generator_traits::value_to_yaml(msg.coverage_ratio, out);
    out << "\n";
  }

  // member: goals_sent
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "goals_sent: ";
    rosidl_generator_traits::value_to_yaml(msg.goals_sent, out);
    out << "\n";
  }

  // member: elapsed_s
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "elapsed_s: ";
    rosidl_generator_traits::value_to_yaml(msg.elapsed_s, out);
    out << "\n";
  }
}  // NOLINT(readability/fn_size)

inline std::string to_yaml(const Explore_Feedback & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::action::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::action::Explore_Feedback & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::action::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::action::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::action::Explore_Feedback & msg)
{
  return agenticros_msgs::action::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::action::Explore_Feedback>()
{
  return "agenticros_msgs::action::Explore_Feedback";
}

template<>
inline const char * name<agenticros_msgs::action::Explore_Feedback>()
{
  return "agenticros_msgs/action/Explore_Feedback";
}

template<>
struct has_fixed_size<agenticros_msgs::action::Explore_Feedback>
  : std::integral_constant<bool, false> {};

template<>
struct has_bounded_size<agenticros_msgs::action::Explore_Feedback>
  : std::integral_constant<bool, false> {};

template<>
struct is_message<agenticros_msgs::action::Explore_Feedback>
  : std::true_type {};

}  // namespace rosidl_generator_traits

// Include directives for member types
// Member 'goal_id'
#include "unique_identifier_msgs/msg/detail/uuid__traits.hpp"
// Member 'goal'
#include "agenticros_msgs/action/detail/explore__traits.hpp"

namespace agenticros_msgs
{

namespace action
{

inline void to_flow_style_yaml(
  const Explore_SendGoal_Request & msg,
  std::ostream & out)
{
  out << "{";
  // member: goal_id
  {
    out << "goal_id: ";
    to_flow_style_yaml(msg.goal_id, out);
    out << ", ";
  }

  // member: goal
  {
    out << "goal: ";
    to_flow_style_yaml(msg.goal, out);
  }
  out << "}";
}  // NOLINT(readability/fn_size)

inline void to_block_style_yaml(
  const Explore_SendGoal_Request & msg,
  std::ostream & out, size_t indentation = 0)
{
  // member: goal_id
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "goal_id:\n";
    to_block_style_yaml(msg.goal_id, out, indentation + 2);
  }

  // member: goal
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "goal:\n";
    to_block_style_yaml(msg.goal, out, indentation + 2);
  }
}  // NOLINT(readability/fn_size)

inline std::string to_yaml(const Explore_SendGoal_Request & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::action::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::action::Explore_SendGoal_Request & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::action::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::action::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::action::Explore_SendGoal_Request & msg)
{
  return agenticros_msgs::action::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::action::Explore_SendGoal_Request>()
{
  return "agenticros_msgs::action::Explore_SendGoal_Request";
}

template<>
inline const char * name<agenticros_msgs::action::Explore_SendGoal_Request>()
{
  return "agenticros_msgs/action/Explore_SendGoal_Request";
}

template<>
struct has_fixed_size<agenticros_msgs::action::Explore_SendGoal_Request>
  : std::integral_constant<bool, has_fixed_size<agenticros_msgs::action::Explore_Goal>::value && has_fixed_size<unique_identifier_msgs::msg::UUID>::value> {};

template<>
struct has_bounded_size<agenticros_msgs::action::Explore_SendGoal_Request>
  : std::integral_constant<bool, has_bounded_size<agenticros_msgs::action::Explore_Goal>::value && has_bounded_size<unique_identifier_msgs::msg::UUID>::value> {};

template<>
struct is_message<agenticros_msgs::action::Explore_SendGoal_Request>
  : std::true_type {};

}  // namespace rosidl_generator_traits

// Include directives for member types
// Member 'stamp'
#include "builtin_interfaces/msg/detail/time__traits.hpp"

namespace agenticros_msgs
{

namespace action
{

inline void to_flow_style_yaml(
  const Explore_SendGoal_Response & msg,
  std::ostream & out)
{
  out << "{";
  // member: accepted
  {
    out << "accepted: ";
    rosidl_generator_traits::value_to_yaml(msg.accepted, out);
    out << ", ";
  }

  // member: stamp
  {
    out << "stamp: ";
    to_flow_style_yaml(msg.stamp, out);
  }
  out << "}";
}  // NOLINT(readability/fn_size)

inline void to_block_style_yaml(
  const Explore_SendGoal_Response & msg,
  std::ostream & out, size_t indentation = 0)
{
  // member: accepted
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "accepted: ";
    rosidl_generator_traits::value_to_yaml(msg.accepted, out);
    out << "\n";
  }

  // member: stamp
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "stamp:\n";
    to_block_style_yaml(msg.stamp, out, indentation + 2);
  }
}  // NOLINT(readability/fn_size)

inline std::string to_yaml(const Explore_SendGoal_Response & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::action::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::action::Explore_SendGoal_Response & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::action::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::action::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::action::Explore_SendGoal_Response & msg)
{
  return agenticros_msgs::action::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::action::Explore_SendGoal_Response>()
{
  return "agenticros_msgs::action::Explore_SendGoal_Response";
}

template<>
inline const char * name<agenticros_msgs::action::Explore_SendGoal_Response>()
{
  return "agenticros_msgs/action/Explore_SendGoal_Response";
}

template<>
struct has_fixed_size<agenticros_msgs::action::Explore_SendGoal_Response>
  : std::integral_constant<bool, has_fixed_size<builtin_interfaces::msg::Time>::value> {};

template<>
struct has_bounded_size<agenticros_msgs::action::Explore_SendGoal_Response>
  : std::integral_constant<bool, has_bounded_size<builtin_interfaces::msg::Time>::value> {};

template<>
struct is_message<agenticros_msgs::action::Explore_SendGoal_Response>
  : std::true_type {};

}  // namespace rosidl_generator_traits

// Include directives for member types
// Member 'info'
#include "service_msgs/msg/detail/service_event_info__traits.hpp"

namespace agenticros_msgs
{

namespace action
{

inline void to_flow_style_yaml(
  const Explore_SendGoal_Event & msg,
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
  const Explore_SendGoal_Event & msg,
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

inline std::string to_yaml(const Explore_SendGoal_Event & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::action::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::action::Explore_SendGoal_Event & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::action::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::action::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::action::Explore_SendGoal_Event & msg)
{
  return agenticros_msgs::action::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::action::Explore_SendGoal_Event>()
{
  return "agenticros_msgs::action::Explore_SendGoal_Event";
}

template<>
inline const char * name<agenticros_msgs::action::Explore_SendGoal_Event>()
{
  return "agenticros_msgs/action/Explore_SendGoal_Event";
}

template<>
struct has_fixed_size<agenticros_msgs::action::Explore_SendGoal_Event>
  : std::integral_constant<bool, false> {};

template<>
struct has_bounded_size<agenticros_msgs::action::Explore_SendGoal_Event>
  : std::integral_constant<bool, has_bounded_size<agenticros_msgs::action::Explore_SendGoal_Request>::value && has_bounded_size<agenticros_msgs::action::Explore_SendGoal_Response>::value && has_bounded_size<service_msgs::msg::ServiceEventInfo>::value> {};

template<>
struct is_message<agenticros_msgs::action::Explore_SendGoal_Event>
  : std::true_type {};

}  // namespace rosidl_generator_traits

namespace rosidl_generator_traits
{

template<>
inline const char * data_type<agenticros_msgs::action::Explore_SendGoal>()
{
  return "agenticros_msgs::action::Explore_SendGoal";
}

template<>
inline const char * name<agenticros_msgs::action::Explore_SendGoal>()
{
  return "agenticros_msgs/action/Explore_SendGoal";
}

template<>
struct has_fixed_size<agenticros_msgs::action::Explore_SendGoal>
  : std::integral_constant<
    bool,
    has_fixed_size<agenticros_msgs::action::Explore_SendGoal_Request>::value &&
    has_fixed_size<agenticros_msgs::action::Explore_SendGoal_Response>::value
  >
{
};

template<>
struct has_bounded_size<agenticros_msgs::action::Explore_SendGoal>
  : std::integral_constant<
    bool,
    has_bounded_size<agenticros_msgs::action::Explore_SendGoal_Request>::value &&
    has_bounded_size<agenticros_msgs::action::Explore_SendGoal_Response>::value
  >
{
};

template<>
struct is_service<agenticros_msgs::action::Explore_SendGoal>
  : std::true_type
{
};

template<>
struct is_service_request<agenticros_msgs::action::Explore_SendGoal_Request>
  : std::true_type
{
};

template<>
struct is_service_response<agenticros_msgs::action::Explore_SendGoal_Response>
  : std::true_type
{
};

}  // namespace rosidl_generator_traits

// Include directives for member types
// Member 'goal_id'
// already included above
// #include "unique_identifier_msgs/msg/detail/uuid__traits.hpp"

namespace agenticros_msgs
{

namespace action
{

inline void to_flow_style_yaml(
  const Explore_GetResult_Request & msg,
  std::ostream & out)
{
  out << "{";
  // member: goal_id
  {
    out << "goal_id: ";
    to_flow_style_yaml(msg.goal_id, out);
  }
  out << "}";
}  // NOLINT(readability/fn_size)

inline void to_block_style_yaml(
  const Explore_GetResult_Request & msg,
  std::ostream & out, size_t indentation = 0)
{
  // member: goal_id
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "goal_id:\n";
    to_block_style_yaml(msg.goal_id, out, indentation + 2);
  }
}  // NOLINT(readability/fn_size)

inline std::string to_yaml(const Explore_GetResult_Request & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::action::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::action::Explore_GetResult_Request & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::action::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::action::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::action::Explore_GetResult_Request & msg)
{
  return agenticros_msgs::action::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::action::Explore_GetResult_Request>()
{
  return "agenticros_msgs::action::Explore_GetResult_Request";
}

template<>
inline const char * name<agenticros_msgs::action::Explore_GetResult_Request>()
{
  return "agenticros_msgs/action/Explore_GetResult_Request";
}

template<>
struct has_fixed_size<agenticros_msgs::action::Explore_GetResult_Request>
  : std::integral_constant<bool, has_fixed_size<unique_identifier_msgs::msg::UUID>::value> {};

template<>
struct has_bounded_size<agenticros_msgs::action::Explore_GetResult_Request>
  : std::integral_constant<bool, has_bounded_size<unique_identifier_msgs::msg::UUID>::value> {};

template<>
struct is_message<agenticros_msgs::action::Explore_GetResult_Request>
  : std::true_type {};

}  // namespace rosidl_generator_traits

// Include directives for member types
// Member 'result'
// already included above
// #include "agenticros_msgs/action/detail/explore__traits.hpp"

namespace agenticros_msgs
{

namespace action
{

inline void to_flow_style_yaml(
  const Explore_GetResult_Response & msg,
  std::ostream & out)
{
  out << "{";
  // member: status
  {
    out << "status: ";
    rosidl_generator_traits::value_to_yaml(msg.status, out);
    out << ", ";
  }

  // member: result
  {
    out << "result: ";
    to_flow_style_yaml(msg.result, out);
  }
  out << "}";
}  // NOLINT(readability/fn_size)

inline void to_block_style_yaml(
  const Explore_GetResult_Response & msg,
  std::ostream & out, size_t indentation = 0)
{
  // member: status
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "status: ";
    rosidl_generator_traits::value_to_yaml(msg.status, out);
    out << "\n";
  }

  // member: result
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "result:\n";
    to_block_style_yaml(msg.result, out, indentation + 2);
  }
}  // NOLINT(readability/fn_size)

inline std::string to_yaml(const Explore_GetResult_Response & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::action::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::action::Explore_GetResult_Response & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::action::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::action::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::action::Explore_GetResult_Response & msg)
{
  return agenticros_msgs::action::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::action::Explore_GetResult_Response>()
{
  return "agenticros_msgs::action::Explore_GetResult_Response";
}

template<>
inline const char * name<agenticros_msgs::action::Explore_GetResult_Response>()
{
  return "agenticros_msgs/action/Explore_GetResult_Response";
}

template<>
struct has_fixed_size<agenticros_msgs::action::Explore_GetResult_Response>
  : std::integral_constant<bool, has_fixed_size<agenticros_msgs::action::Explore_Result>::value> {};

template<>
struct has_bounded_size<agenticros_msgs::action::Explore_GetResult_Response>
  : std::integral_constant<bool, has_bounded_size<agenticros_msgs::action::Explore_Result>::value> {};

template<>
struct is_message<agenticros_msgs::action::Explore_GetResult_Response>
  : std::true_type {};

}  // namespace rosidl_generator_traits

// Include directives for member types
// Member 'info'
// already included above
// #include "service_msgs/msg/detail/service_event_info__traits.hpp"

namespace agenticros_msgs
{

namespace action
{

inline void to_flow_style_yaml(
  const Explore_GetResult_Event & msg,
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
  const Explore_GetResult_Event & msg,
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

inline std::string to_yaml(const Explore_GetResult_Event & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::action::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::action::Explore_GetResult_Event & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::action::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::action::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::action::Explore_GetResult_Event & msg)
{
  return agenticros_msgs::action::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::action::Explore_GetResult_Event>()
{
  return "agenticros_msgs::action::Explore_GetResult_Event";
}

template<>
inline const char * name<agenticros_msgs::action::Explore_GetResult_Event>()
{
  return "agenticros_msgs/action/Explore_GetResult_Event";
}

template<>
struct has_fixed_size<agenticros_msgs::action::Explore_GetResult_Event>
  : std::integral_constant<bool, false> {};

template<>
struct has_bounded_size<agenticros_msgs::action::Explore_GetResult_Event>
  : std::integral_constant<bool, has_bounded_size<agenticros_msgs::action::Explore_GetResult_Request>::value && has_bounded_size<agenticros_msgs::action::Explore_GetResult_Response>::value && has_bounded_size<service_msgs::msg::ServiceEventInfo>::value> {};

template<>
struct is_message<agenticros_msgs::action::Explore_GetResult_Event>
  : std::true_type {};

}  // namespace rosidl_generator_traits

namespace rosidl_generator_traits
{

template<>
inline const char * data_type<agenticros_msgs::action::Explore_GetResult>()
{
  return "agenticros_msgs::action::Explore_GetResult";
}

template<>
inline const char * name<agenticros_msgs::action::Explore_GetResult>()
{
  return "agenticros_msgs/action/Explore_GetResult";
}

template<>
struct has_fixed_size<agenticros_msgs::action::Explore_GetResult>
  : std::integral_constant<
    bool,
    has_fixed_size<agenticros_msgs::action::Explore_GetResult_Request>::value &&
    has_fixed_size<agenticros_msgs::action::Explore_GetResult_Response>::value
  >
{
};

template<>
struct has_bounded_size<agenticros_msgs::action::Explore_GetResult>
  : std::integral_constant<
    bool,
    has_bounded_size<agenticros_msgs::action::Explore_GetResult_Request>::value &&
    has_bounded_size<agenticros_msgs::action::Explore_GetResult_Response>::value
  >
{
};

template<>
struct is_service<agenticros_msgs::action::Explore_GetResult>
  : std::true_type
{
};

template<>
struct is_service_request<agenticros_msgs::action::Explore_GetResult_Request>
  : std::true_type
{
};

template<>
struct is_service_response<agenticros_msgs::action::Explore_GetResult_Response>
  : std::true_type
{
};

}  // namespace rosidl_generator_traits

// Include directives for member types
// Member 'goal_id'
// already included above
// #include "unique_identifier_msgs/msg/detail/uuid__traits.hpp"
// Member 'feedback'
// already included above
// #include "agenticros_msgs/action/detail/explore__traits.hpp"

namespace agenticros_msgs
{

namespace action
{

inline void to_flow_style_yaml(
  const Explore_FeedbackMessage & msg,
  std::ostream & out)
{
  out << "{";
  // member: goal_id
  {
    out << "goal_id: ";
    to_flow_style_yaml(msg.goal_id, out);
    out << ", ";
  }

  // member: feedback
  {
    out << "feedback: ";
    to_flow_style_yaml(msg.feedback, out);
  }
  out << "}";
}  // NOLINT(readability/fn_size)

inline void to_block_style_yaml(
  const Explore_FeedbackMessage & msg,
  std::ostream & out, size_t indentation = 0)
{
  // member: goal_id
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "goal_id:\n";
    to_block_style_yaml(msg.goal_id, out, indentation + 2);
  }

  // member: feedback
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "feedback:\n";
    to_block_style_yaml(msg.feedback, out, indentation + 2);
  }
}  // NOLINT(readability/fn_size)

inline std::string to_yaml(const Explore_FeedbackMessage & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace action

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::action::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::action::Explore_FeedbackMessage & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::action::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::action::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::action::Explore_FeedbackMessage & msg)
{
  return agenticros_msgs::action::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::action::Explore_FeedbackMessage>()
{
  return "agenticros_msgs::action::Explore_FeedbackMessage";
}

template<>
inline const char * name<agenticros_msgs::action::Explore_FeedbackMessage>()
{
  return "agenticros_msgs/action/Explore_FeedbackMessage";
}

template<>
struct has_fixed_size<agenticros_msgs::action::Explore_FeedbackMessage>
  : std::integral_constant<bool, has_fixed_size<agenticros_msgs::action::Explore_Feedback>::value && has_fixed_size<unique_identifier_msgs::msg::UUID>::value> {};

template<>
struct has_bounded_size<agenticros_msgs::action::Explore_FeedbackMessage>
  : std::integral_constant<bool, has_bounded_size<agenticros_msgs::action::Explore_Feedback>::value && has_bounded_size<unique_identifier_msgs::msg::UUID>::value> {};

template<>
struct is_message<agenticros_msgs::action::Explore_FeedbackMessage>
  : std::true_type {};

}  // namespace rosidl_generator_traits


namespace rosidl_generator_traits
{

template<>
struct is_action<agenticros_msgs::action::Explore>
  : std::true_type
{
};

template<>
struct is_action_goal<agenticros_msgs::action::Explore_Goal>
  : std::true_type
{
};

template<>
struct is_action_result<agenticros_msgs::action::Explore_Result>
  : std::true_type
{
};

template<>
struct is_action_feedback<agenticros_msgs::action::Explore_Feedback>
  : std::true_type
{
};

}  // namespace rosidl_generator_traits


#endif  // AGENTICROS_MSGS__ACTION__DETAIL__EXPLORE__TRAITS_HPP_
