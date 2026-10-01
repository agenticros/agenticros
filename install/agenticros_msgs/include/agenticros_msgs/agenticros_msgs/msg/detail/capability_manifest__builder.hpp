// generated from rosidl_generator_cpp/resource/idl__builder.hpp.em
// with input from agenticros_msgs:msg/CapabilityManifest.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/msg/capability_manifest.hpp"


#ifndef AGENTICROS_MSGS__MSG__DETAIL__CAPABILITY_MANIFEST__BUILDER_HPP_
#define AGENTICROS_MSGS__MSG__DETAIL__CAPABILITY_MANIFEST__BUILDER_HPP_

#include <algorithm>
#include <utility>

#include "agenticros_msgs/msg/detail/capability_manifest__struct.hpp"
#include "rosidl_runtime_cpp/message_initialization.hpp"


namespace agenticros_msgs
{

namespace msg
{

namespace builder
{

class Init_CapabilityManifest_stamp
{
public:
  explicit Init_CapabilityManifest_stamp(::agenticros_msgs::msg::CapabilityManifest & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::msg::CapabilityManifest stamp(::agenticros_msgs::msg::CapabilityManifest::_stamp_type arg)
  {
    msg_.stamp = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::msg::CapabilityManifest msg_;
};

class Init_CapabilityManifest_action_types
{
public:
  explicit Init_CapabilityManifest_action_types(::agenticros_msgs::msg::CapabilityManifest & msg)
  : msg_(msg)
  {}
  Init_CapabilityManifest_stamp action_types(::agenticros_msgs::msg::CapabilityManifest::_action_types_type arg)
  {
    msg_.action_types = std::move(arg);
    return Init_CapabilityManifest_stamp(msg_);
  }

private:
  ::agenticros_msgs::msg::CapabilityManifest msg_;
};

class Init_CapabilityManifest_action_names
{
public:
  explicit Init_CapabilityManifest_action_names(::agenticros_msgs::msg::CapabilityManifest & msg)
  : msg_(msg)
  {}
  Init_CapabilityManifest_action_types action_names(::agenticros_msgs::msg::CapabilityManifest::_action_names_type arg)
  {
    msg_.action_names = std::move(arg);
    return Init_CapabilityManifest_action_types(msg_);
  }

private:
  ::agenticros_msgs::msg::CapabilityManifest msg_;
};

class Init_CapabilityManifest_service_types
{
public:
  explicit Init_CapabilityManifest_service_types(::agenticros_msgs::msg::CapabilityManifest & msg)
  : msg_(msg)
  {}
  Init_CapabilityManifest_action_names service_types(::agenticros_msgs::msg::CapabilityManifest::_service_types_type arg)
  {
    msg_.service_types = std::move(arg);
    return Init_CapabilityManifest_action_names(msg_);
  }

private:
  ::agenticros_msgs::msg::CapabilityManifest msg_;
};

class Init_CapabilityManifest_service_names
{
public:
  explicit Init_CapabilityManifest_service_names(::agenticros_msgs::msg::CapabilityManifest & msg)
  : msg_(msg)
  {}
  Init_CapabilityManifest_service_types service_names(::agenticros_msgs::msg::CapabilityManifest::_service_names_type arg)
  {
    msg_.service_names = std::move(arg);
    return Init_CapabilityManifest_service_types(msg_);
  }

private:
  ::agenticros_msgs::msg::CapabilityManifest msg_;
};

class Init_CapabilityManifest_topic_types
{
public:
  explicit Init_CapabilityManifest_topic_types(::agenticros_msgs::msg::CapabilityManifest & msg)
  : msg_(msg)
  {}
  Init_CapabilityManifest_service_names topic_types(::agenticros_msgs::msg::CapabilityManifest::_topic_types_type arg)
  {
    msg_.topic_types = std::move(arg);
    return Init_CapabilityManifest_service_names(msg_);
  }

private:
  ::agenticros_msgs::msg::CapabilityManifest msg_;
};

class Init_CapabilityManifest_topic_names
{
public:
  explicit Init_CapabilityManifest_topic_names(::agenticros_msgs::msg::CapabilityManifest & msg)
  : msg_(msg)
  {}
  Init_CapabilityManifest_topic_types topic_names(::agenticros_msgs::msg::CapabilityManifest::_topic_names_type arg)
  {
    msg_.topic_names = std::move(arg);
    return Init_CapabilityManifest_topic_types(msg_);
  }

private:
  ::agenticros_msgs::msg::CapabilityManifest msg_;
};

class Init_CapabilityManifest_robot_namespace
{
public:
  explicit Init_CapabilityManifest_robot_namespace(::agenticros_msgs::msg::CapabilityManifest & msg)
  : msg_(msg)
  {}
  Init_CapabilityManifest_topic_names robot_namespace(::agenticros_msgs::msg::CapabilityManifest::_robot_namespace_type arg)
  {
    msg_.robot_namespace = std::move(arg);
    return Init_CapabilityManifest_topic_names(msg_);
  }

private:
  ::agenticros_msgs::msg::CapabilityManifest msg_;
};

class Init_CapabilityManifest_robot_name
{
public:
  Init_CapabilityManifest_robot_name()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_CapabilityManifest_robot_namespace robot_name(::agenticros_msgs::msg::CapabilityManifest::_robot_name_type arg)
  {
    msg_.robot_name = std::move(arg);
    return Init_CapabilityManifest_robot_namespace(msg_);
  }

private:
  ::agenticros_msgs::msg::CapabilityManifest msg_;
};

}  // namespace builder

}  // namespace msg

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::msg::CapabilityManifest>()
{
  return agenticros_msgs::msg::builder::Init_CapabilityManifest_robot_name();
}

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__MSG__DETAIL__CAPABILITY_MANIFEST__BUILDER_HPP_
