// generated from rosidl_generator_cpp/resource/idl__builder.hpp.em
// with input from agenticros_msgs:srv/FollowMeSetTarget.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/srv/follow_me_set_target.hpp"


#ifndef AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_SET_TARGET__BUILDER_HPP_
#define AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_SET_TARGET__BUILDER_HPP_

#include <algorithm>
#include <utility>

#include "agenticros_msgs/srv/detail/follow_me_set_target__struct.hpp"
#include "rosidl_runtime_cpp/message_initialization.hpp"


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_FollowMeSetTarget_Request_description
{
public:
  Init_FollowMeSetTarget_Request_description()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  ::agenticros_msgs::srv::FollowMeSetTarget_Request description(::agenticros_msgs::srv::FollowMeSetTarget_Request::_description_type arg)
  {
    msg_.description = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetTarget_Request msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::FollowMeSetTarget_Request>()
{
  return agenticros_msgs::srv::builder::Init_FollowMeSetTarget_Request_description();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_FollowMeSetTarget_Response_message
{
public:
  explicit Init_FollowMeSetTarget_Response_message(::agenticros_msgs::srv::FollowMeSetTarget_Response & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::srv::FollowMeSetTarget_Response message(::agenticros_msgs::srv::FollowMeSetTarget_Response::_message_type arg)
  {
    msg_.message = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetTarget_Response msg_;
};

class Init_FollowMeSetTarget_Response_confidence
{
public:
  explicit Init_FollowMeSetTarget_Response_confidence(::agenticros_msgs::srv::FollowMeSetTarget_Response & msg)
  : msg_(msg)
  {}
  Init_FollowMeSetTarget_Response_message confidence(::agenticros_msgs::srv::FollowMeSetTarget_Response::_confidence_type arg)
  {
    msg_.confidence = std::move(arg);
    return Init_FollowMeSetTarget_Response_message(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetTarget_Response msg_;
};

class Init_FollowMeSetTarget_Response_person_id
{
public:
  explicit Init_FollowMeSetTarget_Response_person_id(::agenticros_msgs::srv::FollowMeSetTarget_Response & msg)
  : msg_(msg)
  {}
  Init_FollowMeSetTarget_Response_confidence person_id(::agenticros_msgs::srv::FollowMeSetTarget_Response::_person_id_type arg)
  {
    msg_.person_id = std::move(arg);
    return Init_FollowMeSetTarget_Response_confidence(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetTarget_Response msg_;
};

class Init_FollowMeSetTarget_Response_success
{
public:
  Init_FollowMeSetTarget_Response_success()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_FollowMeSetTarget_Response_person_id success(::agenticros_msgs::srv::FollowMeSetTarget_Response::_success_type arg)
  {
    msg_.success = std::move(arg);
    return Init_FollowMeSetTarget_Response_person_id(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetTarget_Response msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::FollowMeSetTarget_Response>()
{
  return agenticros_msgs::srv::builder::Init_FollowMeSetTarget_Response_success();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_FollowMeSetTarget_Event_response
{
public:
  explicit Init_FollowMeSetTarget_Event_response(::agenticros_msgs::srv::FollowMeSetTarget_Event & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::srv::FollowMeSetTarget_Event response(::agenticros_msgs::srv::FollowMeSetTarget_Event::_response_type arg)
  {
    msg_.response = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetTarget_Event msg_;
};

class Init_FollowMeSetTarget_Event_request
{
public:
  explicit Init_FollowMeSetTarget_Event_request(::agenticros_msgs::srv::FollowMeSetTarget_Event & msg)
  : msg_(msg)
  {}
  Init_FollowMeSetTarget_Event_response request(::agenticros_msgs::srv::FollowMeSetTarget_Event::_request_type arg)
  {
    msg_.request = std::move(arg);
    return Init_FollowMeSetTarget_Event_response(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetTarget_Event msg_;
};

class Init_FollowMeSetTarget_Event_info
{
public:
  Init_FollowMeSetTarget_Event_info()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_FollowMeSetTarget_Event_request info(::agenticros_msgs::srv::FollowMeSetTarget_Event::_info_type arg)
  {
    msg_.info = std::move(arg);
    return Init_FollowMeSetTarget_Event_request(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeSetTarget_Event msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::FollowMeSetTarget_Event>()
{
  return agenticros_msgs::srv::builder::Init_FollowMeSetTarget_Event_info();
}

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_SET_TARGET__BUILDER_HPP_
