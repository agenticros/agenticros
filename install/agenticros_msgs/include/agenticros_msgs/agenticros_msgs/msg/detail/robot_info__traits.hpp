// generated from rosidl_generator_cpp/resource/idl__traits.hpp.em
// with input from agenticros_msgs:msg/RobotInfo.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/msg/robot_info.hpp"


#ifndef AGENTICROS_MSGS__MSG__DETAIL__ROBOT_INFO__TRAITS_HPP_
#define AGENTICROS_MSGS__MSG__DETAIL__ROBOT_INFO__TRAITS_HPP_

#include <stdint.h>

#include <sstream>
#include <string>
#include <type_traits>

#include "agenticros_msgs/msg/detail/robot_info__struct.hpp"
#include "rosidl_runtime_cpp/traits.hpp"

// Include directives for member types
// Member 'stamp'
#include "builtin_interfaces/msg/detail/time__traits.hpp"

namespace agenticros_msgs
{

namespace msg
{

inline void to_flow_style_yaml(
  const RobotInfo & msg,
  std::ostream & out)
{
  out << "{";
  // member: id
  {
    out << "id: ";
    rosidl_generator_traits::value_to_yaml(msg.id, out);
    out << ", ";
  }

  // member: name
  {
    out << "name: ";
    rosidl_generator_traits::value_to_yaml(msg.name, out);
    out << ", ";
  }

  // member: kind
  {
    out << "kind: ";
    rosidl_generator_traits::value_to_yaml(msg.kind, out);
    out << ", ";
  }

  // member: robot_namespace
  {
    out << "robot_namespace: ";
    rosidl_generator_traits::value_to_yaml(msg.robot_namespace, out);
    out << ", ";
  }

  // member: capability_ids
  {
    if (msg.capability_ids.size() == 0) {
      out << "capability_ids: []";
    } else {
      out << "capability_ids: [";
      size_t pending_items = msg.capability_ids.size();
      for (auto item : msg.capability_ids) {
        rosidl_generator_traits::value_to_yaml(item, out);
        if (--pending_items > 0) {
          out << ", ";
        }
      }
      out << "]";
    }
    out << ", ";
  }

  // member: has_realsense
  {
    out << "has_realsense: ";
    rosidl_generator_traits::value_to_yaml(msg.has_realsense, out);
    out << ", ";
  }

  // member: has_lidar
  {
    out << "has_lidar: ";
    rosidl_generator_traits::value_to_yaml(msg.has_lidar, out);
    out << ", ";
  }

  // member: has_arm
  {
    out << "has_arm: ";
    rosidl_generator_traits::value_to_yaml(msg.has_arm, out);
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
  const RobotInfo & msg,
  std::ostream & out, size_t indentation = 0)
{
  // member: id
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "id: ";
    rosidl_generator_traits::value_to_yaml(msg.id, out);
    out << "\n";
  }

  // member: name
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "name: ";
    rosidl_generator_traits::value_to_yaml(msg.name, out);
    out << "\n";
  }

  // member: kind
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "kind: ";
    rosidl_generator_traits::value_to_yaml(msg.kind, out);
    out << "\n";
  }

  // member: robot_namespace
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "robot_namespace: ";
    rosidl_generator_traits::value_to_yaml(msg.robot_namespace, out);
    out << "\n";
  }

  // member: capability_ids
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    if (msg.capability_ids.size() == 0) {
      out << "capability_ids: []\n";
    } else {
      out << "capability_ids:\n";
      for (auto item : msg.capability_ids) {
        if (indentation > 0) {
          out << std::string(indentation, ' ');
        }
        out << "- ";
        rosidl_generator_traits::value_to_yaml(item, out);
        out << "\n";
      }
    }
  }

  // member: has_realsense
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "has_realsense: ";
    rosidl_generator_traits::value_to_yaml(msg.has_realsense, out);
    out << "\n";
  }

  // member: has_lidar
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "has_lidar: ";
    rosidl_generator_traits::value_to_yaml(msg.has_lidar, out);
    out << "\n";
  }

  // member: has_arm
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "has_arm: ";
    rosidl_generator_traits::value_to_yaml(msg.has_arm, out);
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

inline std::string to_yaml(const RobotInfo & msg, bool use_flow_style = false)
{
  std::ostringstream out;
  if (use_flow_style) {
    to_flow_style_yaml(msg, out);
  } else {
    to_block_style_yaml(msg, out);
  }
  return out.str();
}

}  // namespace msg

}  // namespace agenticros_msgs

namespace rosidl_generator_traits
{

[[deprecated("use agenticros_msgs::msg::to_block_style_yaml() instead")]]
inline void to_yaml(
  const agenticros_msgs::msg::RobotInfo & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::msg::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::msg::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::msg::RobotInfo & msg)
{
  return agenticros_msgs::msg::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::msg::RobotInfo>()
{
  return "agenticros_msgs::msg::RobotInfo";
}

template<>
inline const char * name<agenticros_msgs::msg::RobotInfo>()
{
  return "agenticros_msgs/msg/RobotInfo";
}

template<>
struct has_fixed_size<agenticros_msgs::msg::RobotInfo>
  : std::integral_constant<bool, false> {};

template<>
struct has_bounded_size<agenticros_msgs::msg::RobotInfo>
  : std::integral_constant<bool, false> {};

template<>
struct is_message<agenticros_msgs::msg::RobotInfo>
  : std::true_type {};

}  // namespace rosidl_generator_traits

#endif  // AGENTICROS_MSGS__MSG__DETAIL__ROBOT_INFO__TRAITS_HPP_
