// generated from rosidl_generator_cpp/resource/idl__builder.hpp.em
// with input from agenticros_msgs:srv/FollowMeSetDistance.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/srv/follow_me_set_distance.hpp"


#ifndef AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_SET_DISTANCE__BUILDER_HPP_
#define AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_SET_DISTANCE__BUILDER_HPP_

#include <algorithm>
#include <utility>

#include "agenticros_msgs/srv/detail/follow_me_set_distance__struct.hpp"
#include "rosidl_runtime_cpp/message_initialization.hpp"


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_FollowMeSetDistance_Request_distance
{
public:
  Init_FollowMeSetDistance_Request_distance()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  ::agenticros_msgs::srv::FollowMeSetDistance_Request distance(::agenticros_msgs::srv::FollowMeSetDistance_Request::_distance_type arg)
  {
    msg_.distance = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetDistance_Request msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::FollowMeSetDistance_Request>()
{
  return agenticros_msgs::srv::builder::Init_FollowMeSetDistance_Request_distance();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_FollowMeSetDistance_Response_target_distance
{
public:
  explicit Init_FollowMeSetDistance_Response_target_distance(::agenticros_msgs::srv::FollowMeSetDistance_Response & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::srv::FollowMeSetDistance_Response target_distance(::agenticros_msgs::srv::FollowMeSetDistance_Response::_target_distance_type arg)
  {
    msg_.target_distance = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetDistance_Response msg_;
};

class Init_FollowMeSetDistance_Response_success
{
public:
  Init_FollowMeSetDistance_Response_success()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_FollowMeSetDistance_Response_target_distance success(::agenticros_msgs::srv::FollowMeSetDistance_Response::_success_type arg)
  {
    msg_.success = std::move(arg);
    return Init_FollowMeSetDistance_Response_target_distance(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetDistance_Response msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::FollowMeSetDistance_Response>()
{
  return agenticros_msgs::srv::builder::Init_FollowMeSetDistance_Response_success();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_FollowMeSetDistance_Event_response
{
public:
  explicit Init_FollowMeSetDistance_Event_response(::agenticros_msgs::srv::FollowMeSetDistance_Event & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::srv::FollowMeSetDistance_Event response(::agenticros_msgs::srv::FollowMeSetDistance_Event::_response_type arg)
  {
    msg_.response = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetDistance_Event msg_;
};

class Init_FollowMeSetDistance_Event_request
{
public:
  explicit Init_FollowMeSetDistance_Event_request(::agenticros_msgs::srv::FollowMeSetDistance_Event & msg)
  : msg_(msg)
  {}
  Init_FollowMeSetDistance_Event_response request(::agenticros_msgs::srv::FollowMeSetDistance_Event::_request_type arg)
  {
    msg_.request = std::move(arg);
    return Init_FollowMeSetDistance_Event_response(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetDistance_Event msg_;
};

class Init_FollowMeSetDistance_Event_info
{
public:
  Init_FollowMeSetDistance_Event_info()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_FollowMeSetDistance_Event_request info(::agenticros_msgs::srv::FollowMeSetDistance_Event::_info_type arg)
  {
    msg_.info = std::move(arg);
    return Init_FollowMeSetDistance_Event_request(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetDistance_Event msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::FollowMeSetDistance_Event>()
{
  return agenticros_msgs::srv::builder::Init_FollowMeSetDistance_Event_info();
}

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_SET_DISTANCE__BUILDER_HPP_
