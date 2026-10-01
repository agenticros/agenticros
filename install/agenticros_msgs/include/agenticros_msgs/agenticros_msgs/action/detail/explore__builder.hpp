// generated from rosidl_generator_cpp/resource/idl__builder.hpp.em
// with input from agenticros_msgs:action/Explore.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/action/explore.hpp"


#ifndef AGENTICROS_MSGS__ACTION__DETAIL__EXPLORE__BUILDER_HPP_
#define AGENTICROS_MSGS__ACTION__DETAIL__EXPLORE__BUILDER_HPP_

#include <algorithm>
#include <utility>

#include "agenticros_msgs/action/detail/explore__struct.hpp"
#include "rosidl_runtime_cpp/message_initialization.hpp"


namespace agenticros_msgs
{

namespace action
{

namespace builder
{

class Init_Explore_Goal_max_goals
{
public:
  explicit Init_Explore_Goal_max_goals(::agenticros_msgs::action::Explore_Goal & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::action::Explore_Goal max_goals(::agenticros_msgs::action::Explore_Goal::_max_goals_type arg)
  {
    msg_.max_goals = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_Goal msg_;
};

class Init_Explore_Goal_min_frontier_m
{
public:
  explicit Init_Explore_Goal_min_frontier_m(::agenticros_msgs::action::Explore_Goal & msg)
  : msg_(msg)
  {}
  Init_Explore_Goal_max_goals min_frontier_m(::agenticros_msgs::action::Explore_Goal::_min_frontier_m_type arg)
  {
    msg_.min_frontier_m = std::move(arg);
    return Init_Explore_Goal_max_goals(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_Goal msg_;
};

class Init_Explore_Goal_timeout_s
{
public:
  explicit Init_Explore_Goal_timeout_s(::agenticros_msgs::action::Explore_Goal & msg)
  : msg_(msg)
  {}
  Init_Explore_Goal_min_frontier_m timeout_s(::agenticros_msgs::action::Explore_Goal::_timeout_s_type arg)
  {
    msg_.timeout_s = std::move(arg);
    return Init_Explore_Goal_min_frontier_m(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_Goal msg_;
};

class Init_Explore_Goal_mode
{
public:
  Init_Explore_Goal_mode()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_Explore_Goal_timeout_s mode(::agenticros_msgs::action::Explore_Goal::_mode_type arg)
  {
    msg_.mode = std::move(arg);
    return Init_Explore_Goal_timeout_s(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_Goal msg_;
};

}  // namespace builder

}  // namespace action

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::action::Explore_Goal>()
{
  return agenticros_msgs::action::builder::Init_Explore_Goal_mode();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace action
{

namespace builder
{

class Init_Explore_Result_goals_sent
{
public:
  explicit Init_Explore_Result_goals_sent(::agenticros_msgs::action::Explore_Result & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::action::Explore_Result goals_sent(::agenticros_msgs::action::Explore_Result::_goals_sent_type arg)
  {
    msg_.goals_sent = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_Result msg_;
};

class Init_Explore_Result_coverage_ratio
{
public:
  explicit Init_Explore_Result_coverage_ratio(::agenticros_msgs::action::Explore_Result & msg)
  : msg_(msg)
  {}
  Init_Explore_Result_goals_sent coverage_ratio(::agenticros_msgs::action::Explore_Result::_coverage_ratio_type arg)
  {
    msg_.coverage_ratio = std::move(arg);
    return Init_Explore_Result_goals_sent(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_Result msg_;
};

class Init_Explore_Result_message
{
public:
  explicit Init_Explore_Result_message(::agenticros_msgs::action::Explore_Result & msg)
  : msg_(msg)
  {}
  Init_Explore_Result_coverage_ratio message(::agenticros_msgs::action::Explore_Result::_message_type arg)
  {
    msg_.message = std::move(arg);
    return Init_Explore_Result_coverage_ratio(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_Result msg_;
};

class Init_Explore_Result_success
{
public:
  Init_Explore_Result_success()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_Explore_Result_message success(::agenticros_msgs::action::Explore_Result::_success_type arg)
  {
    msg_.success = std::move(arg);
    return Init_Explore_Result_message(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_Result msg_;
};

}  // namespace builder

}  // namespace action

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::action::Explore_Result>()
{
  return agenticros_msgs::action::builder::Init_Explore_Result_success();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace action
{

namespace builder
{

class Init_Explore_Feedback_elapsed_s
{
public:
  explicit Init_Explore_Feedback_elapsed_s(::agenticros_msgs::action::Explore_Feedback & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::action::Explore_Feedback elapsed_s(::agenticros_msgs::action::Explore_Feedback::_elapsed_s_type arg)
  {
    msg_.elapsed_s = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_Feedback msg_;
};

class Init_Explore_Feedback_goals_sent
{
public:
  explicit Init_Explore_Feedback_goals_sent(::agenticros_msgs::action::Explore_Feedback & msg)
  : msg_(msg)
  {}
  Init_Explore_Feedback_elapsed_s goals_sent(::agenticros_msgs::action::Explore_Feedback::_goals_sent_type arg)
  {
    msg_.goals_sent = std::move(arg);
    return Init_Explore_Feedback_elapsed_s(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_Feedback msg_;
};

class Init_Explore_Feedback_coverage_ratio
{
public:
  explicit Init_Explore_Feedback_coverage_ratio(::agenticros_msgs::action::Explore_Feedback & msg)
  : msg_(msg)
  {}
  Init_Explore_Feedback_goals_sent coverage_ratio(::agenticros_msgs::action::Explore_Feedback::_coverage_ratio_type arg)
  {
    msg_.coverage_ratio = std::move(arg);
    return Init_Explore_Feedback_goals_sent(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_Feedback msg_;
};

class Init_Explore_Feedback_state
{
public:
  Init_Explore_Feedback_state()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_Explore_Feedback_coverage_ratio state(::agenticros_msgs::action::Explore_Feedback::_state_type arg)
  {
    msg_.state = std::move(arg);
    return Init_Explore_Feedback_coverage_ratio(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_Feedback msg_;
};

}  // namespace builder

}  // namespace action

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::action::Explore_Feedback>()
{
  return agenticros_msgs::action::builder::Init_Explore_Feedback_state();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace action
{

namespace builder
{

class Init_Explore_SendGoal_Request_goal
{
public:
  explicit Init_Explore_SendGoal_Request_goal(::agenticros_msgs::action::Explore_SendGoal_Request & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::action::Explore_SendGoal_Request goal(::agenticros_msgs::action::Explore_SendGoal_Request::_goal_type arg)
  {
    msg_.goal = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_SendGoal_Request msg_;
};

class Init_Explore_SendGoal_Request_goal_id
{
public:
  Init_Explore_SendGoal_Request_goal_id()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_Explore_SendGoal_Request_goal goal_id(::agenticros_msgs::action::Explore_SendGoal_Request::_goal_id_type arg)
  {
    msg_.goal_id = std::move(arg);
    return Init_Explore_SendGoal_Request_goal(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_SendGoal_Request msg_;
};

}  // namespace builder

}  // namespace action

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::action::Explore_SendGoal_Request>()
{
  return agenticros_msgs::action::builder::Init_Explore_SendGoal_Request_goal_id();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace action
{

namespace builder
{

class Init_Explore_SendGoal_Response_stamp
{
public:
  explicit Init_Explore_SendGoal_Response_stamp(::agenticros_msgs::action::Explore_SendGoal_Response & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::action::Explore_SendGoal_Response stamp(::agenticros_msgs::action::Explore_SendGoal_Response::_stamp_type arg)
  {
    msg_.stamp = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_SendGoal_Response msg_;
};

class Init_Explore_SendGoal_Response_accepted
{
public:
  Init_Explore_SendGoal_Response_accepted()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_Explore_SendGoal_Response_stamp accepted(::agenticros_msgs::action::Explore_SendGoal_Response::_accepted_type arg)
  {
    msg_.accepted = std::move(arg);
    return Init_Explore_SendGoal_Response_stamp(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_SendGoal_Response msg_;
};

}  // namespace builder

}  // namespace action

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::action::Explore_SendGoal_Response>()
{
  return agenticros_msgs::action::builder::Init_Explore_SendGoal_Response_accepted();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace action
{

namespace builder
{

class Init_Explore_SendGoal_Event_response
{
public:
  explicit Init_Explore_SendGoal_Event_response(::agenticros_msgs::action::Explore_SendGoal_Event & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::action::Explore_SendGoal_Event response(::agenticros_msgs::action::Explore_SendGoal_Event::_response_type arg)
  {
    msg_.response = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_SendGoal_Event msg_;
};

class Init_Explore_SendGoal_Event_request
{
public:
  explicit Init_Explore_SendGoal_Event_request(::agenticros_msgs::action::Explore_SendGoal_Event & msg)
  : msg_(msg)
  {}
  Init_Explore_SendGoal_Event_response request(::agenticros_msgs::action::Explore_SendGoal_Event::_request_type arg)
  {
    msg_.request = std::move(arg);
    return Init_Explore_SendGoal_Event_response(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_SendGoal_Event msg_;
};

class Init_Explore_SendGoal_Event_info
{
public:
  Init_Explore_SendGoal_Event_info()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_Explore_SendGoal_Event_request info(::agenticros_msgs::action::Explore_SendGoal_Event::_info_type arg)
  {
    msg_.info = std::move(arg);
    return Init_Explore_SendGoal_Event_request(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_SendGoal_Event msg_;
};

}  // namespace builder

}  // namespace action

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::action::Explore_SendGoal_Event>()
{
  return agenticros_msgs::action::builder::Init_Explore_SendGoal_Event_info();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace action
{

namespace builder
{

class Init_Explore_GetResult_Request_goal_id
{
public:
  Init_Explore_GetResult_Request_goal_id()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  ::agenticros_msgs::action::Explore_GetResult_Request goal_id(::agenticros_msgs::action::Explore_GetResult_Request::_goal_id_type arg)
  {
    msg_.goal_id = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_GetResult_Request msg_;
};

}  // namespace builder

}  // namespace action

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::action::Explore_GetResult_Request>()
{
  return agenticros_msgs::action::builder::Init_Explore_GetResult_Request_goal_id();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace action
{

namespace builder
{

class Init_Explore_GetResult_Response_result
{
public:
  explicit Init_Explore_GetResult_Response_result(::agenticros_msgs::action::Explore_GetResult_Response & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::action::Explore_GetResult_Response result(::agenticros_msgs::action::Explore_GetResult_Response::_result_type arg)
  {
    msg_.result = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_GetResult_Response msg_;
};

class Init_Explore_GetResult_Response_status
{
public:
  Init_Explore_GetResult_Response_status()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_Explore_GetResult_Response_result status(::agenticros_msgs::action::Explore_GetResult_Response::_status_type arg)
  {
    msg_.status = std::move(arg);
    return Init_Explore_GetResult_Response_result(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_GetResult_Response msg_;
};

}  // namespace builder

}  // namespace action

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::action::Explore_GetResult_Response>()
{
  return agenticros_msgs::action::builder::Init_Explore_GetResult_Response_status();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace action
{

namespace builder
{

class Init_Explore_GetResult_Event_response
{
public:
  explicit Init_Explore_GetResult_Event_response(::agenticros_msgs::action::Explore_GetResult_Event & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::action::Explore_GetResult_Event response(::agenticros_msgs::action::Explore_GetResult_Event::_response_type arg)
  {
    msg_.response = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_GetResult_Event msg_;
};

class Init_Explore_GetResult_Event_request
{
public:
  explicit Init_Explore_GetResult_Event_request(::agenticros_msgs::action::Explore_GetResult_Event & msg)
  : msg_(msg)
  {}
  Init_Explore_GetResult_Event_response request(::agenticros_msgs::action::Explore_GetResult_Event::_request_type arg)
  {
    msg_.request = std::move(arg);
    return Init_Explore_GetResult_Event_response(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_GetResult_Event msg_;
};

class Init_Explore_GetResult_Event_info
{
public:
  Init_Explore_GetResult_Event_info()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_Explore_GetResult_Event_request info(::agenticros_msgs::action::Explore_GetResult_Event::_info_type arg)
  {
    msg_.info = std::move(arg);
    return Init_Explore_GetResult_Event_request(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_GetResult_Event msg_;
};

}  // namespace builder

}  // namespace action

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::action::Explore_GetResult_Event>()
{
  return agenticros_msgs::action::builder::Init_Explore_GetResult_Event_info();
}

}  // namespace agenticros_msgs


namespace agenticros_msgs
{

namespace action
{

namespace builder
{

class Init_Explore_FeedbackMessage_feedback
{
public:
  explicit Init_Explore_FeedbackMessage_feedback(::agenticros_msgs::action::Explore_FeedbackMessage & msg)
  : msg_(msg)
  {}
  ::agenticros_msgs::action::Explore_FeedbackMessage feedback(::agenticros_msgs::action::Explore_FeedbackMessage::_feedback_type arg)
  {
    msg_.feedback = std::move(arg);
    return std::move(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_FeedbackMessage msg_;
};

class Init_Explore_FeedbackMessage_goal_id
{
public:
  Init_Explore_FeedbackMessage_goal_id()
  : msg_(::rosidl_runtime_cpp::MessageInitialization::SKIP)
  {}
  Init_Explore_FeedbackMessage_feedback goal_id(::agenticros_msgs::action::Explore_FeedbackMessage::_goal_id_type arg)
  {
    msg_.goal_id = std::move(arg);
    return Init_Explore_FeedbackMessage_feedback(msg_);
  }

private:
  ::agenticros_msgs::action::Explore_FeedbackMessage msg_;
};

}  // namespace builder

}  // namespace action

template<typename MessageType>
auto build();

template<>
inline
auto build<::agenticros_msgs::action::Explore_FeedbackMessage>()
{
  return agenticros_msgs::action::builder::Init_Explore_FeedbackMessage_goal_id();
}

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__ACTION__DETAIL__EXPLORE__BUILDER_HPP_
