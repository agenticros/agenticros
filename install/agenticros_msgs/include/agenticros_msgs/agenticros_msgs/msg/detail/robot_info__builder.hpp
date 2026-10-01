// generated from rosidl_generator_cpp/resource/idl__builder.hpp.em
// with input from agenticros_msgs:msg/RobotInfo.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/msg/robot_info.hpp"


#ifndef AGENTICROS_MSGS__MSG__DETAIL__ROBOT_INFO__BUILDER_HPP_
#define AGENTICROS_MSGS__MSG__DETAIL__ROBOT_INFO__BUILDER_HPP_

#include <algorithm>
#include <utility>

#include "agenticros_msgs/msg/detail/robot_info__struct.hpp"
#include "rosidl_runtime_cpp/message_initialization.hpp"


namespace agenticros_msgs
{

namespace msg
{

namespace builder
{

class Init_RobotInfo_stamp
{
public:
  explicit Init_RobotInfo_stamp(::agenticros_msgs::msg::RobotInfo & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::msg::RobotInfo stamp(::agenticros_msgs::msg::RobotInfo::_stamp_type arg)
  {
    msg_.stamp = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::msg::RobotInfo msg_;
};

class Init_RobotInfo_has_arm
{
public:
  explicit Init_RobotInfo_has_arm(::agenticros_msgs::msg::RobotInfo & msg)
  : msg_(msg)
  {}
  Init_RobotInfo_stamp has_arm(::agenticros_msgs::msg::RobotInfo::_has_arm_type arg)
  {
    msg_.has_arm = std::move(arg);
    return Init_RobotInfo_stamp(msg_);
  }

private:
  ::agenticros_msgs::msg::RobotInfo msg_;
};

class Init_RobotInfo_has_lidar
{
public:
  explicit Init_RobotInfo_has_lidar(::agenticros_msgs::msg::RobotInfo & msg)
  : msg_(msg)
  {}
  Init_RobotInfo_has_arm has_lidar(::agenticros_msgs::msg::RobotInfo::_has_lidar_type arg)
  {
    msg_.has_lidar = std::move(arg);
    return Init_RobotInfo_has_arm(msg_);
  }

private:
  ::agenticros_msgs::msg::RobotInfo msg_;
};

class Init_RobotInfo_has_realsense
{
public:
  explicit Init_RobotInfo_has_realsense(::agenticros_msgs::msg::RobotInfo & msg)
  : msg_(msg)
  {}
  Init_RobotInfo_has_lidar has_realsense(::agenticros_msgs::msg::RobotInfo::_has_realsense_type arg)
  {
    msg_.has_realsense = std::move(arg);
    return Init_RobotInfo_has_lidar(msg_);
  }

private:
  ::agenticros_msgs::msg::RobotInfo msg_;
};

class Init_RobotInfo_capability_ids
{
public:
  explicit Init_RobotInfo_capability_ids(::agenticros_msgs::msg::RobotInfo & msg)
  : msg_(msg)
  {}
  Init_RobotInfo_has_realsense capability_ids(::agenticros_msgs::msg::RobotInfo::_capability_ids_type arg)
  {
    msg_.capability_ids = std::move(arg);
    return Init_RobotInfo_has_realsense(msg_);
  }

private:
  ::agenticros_msgs::msg::RobotInfo msg_;
};

class Init_RobotInfo_robot_namespace
{
public:
  explicit Init_RobotInfo_robot_namespace(::agenticros_msgs::msg::RobotInfo & msg)
  : msg_(msg)
  {}
  Init_RobotInfo_capability_ids robot_namespace(::agenticros_msgs::msg::RobotInfo::_robot_namespace_type arg)
  {
    msg_.robot_namespace = std::move(arg);
    return Init_RobotInfo_capability_ids(msg_);
  }

private:
  ::agenticros_msgs::msg::RobotInfo msg_;
};

class Init_RobotInfo_kind
{
public:
  explicit Init_RobotInfo_kind(::agenticros_msgs::msg::RobotInfo & msg)
  : msg_(msg)
  {}
  Init_RobotInfo_robot_namespace kind(::agenticros_msgs::msg::RobotInfo::_kind_type arg)
  {
    msg_.kind = std::move(arg);
    return Init_RobotInfo_robot_namespace(msg_);
  }

private:
  ::agenticros_msgs::msg::RobotInfo msg_;
};

class Init_RobotInfo_name
{
public:
  explicit Init_RobotInfo_name(::agenticros_msgs::msg::RobotInfo & msg)
  : msg_(msg)
  {}
  Init_RobotInfo_kind name(::agenticros_msgs::msg::RobotInfo::_name_type arg)
  {
    msg_.name = std::move(arg);
    return Init_RobotInfo_kind(msg_);
  }

private:
  ::agenticros_msgs::msg::RobotInfo msg_;
};

class Init_RobotInfo_id
{
public:
  Init_RobotInfo_id()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_RobotInfo_name id(::agenticros_msgs::msg::RobotInfo::_id_type arg)
  {
    msg_.id = std::move(arg);
    return Init_RobotInfo_name(msg_);
  }

private:
  ::agenticros_msgs::msg::RobotInfo msg_;
};

}  // namespace builder

}  // namespace msg

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::msg::RobotInfo>()
{
  return agenticros_msgs::msg::builder::Init_RobotInfo_id();
}

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__MSG__DETAIL__ROBOT_INFO__BUILDER_HPP_
