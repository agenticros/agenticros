// generated from rosidl_generator_cpp/resource/idl__struct.hpp.em
// with input from agenticros_msgs:msg/CapabilityManifest.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/msg/capability_manifest.hpp"


#ifndef AGENTICROS_MSGS__MSG__DETAIL__CAPABILITY_MANIFEST__STRUCT_HPP_
#define AGENTICROS_MSGS__MSG__DETAIL__CAPABILITY_MANIFEST__STRUCT_HPP_

#include <algorithm>
#include <array>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "rosidl_runtime_cpp/bounded_vector.hpp"
#include "rosidl_runtime_cpp/message_initialization.hpp"


// Include directives for member types
// Member 'stamp'
#include "builtin_interfaces/msg/detail/time__struct.hpp"

#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__msg__CapabilityManifest __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__msg__CapabilityManifest __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace msg
{

// message struct
template<class ContainerAllocator>
struct CapabilityManifest_
{
  using Type = CapabilityManifest_<ContainerAllocator>;

  explicit CapabilityManifest_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : stamp(_init)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->robot_name = "";
      this->robot_namespace = "";
    }
  }

  explicit CapabilityManifest_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : robot_name(_alloc),
    robot_namespace(_alloc),
    stamp(_alloc, _init)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->robot_name = "";
      this->robot_namespace = "";
    }
  }

  // field types and members
  using _robot_name_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _robot_name_type robot_name;
  using _robot_namespace_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _robot_namespace_type robot_namespace;
  using _topic_names_type =
    std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>>;
  _topic_names_type topic_names;
  using _topic_types_type =
    std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>>;
  _topic_types_type topic_types;
  using _service_names_type =
    std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>>;
  _service_names_type service_names;
  using _service_types_type =
    std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>>;
  _service_types_type service_types;
  using _action_names_type =
    std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>>;
  _action_names_type action_names;
  using _action_types_type =
    std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>>;
  _action_types_type action_types;
  using _stamp_type =
    builtin_interfaces::msg::Time_<ContainerAllocator>;
  _stamp_type stamp;

  // setters for named parameter idiom
  Type & set__robot_name(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->robot_name = _arg;
    return *this;
  }
  Type & set__robot_namespace(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->robot_namespace = _arg;
    return *this;
  }
  Type & set__topic_names(
    const std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>> & _arg)
  {
    this->topic_names = _arg;
    return *this;
  }
  Type & set__topic_types(
    const std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>> & _arg)
  {
    this->topic_types = _arg;
    return *this;
  }
  Type & set__service_names(
    const std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>> & _arg)
  {
    this->service_names = _arg;
    return *this;
  }
  Type & set__service_types(
    const std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>> & _arg)
  {
    this->service_types = _arg;
    return *this;
  }
  Type & set__action_names(
    const std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>> & _arg)
  {
    this->action_names = _arg;
    return *this;
  }
  Type & set__action_types(
    const std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>> & _arg)
  {
    this->action_types = _arg;
    return *this;
  }
  Type & set__stamp(
    const builtin_interfaces::msg::Time_<ContainerAllocator> & _arg)
  {
    this->stamp = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::msg::CapabilityManifest_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::msg::CapabilityManifest_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::msg::CapabilityManifest_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::msg::CapabilityManifest_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::msg::CapabilityManifest_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::msg::CapabilityManifest_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::msg::CapabilityManifest_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::msg::CapabilityManifest_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::msg::CapabilityManifest_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::msg::CapabilityManifest_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__msg__CapabilityManifest
    std::shared_ptr<agenticros_msgs::msg::CapabilityManifest_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__msg__CapabilityManifest
    std::shared_ptr<agenticros_msgs::msg::CapabilityManifest_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const CapabilityManifest_ & other) const
  {
    if (this->robot_name != other.robot_name) {
      return false;
    }
    if (this->robot_namespace != other.robot_namespace) {
      return false;
    }
    if (this->topic_names != other.topic_names) {
      return false;
    }
    if (this->topic_types != other.topic_types) {
      return false;
    }
    if (this->service_names != other.service_names) {
      return false;
    }
    if (this->service_types != other.service_types) {
      return false;
    }
    if (this->action_names != other.action_names) {
      return false;
    }
    if (this->action_types != other.action_types) {
      return false;
    }
    if (this->stamp != other.stamp) {
      return false;
    }
    return true;
  }
  bool operator!=(const CapabilityManifest_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct CapabilityManifest_

// alias to use template instance with default allocator
using CapabilityManifest =
  agenticros_msgs::msg::CapabilityManifest_<std::allocator<void>>;

// constant definitions

}  // namespace msg

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__MSG__DETAIL__CAPABILITY_MANIFEST__STRUCT_HPP_
