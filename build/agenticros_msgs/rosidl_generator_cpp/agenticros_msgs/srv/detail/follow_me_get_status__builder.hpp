// generated from rosidl_generator_cpp/resource/idl__builder.hpp.em
// with input from agenticros_msgs:srv/FollowMeGetStatus.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/srv/follow_me_get_status.hpp"


#ifndef AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_GET_STATUS__BUILDER_HPP_
#define AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_GET_STATUS__BUILDER_HPP_

#include <algorithm>
#include <utility>

#include "agenticros_msgs/srv/detail/follow_me_get_status__struct.hpp"
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
auto build<::agenticros_msgs::srv::FollowMeGetStatus_Request>()
{
  return ::agenticros_msgs::srv::FollowMeGetStatus_Request(rosidl_runtime_cpp::MessageInitialization::ZERO);
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_FollowMeGetStatus_Response_error_message
{
public:
  explicit Init_FollowMeGetStatus_Response_error_message(::agenticros_msgs::srv::FollowMeGetStatus_Response & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::srv::FollowMeGetStatus_Response error_message(::agenticros_msgs::srv::FollowMeGetStatus_Response::_error_message_type arg)
  {
    msg_.error_message = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Response msg_;
};

class Init_FollowMeGetStatus_Response_twist
{
public:
  explicit Init_FollowMeGetStatus_Response_twist(::agenticros_msgs::srv::FollowMeGetStatus_Response & msg)
  : msg_(msg)
  {}
  Init_FollowMeGetStatus_Response_error_message twist(::agenticros_msgs::srv::FollowMeGetStatus_Response::_twist_type arg)
  {
    msg_.twist = std::move(arg);
    return Init_FollowMeGetStatus_Response_error_message(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Response msg_;
};

class Init_FollowMeGetStatus_Response_persons_detected
{
public:
  explicit Init_FollowMeGetStatus_Response_persons_detected(::agenticros_msgs::srv::FollowMeGetStatus_Response & msg)
  : msg_(msg)
  {}
  Init_FollowMeGetStatus_Response_twist persons_detected(::agenticros_msgs::srv::FollowMeGetStatus_Response::_persons_detected_type arg)
  {
    msg_.persons_detected = std::move(arg);
    return Init_FollowMeGetStatus_Response_twist(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Response msg_;
};

class Init_FollowMeGetStatus_Response_target_description
{
public:
  explicit Init_FollowMeGetStatus_Response_target_description(::agenticros_msgs::srv::FollowMeGetStatus_Response & msg)
  : msg_(msg)
  {}
  Init_FollowMeGetStatus_Response_persons_detected target_description(::agenticros_msgs::srv::FollowMeGetStatus_Response::_target_description_type arg)
  {
    msg_.target_description = std::move(arg);
    return Init_FollowMeGetStatus_Response_persons_detected(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Response msg_;
};

class Init_FollowMeGetStatus_Response_target_person_id
{
public:
  explicit Init_FollowMeGetStatus_Response_target_person_id(::agenticros_msgs::srv::FollowMeGetStatus_Response & msg)
  : msg_(msg)
  {}
  Init_FollowMeGetStatus_Response_target_description target_person_id(::agenticros_msgs::srv::FollowMeGetStatus_Response::_target_person_id_type arg)
  {
    msg_.target_person_id = std::move(arg);
    return Init_FollowMeGetStatus_Response_target_description(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Response msg_;
};

class Init_FollowMeGetStatus_Response_current_distance
{
public:
  explicit Init_FollowMeGetStatus_Response_current_distance(::agenticros_msgs::srv::FollowMeGetStatus_Response & msg)
  : msg_(msg)
  {}
  Init_FollowMeGetStatus_Response_target_person_id current_distance(::agenticros_msgs::srv::FollowMeGetStatus_Response::_current_distance_type arg)
  {
    msg_.current_distance = std::move(arg);
    return Init_FollowMeGetStatus_Response_target_person_id(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Response msg_;
};

class Init_FollowMeGetStatus_Response_target_distance
{
public:
  explicit Init_FollowMeGetStatus_Response_target_distance(::agenticros_msgs::srv::FollowMeGetStatus_Response & msg)
  : msg_(msg)
  {}
  Init_FollowMeGetStatus_Response_current_distance target_distance(::agenticros_msgs::srv::FollowMeGetStatus_Response::_target_distance_type arg)
  {
    msg_.target_distance = std::move(arg);
    return Init_FollowMeGetStatus_Response_current_distance(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Response msg_;
};

class Init_FollowMeGetStatus_Response_tracking
{
public:
  explicit Init_FollowMeGetStatus_Response_tracking(::agenticros_msgs::srv::FollowMeGetStatus_Response & msg)
  : msg_(msg)
  {}
  Init_FollowMeGetStatus_Response_target_distance tracking(::agenticros_msgs::srv::FollowMeGetStatus_Response::_tracking_type arg)
  {
    msg_.tracking = std::move(arg);
    return Init_FollowMeGetStatus_Response_target_distance(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Response msg_;
};

class Init_FollowMeGetStatus_Response_enabled
{
public:
  explicit Init_FollowMeGetStatus_Response_enabled(::agenticros_msgs::srv::FollowMeGetStatus_Response & msg)
  : msg_(msg)
  {}
  Init_FollowMeGetStatus_Response_tracking enabled(::agenticros_msgs::srv::FollowMeGetStatus_Response::_enabled_type arg)
  {
    msg_.enabled = std::move(arg);
    return Init_FollowMeGetStatus_Response_tracking(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Response msg_;
};

class Init_FollowMeGetStatus_Response_success
{
public:
  Init_FollowMeGetStatus_Response_success()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_FollowMeGetStatus_Response_enabled success(::agenticros_msgs::srv::FollowMeGetStatus_Response::_success_type arg)
  {
    msg_.success = std::move(arg);
    return Init_FollowMeGetStatus_Response_enabled(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Response msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::FollowMeGetStatus_Response>()
{
  return agenticros_msgs::srv::builder::Init_FollowMeGetStatus_Response_success();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace srv
{

namespace builder
{

class Init_FollowMeGetStatus_Event_response
{
public:
  explicit Init_FollowMeGetStatus_Event_response(::agenticros_msgs::srv::FollowMeGetStatus_Event & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::srv::FollowMeGetStatus_Event response(::agenticros_msgs::srv::FollowMeGetStatus_Event::_response_type arg)
  {
    msg_.response = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Event msg_;
};

class Init_FollowMeGetStatus_Event_request
{
public:
  explicit Init_FollowMeGetStatus_Event_request(::agenticros_msgs::srv::FollowMeGetStatus_Event & msg)
  : msg_(msg)
  {}
  Init_FollowMeGetStatus_Event_response request(::agenticros_msgs::srv::FollowMeGetStatus_Event::_request_type arg)
  {
    msg_.request = std::move(arg);
    return Init_FollowMeGetStatus_Event_response(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Event msg_;
};

class Init_FollowMeGetStatus_Event_info
{
public:
  Init_FollowMeGetStatus_Event_info()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_FollowMeGetStatus_Event_request info(::agenticros_msgs::srv::FollowMeGetStatus_Event::_info_type arg)
  {
    msg_.info = std::move(arg);
    return Init_FollowMeGetStatus_Event_request(msg_);
  }

private:
  ::agenticros_msgs::srv::FollowMeGetStatus_Event msg_;
};

}  // namespace builder

}  // namespace srv

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::srv::FollowMeGetStatus_Event>()
{
  return agenticros_msgs::srv::builder::Init_FollowMeGetStatus_Event_info();
}

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_GET_STATUS__BUILDER_HPP_
