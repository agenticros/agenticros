// generated from rosidl_generator_cpp/resource/idl__struct.hpp.em
// with input from agenticros_msgs:action/Explore.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/action/explore.hpp"


#ifndef AGENTICROS_MSGS__ACTION__DETAIL__EXPLORE__STRUCT_HPP_
#define AGENTICROS_MSGS__ACTION__DETAIL__EXPLORE__STRUCT_HPP_

#include <algorithm>
#include <array>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "rosidl_runtime_cpp/bounded_vector.hpp"
#include "rosidl_runtime_cpp/message_initialization.hpp"


#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__action__Explore_Goal __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__action__Explore_Goal __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace action
{

// message struct
template<class ContainerAllocator>
struct Explore_Goal_
{
  using Type = Explore_Goal_<ContainerAllocator>;

  explicit Explore_Goal_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->mode = "";
      this->timeout_s = 0.0f;
      this->min_frontier_m = 0.0f;
      this->max_goals = 0l;
    }
  }

  explicit Explore_Goal_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : mode(_alloc)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->mode = "";
      this->timeout_s = 0.0f;
      this->min_frontier_m = 0.0f;
      this->max_goals = 0l;
    }
  }

  // field types and members
  using _mode_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _mode_type mode;
  using _timeout_s_type =
    float;
  _timeout_s_type timeout_s;
  using _min_frontier_m_type =
    float;
  _min_frontier_m_type min_frontier_m;
  using _max_goals_type =
    int32_t;
  _max_goals_type max_goals;

  // setters for named parameter idiom
  Type & set__mode(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->mode = _arg;
    return *this;
  }
  Type & set__timeout_s(
    const float & _arg)
  {
    this->timeout_s = _arg;
    return *this;
  }
  Type & set__min_frontier_m(
    const float & _arg)
  {
    this->min_frontier_m = _arg;
    return *this;
  }
  Type & set__max_goals(
    const int32_t & _arg)
  {
    this->max_goals = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::action::Explore_Goal_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::action::Explore_Goal_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_Goal_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_Goal_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_Goal_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_Goal_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_Goal_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_Goal_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_Goal_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_Goal_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__action__Explore_Goal
    std::shared_ptr<agenticros_msgs::action::Explore_Goal_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__action__Explore_Goal
    std::shared_ptr<agenticros_msgs::action::Explore_Goal_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const Explore_Goal_ & other) const
  {
    if (this->mode != other.mode) {
      return false;
    }
    if (this->timeout_s != other.timeout_s) {
      return false;
    }
    if (this->min_frontier_m != other.min_frontier_m) {
      return false;
    }
    if (this->max_goals != other.max_goals) {
      return false;
    }
    return true;
  }
  bool operator!=(const Explore_Goal_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct Explore_Goal_

// alias to use template instance with default allocator
using Explore_Goal =
  agenticros_msgs::action::Explore_Goal_<std::allocator<void>>;

// constant definitions

}  // namespace action

}  // namespace agenticros_msgs


#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__action__Explore_Result __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__action__Explore_Result __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace action
{

// message struct
template<class ContainerAllocator>
struct Explore_Result_
{
  using Type = Explore_Result_<ContainerAllocator>;

  explicit Explore_Result_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->success = false;
      this->message = "";
      this->coverage_ratio = 0.0f;
      this->goals_sent = 0ul;
    }
  }

  explicit Explore_Result_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : message(_alloc)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->success = false;
      this->message = "";
      this->coverage_ratio = 0.0f;
      this->goals_sent = 0ul;
    }
  }

  // field types and members
  using _success_type =
    bool;
  _success_type success;
  using _message_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _message_type message;
  using _coverage_ratio_type =
    float;
  _coverage_ratio_type coverage_ratio;
  using _goals_sent_type =
    uint32_t;
  _goals_sent_type goals_sent;

  // setters for named parameter idiom
  Type & set__success(
    const bool & _arg)
  {
    this->success = _arg;
    return *this;
  }
  Type & set__message(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->message = _arg;
    return *this;
  }
  Type & set__coverage_ratio(
    const float & _arg)
  {
    this->coverage_ratio = _arg;
    return *this;
  }
  Type & set__goals_sent(
    const uint32_t & _arg)
  {
    this->goals_sent = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::action::Explore_Result_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::action::Explore_Result_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_Result_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_Result_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_Result_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_Result_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_Result_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_Result_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_Result_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_Result_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__action__Explore_Result
    std::shared_ptr<agenticros_msgs::action::Explore_Result_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__action__Explore_Result
    std::shared_ptr<agenticros_msgs::action::Explore_Result_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const Explore_Result_ & other) const
  {
    if (this->success != other.success) {
      return false;
    }
    if (this->message != other.message) {
      return false;
    }
    if (this->coverage_ratio != other.coverage_ratio) {
      return false;
    }
    if (this->goals_sent != other.goals_sent) {
      return false;
    }
    return true;
  }
  bool operator!=(const Explore_Result_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct Explore_Result_

// alias to use template instance with default allocator
using Explore_Result =
  agenticros_msgs::action::Explore_Result_<std::allocator<void>>;

// constant definitions

}  // namespace action

}  // namespace agenticros_msgs


#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__action__Explore_Feedback __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__action__Explore_Feedback __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace action
{

// message struct
template<class ContainerAllocator>
struct Explore_Feedback_
{
  using Type = Explore_Feedback_<ContainerAllocator>;

  explicit Explore_Feedback_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->state = "";
      this->coverage_ratio = 0.0f;
      this->goals_sent = 0ul;
      this->elapsed_s = 0.0f;
    }
  }

  explicit Explore_Feedback_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : state(_alloc)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->state = "";
      this->coverage_ratio = 0.0f;
      this->goals_sent = 0ul;
      this->elapsed_s = 0.0f;
    }
  }

  // field types and members
  using _state_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _state_type state;
  using _coverage_ratio_type =
    float;
  _coverage_ratio_type coverage_ratio;
  using _goals_sent_type =
    uint32_t;
  _goals_sent_type goals_sent;
  using _elapsed_s_type =
    float;
  _elapsed_s_type elapsed_s;

  // setters for named parameter idiom
  Type & set__state(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->state = _arg;
    return *this;
  }
  Type & set__coverage_ratio(
    const float & _arg)
  {
    this->coverage_ratio = _arg;
    return *this;
  }
  Type & set__goals_sent(
    const uint32_t & _arg)
  {
    this->goals_sent = _arg;
    return *this;
  }
  Type & set__elapsed_s(
    const float & _arg)
  {
    this->elapsed_s = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::action::Explore_Feedback_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::action::Explore_Feedback_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_Feedback_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_Feedback_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_Feedback_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_Feedback_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_Feedback_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_Feedback_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_Feedback_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_Feedback_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__action__Explore_Feedback
    std::shared_ptr<agenticros_msgs::action::Explore_Feedback_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__action__Explore_Feedback
    std::shared_ptr<agenticros_msgs::action::Explore_Feedback_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const Explore_Feedback_ & other) const
  {
    if (this->state != other.state) {
      return false;
    }
    if (this->coverage_ratio != other.coverage_ratio) {
      return false;
    }
    if (this->goals_sent != other.goals_sent) {
      return false;
    }
    if (this->elapsed_s != other.elapsed_s) {
      return false;
    }
    return true;
  }
  bool operator!=(const Explore_Feedback_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct Explore_Feedback_

// alias to use template instance with default allocator
using Explore_Feedback =
  agenticros_msgs::action::Explore_Feedback_<std::allocator<void>>;

// constant definitions

}  // namespace action

}  // namespace agenticros_msgs


// Include directives for member types
// Member 'goal_id'
#include "unique_identifier_msgs/msg/detail/uuid__struct.hpp"
// Member 'goal'
#include "agenticros_msgs/action/detail/explore__struct.hpp"

#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__action__Explore_SendGoal_Request __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__action__Explore_SendGoal_Request __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace action
{

// message struct
template<class ContainerAllocator>
struct Explore_SendGoal_Request_
{
  using Type = Explore_SendGoal_Request_<ContainerAllocator>;

  explicit Explore_SendGoal_Request_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : goal_id(_init),
    goal(_init)
  {
    (void)_init;
  }

  explicit Explore_SendGoal_Request_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : goal_id(_alloc, _init),
    goal(_alloc, _init)
  {
    (void)_init;
  }

  // field types and members
  using _goal_id_type =
    unique_identifier_msgs::msg::UUID_<ContainerAllocator>;
  _goal_id_type goal_id;
  using _goal_type =
    agenticros_msgs::action::Explore_Goal_<ContainerAllocator>;
  _goal_type goal;

  // setters for named parameter idiom
  Type & set__goal_id(
    const unique_identifier_msgs::msg::UUID_<ContainerAllocator> & _arg)
  {
    this->goal_id = _arg;
    return *this;
  }
  Type & set__goal(
    const agenticros_msgs::action::Explore_Goal_<ContainerAllocator> & _arg)
  {
    this->goal = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__action__Explore_SendGoal_Request
    std::shared_ptr<agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__action__Explore_SendGoal_Request
    std::shared_ptr<agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const Explore_SendGoal_Request_ & other) const
  {
    if (this->goal_id != other.goal_id) {
      return false;
    }
    if (this->goal != other.goal) {
      return false;
    }
    return true;
  }
  bool operator!=(const Explore_SendGoal_Request_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct Explore_SendGoal_Request_

// alias to use template instance with default allocator
using Explore_SendGoal_Request =
  agenticros_msgs::action::Explore_SendGoal_Request_<std::allocator<void>>;

// constant definitions

}  // namespace action

}  // namespace agenticros_msgs


// Include directives for member types
// Member 'stamp'
#include "builtin_interfaces/msg/detail/time__struct.hpp"

#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__action__Explore_SendGoal_Response __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__action__Explore_SendGoal_Response __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace action
{

// message struct
template<class ContainerAllocator>
struct Explore_SendGoal_Response_
{
  using Type = Explore_SendGoal_Response_<ContainerAllocator>;

  explicit Explore_SendGoal_Response_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : stamp(_init)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->accepted = false;
    }
  }

  explicit Explore_SendGoal_Response_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : stamp(_alloc, _init)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->accepted = false;
    }
  }

  // field types and members
  using _accepted_type =
    bool;
  _accepted_type accepted;
  using _stamp_type =
    builtin_interfaces::msg::Time_<ContainerAllocator>;
  _stamp_type stamp;

  // setters for named parameter idiom
  Type & set__accepted(
    const bool & _arg)
  {
    this->accepted = _arg;
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
    agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__action__Explore_SendGoal_Response
    std::shared_ptr<agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__action__Explore_SendGoal_Response
    std::shared_ptr<agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const Explore_SendGoal_Response_ & other) const
  {
    if (this->accepted != other.accepted) {
      return false;
    }
    if (this->stamp != other.stamp) {
      return false;
    }
    return true;
  }
  bool operator!=(const Explore_SendGoal_Response_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct Explore_SendGoal_Response_

// alias to use template instance with default allocator
using Explore_SendGoal_Response =
  agenticros_msgs::action::Explore_SendGoal_Response_<std::allocator<void>>;

// constant definitions

}  // namespace action

}  // namespace agenticros_msgs


// Include directives for member types
// Member 'info'
#include "service_msgs/msg/detail/service_event_info__struct.hpp"

#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__action__Explore_SendGoal_Event __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__action__Explore_SendGoal_Event __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace action
{

// message struct
template<class ContainerAllocator>
struct Explore_SendGoal_Event_
{
  using Type = Explore_SendGoal_Event_<ContainerAllocator>;

  explicit Explore_SendGoal_Event_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : info(_init)
  {
    (void)_init;
  }

  explicit Explore_SendGoal_Event_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : info(_alloc, _init)
  {
    (void)_init;
  }

  // field types and members
  using _info_type =
    service_msgs::msg::ServiceEventInfo_<ContainerAllocator>;
  _info_type info;
  using _request_type =
    rosidl_runtime_cpp::BoundedVector<agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator>>>;
  _request_type request;
  using _response_type =
    rosidl_runtime_cpp::BoundedVector<agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator>>>;
  _response_type response;

  // setters for named parameter idiom
  Type & set__info(
    const service_msgs::msg::ServiceEventInfo_<ContainerAllocator> & _arg)
  {
    this->info = _arg;
    return *this;
  }
  Type & set__request(
    const rosidl_runtime_cpp::BoundedVector<agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::action::Explore_SendGoal_Request_<ContainerAllocator>>> & _arg)
  {
    this->request = _arg;
    return *this;
  }
  Type & set__response(
    const rosidl_runtime_cpp::BoundedVector<agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::action::Explore_SendGoal_Response_<ContainerAllocator>>> & _arg)
  {
    this->response = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::action::Explore_SendGoal_Event_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::action::Explore_SendGoal_Event_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_SendGoal_Event_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_SendGoal_Event_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_SendGoal_Event_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_SendGoal_Event_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_SendGoal_Event_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_SendGoal_Event_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_SendGoal_Event_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_SendGoal_Event_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__action__Explore_SendGoal_Event
    std::shared_ptr<agenticros_msgs::action::Explore_SendGoal_Event_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__action__Explore_SendGoal_Event
    std::shared_ptr<agenticros_msgs::action::Explore_SendGoal_Event_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const Explore_SendGoal_Event_ & other) const
  {
    if (this->info != other.info) {
      return false;
    }
    if (this->request != other.request) {
      return false;
    }
    if (this->response != other.response) {
      return false;
    }
    return true;
  }
  bool operator!=(const Explore_SendGoal_Event_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct Explore_SendGoal_Event_

// alias to use template instance with default allocator
using Explore_SendGoal_Event =
  agenticros_msgs::action::Explore_SendGoal_Event_<std::allocator<void>>;

// constant definitions

}  // namespace action

}  // namespace agenticros_msgs

namespace agenticros_msgs
{

namespace action
{

struct Explore_SendGoal
{
  using Request = agenticros_msgs::action::Explore_SendGoal_Request;
  using Response = agenticros_msgs::action::Explore_SendGoal_Response;
  using Event = agenticros_msgs::action::Explore_SendGoal_Event;
};

}  // namespace action

}  // namespace agenticros_msgs


// Include directives for member types
// Member 'goal_id'
// already included above
// #include "unique_identifier_msgs/msg/detail/uuid__struct.hpp"

#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__action__Explore_GetResult_Request __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__action__Explore_GetResult_Request __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace action
{

// message struct
template<class ContainerAllocator>
struct Explore_GetResult_Request_
{
  using Type = Explore_GetResult_Request_<ContainerAllocator>;

  explicit Explore_GetResult_Request_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : goal_id(_init)
  {
    (void)_init;
  }

  explicit Explore_GetResult_Request_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : goal_id(_alloc, _init)
  {
    (void)_init;
  }

  // field types and members
  using _goal_id_type =
    unique_identifier_msgs::msg::UUID_<ContainerAllocator>;
  _goal_id_type goal_id;

  // setters for named parameter idiom
  Type & set__goal_id(
    const unique_identifier_msgs::msg::UUID_<ContainerAllocator> & _arg)
  {
    this->goal_id = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__action__Explore_GetResult_Request
    std::shared_ptr<agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__action__Explore_GetResult_Request
    std::shared_ptr<agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const Explore_GetResult_Request_ & other) const
  {
    if (this->goal_id != other.goal_id) {
      return false;
    }
    return true;
  }
  bool operator!=(const Explore_GetResult_Request_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct Explore_GetResult_Request_

// alias to use template instance with default allocator
using Explore_GetResult_Request =
  agenticros_msgs::action::Explore_GetResult_Request_<std::allocator<void>>;

// constant definitions

}  // namespace action

}  // namespace agenticros_msgs


// Include directives for member types
// Member 'result'
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"

#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__action__Explore_GetResult_Response __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__action__Explore_GetResult_Response __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace action
{

// message struct
template<class ContainerAllocator>
struct Explore_GetResult_Response_
{
  using Type = Explore_GetResult_Response_<ContainerAllocator>;

  explicit Explore_GetResult_Response_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : result(_init)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->status = 0;
    }
  }

  explicit Explore_GetResult_Response_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : result(_alloc, _init)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->status = 0;
    }
  }

  // field types and members
  using _status_type =
    int8_t;
  _status_type status;
  using _result_type =
    agenticros_msgs::action::Explore_Result_<ContainerAllocator>;
  _result_type result;

  // setters for named parameter idiom
  Type & set__status(
    const int8_t & _arg)
  {
    this->status = _arg;
    return *this;
  }
  Type & set__result(
    const agenticros_msgs::action::Explore_Result_<ContainerAllocator> & _arg)
  {
    this->result = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__action__Explore_GetResult_Response
    std::shared_ptr<agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__action__Explore_GetResult_Response
    std::shared_ptr<agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const Explore_GetResult_Response_ & other) const
  {
    if (this->status != other.status) {
      return false;
    }
    if (this->result != other.result) {
      return false;
    }
    return true;
  }
  bool operator!=(const Explore_GetResult_Response_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct Explore_GetResult_Response_

// alias to use template instance with default allocator
using Explore_GetResult_Response =
  agenticros_msgs::action::Explore_GetResult_Response_<std::allocator<void>>;

// constant definitions

}  // namespace action

}  // namespace agenticros_msgs


// Include directives for member types
// Member 'info'
// already included above
// #include "service_msgs/msg/detail/service_event_info__struct.hpp"

#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__action__Explore_GetResult_Event __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__action__Explore_GetResult_Event __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace action
{

// message struct
template<class ContainerAllocator>
struct Explore_GetResult_Event_
{
  using Type = Explore_GetResult_Event_<ContainerAllocator>;

  explicit Explore_GetResult_Event_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : info(_init)
  {
    (void)_init;
  }

  explicit Explore_GetResult_Event_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : info(_alloc, _init)
  {
    (void)_init;
  }

  // field types and members
  using _info_type =
    service_msgs::msg::ServiceEventInfo_<ContainerAllocator>;
  _info_type info;
  using _request_type =
    rosidl_runtime_cpp::BoundedVector<agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator>>>;
  _request_type request;
  using _response_type =
    rosidl_runtime_cpp::BoundedVector<agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator>>>;
  _response_type response;

  // setters for named parameter idiom
  Type & set__info(
    const service_msgs::msg::ServiceEventInfo_<ContainerAllocator> & _arg)
  {
    this->info = _arg;
    return *this;
  }
  Type & set__request(
    const rosidl_runtime_cpp::BoundedVector<agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::action::Explore_GetResult_Request_<ContainerAllocator>>> & _arg)
  {
    this->request = _arg;
    return *this;
  }
  Type & set__response(
    const rosidl_runtime_cpp::BoundedVector<agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::action::Explore_GetResult_Response_<ContainerAllocator>>> & _arg)
  {
    this->response = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::action::Explore_GetResult_Event_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::action::Explore_GetResult_Event_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_GetResult_Event_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_GetResult_Event_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_GetResult_Event_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_GetResult_Event_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_GetResult_Event_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_GetResult_Event_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_GetResult_Event_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_GetResult_Event_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__action__Explore_GetResult_Event
    std::shared_ptr<agenticros_msgs::action::Explore_GetResult_Event_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__action__Explore_GetResult_Event
    std::shared_ptr<agenticros_msgs::action::Explore_GetResult_Event_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const Explore_GetResult_Event_ & other) const
  {
    if (this->info != other.info) {
      return false;
    }
    if (this->request != other.request) {
      return false;
    }
    if (this->response != other.response) {
      return false;
    }
    return true;
  }
  bool operator!=(const Explore_GetResult_Event_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct Explore_GetResult_Event_

// alias to use template instance with default allocator
using Explore_GetResult_Event =
  agenticros_msgs::action::Explore_GetResult_Event_<std::allocator<void>>;

// constant definitions

}  // namespace action

}  // namespace agenticros_msgs

namespace agenticros_msgs
{

namespace action
{

struct Explore_GetResult
{
  using Request = agenticros_msgs::action::Explore_GetResult_Request;
  using Response = agenticros_msgs::action::Explore_GetResult_Response;
  using Event = agenticros_msgs::action::Explore_GetResult_Event;
};

}  // namespace action

}  // namespace agenticros_msgs


// Include directives for member types
// Member 'goal_id'
// already included above
// #include "unique_identifier_msgs/msg/detail/uuid__struct.hpp"
// Member 'feedback'
// already included above
// #include "agenticros_msgs/action/detail/explore__struct.hpp"

#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__action__Explore_FeedbackMessage __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__action__Explore_FeedbackMessage __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace action
{

// message struct
template<class ContainerAllocator>
struct Explore_FeedbackMessage_
{
  using Type = Explore_FeedbackMessage_<ContainerAllocator>;

  explicit Explore_FeedbackMessage_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : goal_id(_init),
    feedback(_init)
  {
    (void)_init;
  }

  explicit Explore_FeedbackMessage_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : goal_id(_alloc, _init),
    feedback(_alloc, _init)
  {
    (void)_init;
  }

  // field types and members
  using _goal_id_type =
    unique_identifier_msgs::msg::UUID_<ContainerAllocator>;
  _goal_id_type goal_id;
  using _feedback_type =
    agenticros_msgs::action::Explore_Feedback_<ContainerAllocator>;
  _feedback_type feedback;

  // setters for named parameter idiom
  Type & set__goal_id(
    const unique_identifier_msgs::msg::UUID_<ContainerAllocator> & _arg)
  {
    this->goal_id = _arg;
    return *this;
  }
  Type & set__feedback(
    const agenticros_msgs::action::Explore_Feedback_<ContainerAllocator> & _arg)
  {
    this->feedback = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::action::Explore_FeedbackMessage_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::action::Explore_FeedbackMessage_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_FeedbackMessage_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::action::Explore_FeedbackMessage_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_FeedbackMessage_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_FeedbackMessage_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::action::Explore_FeedbackMessage_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::action::Explore_FeedbackMessage_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_FeedbackMessage_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::action::Explore_FeedbackMessage_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__action__Explore_FeedbackMessage
    std::shared_ptr<agenticros_msgs::action::Explore_FeedbackMessage_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__action__Explore_FeedbackMessage
    std::shared_ptr<agenticros_msgs::action::Explore_FeedbackMessage_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const Explore_FeedbackMessage_ & other) const
  {
    if (this->goal_id != other.goal_id) {
      return false;
    }
    if (this->feedback != other.feedback) {
      return false;
    }
    return true;
  }
  bool operator!=(const Explore_FeedbackMessage_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct Explore_FeedbackMessage_

// alias to use template instance with default allocator
using Explore_FeedbackMessage =
  agenticros_msgs::action::Explore_FeedbackMessage_<std::allocator<void>>;

// constant definitions

}  // namespace action

}  // namespace agenticros_msgs

#include "action_msgs/srv/cancel_goal.hpp"
#include "action_msgs/msg/goal_info.hpp"
#include "action_msgs/msg/goal_status_array.hpp"

namespace agenticros_msgs
{

namespace action
{

struct Explore
{
  /// The goal message defined in the action definition.
  using Goal = agenticros_msgs::action::Explore_Goal;
  /// The result message defined in the action definition.
  using Result = agenticros_msgs::action::Explore_Result;
  /// The feedback message defined in the action definition.
  using Feedback = agenticros_msgs::action::Explore_Feedback;

  struct Impl
  {
    /// The send_goal service using a wrapped version of the goal message as a request.
    using SendGoalService = agenticros_msgs::action::Explore_SendGoal;
    /// The get_result service using a wrapped version of the result message as a response.
    using GetResultService = agenticros_msgs::action::Explore_GetResult;
    /// The feedback message with generic fields which wraps the feedback message.
    using FeedbackMessage = agenticros_msgs::action::Explore_FeedbackMessage;

    /// The generic service to cancel a goal.
    using CancelGoalService = action_msgs::srv::CancelGoal;
    /// The generic message for the status of a goal.
    using GoalStatusMessage = action_msgs::msg::GoalStatusArray;
  };
};

typedef struct Explore Explore;

}  // namespace action

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__ACTION__DETAIL__EXPLORE__STRUCT_HPP_
