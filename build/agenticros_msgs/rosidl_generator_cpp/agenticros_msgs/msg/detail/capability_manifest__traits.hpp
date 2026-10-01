// generated from rosidl_generator_cpp/resource/idl__traits.hpp.em
// with input from agenticros_msgs:msg/CapabilityManifest.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/msg/capability_manifest.hpp"


#ifndef AGENTICROS_MSGS__MSG__DETAIL__CAPABILITY_MANIFEST__TRAITS_HPP_
#define AGENTICROS_MSGS__MSG__DETAIL__CAPABILITY_MANIFEST__TRAITS_HPP_

#include <stdint.h>

#include <sstream>
#include <string>
#include <type_traits>

#include "agenticros_msgs/msg/detail/capability_manifest__struct.hpp"
#include "rosidl_runtime_cpp/traits.hpp"

// Include directives for member types
// Member 'stamp'
#include "builtin_interfaces/msg/detail/time__traits.hpp"

namespace agenticros_msgs
{

namespace msg
{

inline void to_flow_style_yaml(
  const CapabilityManifest & msg,
  std::ostream & out)
{
  out << "{";
  // member: robot_name
  {
    out << "robot_name: ";
    rosidl_generator_traits::value_to_yaml(msg.robot_name, out);
    out << ", ";
  }

  // member: robot_namespace
  {
    out << "robot_namespace: ";
    rosidl_generator_traits::value_to_yaml(msg.robot_namespace, out);
    out << ", ";
  }

  // member: topic_names
  {
    if (msg.topic_names.size() == 0) {
      out << "topic_names: []";
    } else {
      out << "topic_names: [";
      size_t pending_items = msg.topic_names.size();
      for (auto item : msg.topic_names) {
        rosidl_generator_traits::value_to_yaml(item, out);
        if (--pending_items > 0) {
          out << ", ";
        }
      }
      out << "]";
    }
    out << ", ";
  }

  // member: topic_types
  {
    if (msg.topic_types.size() == 0) {
      out << "topic_types: []";
    } else {
      out << "topic_types: [";
      size_t pending_items = msg.topic_types.size();
      for (auto item : msg.topic_types) {
        rosidl_generator_traits::value_to_yaml(item, out);
        if (--pending_items > 0) {
          out << ", ";
        }
      }
      out << "]";
    }
    out << ", ";
  }

  // member: service_names
  {
    if (msg.service_names.size() == 0) {
      out << "service_names: []";
    } else {
      out << "service_names: [";
      size_t pending_items = msg.service_names.size();
      for (auto item : msg.service_names) {
        rosidl_generator_traits::value_to_yaml(item, out);
        if (--pending_items > 0) {
          out << ", ";
        }
      }
      out << "]";
    }
    out << ", ";
  }

  // member: service_types
  {
    if (msg.service_types.size() == 0) {
      out << "service_types: []";
    } else {
      out << "service_types: [";
      size_t pending_items = msg.service_types.size();
      for (auto item : msg.service_types) {
        rosidl_generator_traits::value_to_yaml(item, out);
        if (--pending_items > 0) {
          out << ", ";
        }
      }
      out << "]";
    }
    out << ", ";
  }

  // member: action_names
  {
    if (msg.action_names.size() == 0) {
      out << "action_names: []";
    } else {
      out << "action_names: [";
      size_t pending_items = msg.action_names.size();
      for (auto item : msg.action_names) {
        rosidl_generator_traits::value_to_yaml(item, out);
        if (--pending_items > 0) {
          out << ", ";
        }
      }
      out << "]";
    }
    out << ", ";
  }

  // member: action_types
  {
    if (msg.action_types.size() == 0) {
      out << "action_types: []";
    } else {
      out << "action_types: [";
      size_t pending_items = msg.action_types.size();
      for (auto item : msg.action_types) {
        rosidl_generator_traits::value_to_yaml(item, out);
        if (--pending_items > 0) {
          out << ", ";
        }
      }
      out << "]";
    }
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
  const CapabilityManifest & msg,
  std::ostream & out, size_t indentation = 0)
{
  // member: robot_name
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    out << "robot_name: ";
    rosidl_generator_traits::value_to_yaml(msg.robot_name, out);
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

  // member: topic_names
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    if (msg.topic_names.size() == 0) {
      out << "topic_names: []\n";
    } else {
      out << "topic_names:\n";
      for (auto item : msg.topic_names) {
        if (indentation > 0) {
          out << std::string(indentation, ' ');
        }
        out << "- ";
        rosidl_generator_traits::value_to_yaml(item, out);
        out << "\n";
      }
    }
  }

  // member: topic_types
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    if (msg.topic_types.size() == 0) {
      out << "topic_types: []\n";
    } else {
      out << "topic_types:\n";
      for (auto item : msg.topic_types) {
        if (indentation > 0) {
          out << std::string(indentation, ' ');
        }
        out << "- ";
        rosidl_generator_traits::value_to_yaml(item, out);
        out << "\n";
      }
    }
  }

  // member: service_names
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    if (msg.service_names.size() == 0) {
      out << "service_names: []\n";
    } else {
      out << "service_names:\n";
      for (auto item : msg.service_names) {
        if (indentation > 0) {
          out << std::string(indentation, ' ');
        }
        out << "- ";
        rosidl_generator_traits::value_to_yaml(item, out);
        out << "\n";
      }
    }
  }

  // member: service_types
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    if (msg.service_types.size() == 0) {
      out << "service_types: []\n";
    } else {
      out << "service_types:\n";
      for (auto item : msg.service_types) {
        if (indentation > 0) {
          out << std::string(indentation, ' ');
        }
        out << "- ";
        rosidl_generator_traits::value_to_yaml(item, out);
        out << "\n";
      }
    }
  }

  // member: action_names
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    if (msg.action_names.size() == 0) {
      out << "action_names: []\n";
    } else {
      out << "action_names:\n";
      for (auto item : msg.action_names) {
        if (indentation > 0) {
          out << std::string(indentation, ' ');
        }
        out << "- ";
        rosidl_generator_traits::value_to_yaml(item, out);
        out << "\n";
      }
    }
  }

  // member: action_types
  {
    if (indentation > 0) {
      out << std::string(indentation, ' ');
    }
    if (msg.action_types.size() == 0) {
      out << "action_types: []\n";
    } else {
      out << "action_types:\n";
      for (auto item : msg.action_types) {
        if (indentation > 0) {
          out << std::string(indentation, ' ');
        }
        out << "- ";
        rosidl_generator_traits::value_to_yaml(item, out);
        out << "\n";
      }
    }
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

inline std::string to_yaml(const CapabilityManifest & msg, bool use_flow_style = false)
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
  const agenticros_msgs::msg::CapabilityManifest & msg,
  std::ostream & out, size_t indentation = 0)
{
  agenticros_msgs::msg::to_block_style_yaml(msg, out, indentation);
}

[[deprecated("use agenticros_msgs::msg::to_yaml() instead")]]
inline std::string to_yaml(const agenticros_msgs::msg::CapabilityManifest & msg)
{
  return agenticros_msgs::msg::to_yaml(msg);
}

template<>
inline const char * data_type<agenticros_msgs::msg::CapabilityManifest>()
{
  return "agenticros_msgs::msg::CapabilityManifest";
}

template<>
inline const char * name<agenticros_msgs::msg::CapabilityManifest>()
{
  return "agenticros_msgs/msg/CapabilityManifest";
}

template<>
struct has_fixed_size<agenticros_msgs::msg::CapabilityManifest>
  : std::integral_constant<bool, false> {};

template<>
struct has_bounded_size<agenticros_msgs::msg::CapabilityManifest>
  : std::integral_constant<bool, false> {};

template<>
struct is_message<agenticros_msgs::msg::CapabilityManifest>
  : std::true_type {};

}  // namespace rosidl_generator_traits

#endif  // AGENTICROS_MSGS__MSG__DETAIL__CAPABILITY_MANIFEST__TRAITS_HPP_
