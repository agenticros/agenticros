// generated from rosidl_generator_cpp/resource/idl__builder.hpp.em
// with input from agenticros_msgs:srv/GetCapabilities.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/srv/get_capabilities.hpp"


#ifndef AGENTICROS_MSGS__SRV__DETAIL__GET_CAPABILITIES__BUILDER_HPP_
#define AGENTICROS_MSGS__SRV__DETAIL__GET_CAPABILITIES__BUILDER_HPP_

#include <algorithm>
#include <utility>

#include "agenticros_msgs/srv/detail/get_capabilities__struct.hpp"
#include "rosidl_runtime_cpp/message_initialization.hpp"


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_GetCapabilities_Request_robot_namespace
{
public:
  Init_GetCapabilities_Request_robot_namespace()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  ::agenticros_msgs::srv::GetCapabilities_Request robot_namespace(::agenticros_msgs::srv::GetCapabilities_Request::_robot_namespace_type arg)
  {
    msg_.robot_namespace = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::GetCapabilities_Request msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::GetCapabilities_Request>()
{
  return agenticros_msgs::srv::builder::Init_GetCapabilities_Request_robot_namespace();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_GetCapabilities_Response_error_message
{
public:
  explicit Init_GetCapabilities_Response_error_message(::agenticros_msgs::srv::GetCapabilities_Response & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::srv::GetCapabilities_Response error_message(::agenticros_msgs::srv::GetCapabilities_Response::_error_message_type arg)
  {
    msg_.error_message = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::GetCapabilities_Response msg_;
};

class Init_GetCapabilities_Response_success
{
public:
  explicit Init_GetCapabilities_Response_success(::agenticros_msgs::srv::GetCapabilities_Response & msg)
  : msg_(msg)
  {}
  Init_GetCapabilities_Response_error_message success(::agenticros_msgs::srv::GetCapabilities_Response::_success_type arg)
  {
    msg_.success = std::move(arg);
    return Init_GetCapabilities_Response_error_message(msg_);
  }

private:
  ::agenticros_msgs::srv::GetCapabilities_Response msg_;
};

class Init_GetCapabilities_Response_manifest
{
public:
  Init_GetCapabilities_Response_manifest()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_GetCapabilities_Response_success manifest(::agenticros_msgs::srv::GetCapabilities_Response::_manifest_type arg)
  {
    msg_.manifest = std::move(arg);
    return Init_GetCapabilities_Response_success(msg_);
  }

private:
  ::agenticros_msgs::srv::GetCapabilities_Response msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::GetCapabilities_Response>()
{
  return agenticros_msgs::srv::builder::Init_GetCapabilities_Response_manifest();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_GetCapabilities_Event_response
{
public:
  explicit Init_GetCapabilities_Event_response(::agenticros_msgs::srv::GetCapabilities_Event & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::srv::GetCapabilities_Event response(::agenticros_msgs::srv::GetCapabilities_Event::_response_type arg)
  {
    msg_.response = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::GetCapabilities_Event msg_;
};

class Init_GetCapabilities_Event_request
{
public:
  explicit Init_GetCapabilities_Event_request(::agenticros_msgs::srv::GetCapabilities_Event & msg)
  : msg_(msg)
  {}
  Init_GetCapabilities_Event_response request(::agenticros_msgs::srv::GetCapabilities_Event::_request_type arg)
  {
    msg_.request = std::move(arg);
    return Init_GetCapabilities_Event_response(msg_);
  }

private:
  ::agenticros_msgs::srv::GetCapabilities_Event msg_;
};

class Init_GetCapabilities_Event_info
{
public:
  Init_GetCapabilities_Event_info()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_GetCapabilities_Event_request info(::agenticros_msgs::srv::GetCapabilities_Event::_info_type arg)
  {
    msg_.info = std::move(arg);
    return Init_GetCapabilities_Event_request(msg_);
  }

private:
  ::agenticros_msgs::srv::GetCapabilities_Event msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::GetCapabilities_Event>()
{
  return agenticros_msgs::srv::builder::Init_GetCapabilities_Event_info();
}

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__SRV__DETAIL__GET_CAPABILITIES__BUILDER_HPP_
