// generated from rosidl_generator_cpp/resource/idl__builder.hpp.em
// with input from agenticros_msgs:srv/FollowMeStop.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/srv/follow_me_stop.hpp"


#ifndef AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_STOP__BUILDER_HPP_
#define AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_STOP__BUILDER_HPP_

#include <algorithm>
#include <utility>

#include "agenticros_msgs/srv/detail/follow_me_stop__struct.hpp"
#include "rosidl_runtime_cpp/message_initialization.hpp"


namespace agenticros_msgs
{

namespace srv
{


}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::FollowMeStop_Request>()
{
  return ::agenticros_msgs::srv::FollowMeStop_Request(rosidl_runtime_cpp::MessageInitialization::ZERO);
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_FollowMeStop_Response_message
{
public:
  explicit Init_FollowMeStop_Response_message(::agenticros_msgs::srv::FollowMeStop_Response & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::srv::FollowMeStop_Response message(::agenticros_msgs::srv::FollowMeStop_Response::_message_type arg)
  {
    msg_.message = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeStop_Response msg_;
};

class Init_FollowMeStop_Response_success
{
public:
  Init_FollowMeStop_Response_success()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_FollowMeStop_Response_message success(::agenticros_msgs::srv::FollowMeStop_Response::_success_type arg)
  {
    msg_.success = std::move(arg);
    return Init_FollowMeStop_Response_message(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeStop_Response msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::FollowMeStop_Response>()
{
  return agenticros_msgs::srv::builder::Init_FollowMeStop_Response_success();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_FollowMeStop_Event_response
{
public:
  explicit Init_FollowMeStop_Event_response(::agenticros_msgs::srv::FollowMeStop_Event & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::srv::FollowMeStop_Event response(::agenticros_msgs::srv::FollowMeStop_Event::_response_type arg)
  {
    msg_.response = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeStop_Event msg_;
};

class Init_FollowMeStop_Event_request
{
public:
  explicit Init_FollowMeStop_Event_request(::agenticros_msgs::srv::FollowMeStop_Event & msg)
  : msg_(msg)
  {}
  Init_FollowMeStop_Event_response request(::agenticros_msgs::srv::FollowMeStop_Event::_request_type arg)
  {
    msg_.request = std::move(arg);
    return Init_FollowMeStop_Event_response(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeStop_Event msg_;
};

class Init_FollowMeStop_Event_info
{
public:
  Init_FollowMeStop_Event_info()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_FollowMeStop_Event_request info(::agenticros_msgs::srv::FollowMeStop_Event::_info_type arg)
  {
    msg_.info = std::move(arg);
    return Init_FollowMeStop_Event_request(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeStop_Event msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::FollowMeStop_Event>()
{
  return agenticros_msgs::srv::builder::Init_FollowMeStop_Event_info();
}

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_STOP__BUILDER_HPP_
