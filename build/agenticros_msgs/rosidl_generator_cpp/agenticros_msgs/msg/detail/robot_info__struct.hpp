// generated from rosidl_generator_cpp/resource/idl__struct.hpp.em
// with input from agenticros_msgs:msg/RobotInfo.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/msg/robot_info.hpp"


#ifndef AGENTICROS_MSGS__MSG__DETAIL__ROBOT_INFO__STRUCT_HPP_
#define AGENTICROS_MSGS__MSG__DETAIL__ROBOT_INFO__STRUCT_HPP_

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
# define DEPRECATED__agenticros_msgs__msg__RobotInfo __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__msg__RobotInfo __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace msg
{

// message struct
template<class ContainerAllocator>
struct RobotInfo_
{
  using Type = RobotInfo_<ContainerAllocator>;

  explicit RobotInfo_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : stamp(_init)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->id = "";
      this->name = "";
      this->kind = "";
      this->robot_namespace = "";
      this->has_realsense = false;
      this->has_lidar = false;
      this->has_arm = false;
    }
  }

  explicit RobotInfo_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : id(_alloc),
    name(_alloc),
    kind(_alloc),
    robot_namespace(_alloc),
    stamp(_alloc, _init)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->id = "";
      this->name = "";
      this->kind = "";
      this->robot_namespace = "";
      this->has_realsense = false;
      this->has_lidar = false;
      this->has_arm = false;
    }
  }

  // field types and members
  using _id_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _id_type id;
  using _name_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _name_type name;
  using _kind_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _kind_type kind;
  using _robot_namespace_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _robot_namespace_type robot_namespace;
  using _capability_ids_type =
    std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>>;
  _capability_ids_type capability_ids;
  using _has_realsense_type =
    bool;
  _has_realsense_type has_realsense;
  using _has_lidar_type =
    bool;
  _has_lidar_type has_lidar;
  using _has_arm_type =
    bool;
  _has_arm_type has_arm;
  using _stamp_type =
    builtin_interfaces::msg::Time_<ContainerAllocator>;
  _stamp_type stamp;

  // setters for named parameter idiom
  Type & set__id(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->id = _arg;
    return *this;
  }
  Type & set__name(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->name = _arg;
    return *this;
  }
  Type & set__kind(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->kind = _arg;
    return *this;
  }
  Type & set__robot_namespace(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->robot_namespace = _arg;
    return *this;
  }
  Type & set__capability_ids(
    const std::vector<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>>> & _arg)
  {
    this->capability_ids = _arg;
    return *this;
  }
  Type & set__has_realsense(
    const bool & _arg)
  {
    this->has_realsense = _arg;
    return *this;
  }
  Type & set__has_lidar(
    const bool & _arg)
  {
    this->has_lidar = _arg;
    return *this;
  }
  Type & set__has_arm(
    const bool & _arg)
  {
    this->has_arm = _arg;
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
    agenticros_msgs::msg::RobotInfo_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::msg::RobotInfo_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::msg::RobotInfo_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::msg::RobotInfo_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::msg::RobotInfo_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::msg::RobotInfo_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::msg::RobotInfo_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::msg::RobotInfo_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::msg::RobotInfo_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::msg::RobotInfo_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__msg__RobotInfo
    std::shared_ptr<agenticros_msgs::msg::RobotInfo_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__msg__RobotInfo
    std::shared_ptr<agenticros_msgs::msg::RobotInfo_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const RobotInfo_ & other) const
  {
    if (this->id != other.id) {
      return false;
    }
    if (this->name != other.name) {
      return false;
    }
    if (this->kind != other.kind) {
      return false;
    }
    if (this->robot_namespace != other.robot_namespace) {
      return false;
    }
    if (this->capability_ids != other.capability_ids) {
      return false;
    }
    if (this->has_realsense != other.has_realsense) {
      return false;
    }
    if (this->has_lidar != other.has_lidar) {
      return false;
    }
    if (this->has_arm != other.has_arm) {
      return false;
    }
    if (this->stamp != other.stamp) {
      return false;
    }
    return true;
  }
  bool operator!=(const RobotInfo_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct RobotInfo_

// alias to use template instance with default allocator
using RobotInfo =
  agenticros_msgs::msg::RobotInfo_<std::allocator<void>>;

// constant definitions

}  // namespace msg

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__MSG__DETAIL__ROBOT_INFO__STRUCT_HPP_
