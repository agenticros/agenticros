// generated from rosidl_generator_cpp/resource/idl__struct.hpp.em
// with input from agenticros_msgs:srv/FollowMeGetStatus.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/srv/follow_me_get_status.hpp"


#ifndef AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_GET_STATUS__STRUCT_HPP_
#define AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_GET_STATUS__STRUCT_HPP_

#include <algorithm>
#include <array>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "rosidl_runtime_cpp/bounded_vector.hpp"
#include "rosidl_runtime_cpp/message_initialization.hpp"


#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__srv__FollowMeGetStatus_Request __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__srv__FollowMeGetStatus_Request __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace srv
{

// message struct
template<class ContainerAllocator>
struct FollowMeGetStatus_Request_
{
  using Type = FollowMeGetStatus_Request_<ContainerAllocator>;

  explicit FollowMeGetStatus_Request_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->structure_needs_at_least_one_member = 0;
    }
  }

  explicit FollowMeGetStatus_Request_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  {
    (void)_alloc;
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->structure_needs_at_least_one_member = 0;
    }
  }

  // field types and members
  using _structure_needs_at_least_one_member_type =
    uint8_t;
  _structure_needs_at_least_one_member_type structure_needs_at_least_one_member;


  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__srv__FollowMeGetStatus_Request
    std::shared_ptr<agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__srv__FollowMeGetStatus_Request
    std::shared_ptr<agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const FollowMeGetStatus_Request_ & other) const
  {
    if (this->structure_needs_at_least_one_member != other.structure_needs_at_least_one_member) {
      return false;
    }
    return true;
  }
  bool operator!=(const FollowMeGetStatus_Request_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct FollowMeGetStatus_Request_

// alias to use template instance with default allocator
using FollowMeGetStatus_Request =
  agenticros_msgs::srv::FollowMeGetStatus_Request_<std::allocator<void>>;

// constant definitions

}  // namespace srv

}  // namespace agenticros_msgs


// Include directives for member types
// Member 'twist'
#include "geometry_msgs/msg/detail/twist__struct.hpp"

#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__srv__FollowMeGetStatus_Response __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__srv__FollowMeGetStatus_Response __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace srv
{

// message struct
template<class ContainerAllocator>
struct FollowMeGetStatus_Response_
{
  using Type = FollowMeGetStatus_Response_<ContainerAllocator>;

  explicit FollowMeGetStatus_Response_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : twist(_init)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->success = false;
      this->enabled = false;
      this->tracking = false;
      this->target_distance = 0.0f;
      this->current_distance = 0.0f;
      this->target_person_id = 0l;
      this->target_description = "";
      this->persons_detected = 0l;
      this->error_message = "";
    }
  }

  explicit FollowMeGetStatus_Response_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : target_description(_alloc),
    twist(_alloc, _init),
    error_message(_alloc)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->success = false;
      this->enabled = false;
      this->tracking = false;
      this->target_distance = 0.0f;
      this->current_distance = 0.0f;
      this->target_person_id = 0l;
      this->target_description = "";
      this->persons_detected = 0l;
      this->error_message = "";
    }
  }

  // field types and members
  using _success_type =
    bool;
  _success_type success;
  using _enabled_type =
    bool;
  _enabled_type enabled;
  using _tracking_type =
    bool;
  _tracking_type tracking;
  using _target_distance_type =
    float;
  _target_distance_type target_distance;
  using _current_distance_type =
    float;
  _current_distance_type current_distance;
  using _target_person_id_type =
    int32_t;
  _target_person_id_type target_person_id;
  using _target_description_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _target_description_type target_description;
  using _persons_detected_type =
    int32_t;
  _persons_detected_type persons_detected;
  using _twist_type =
    geometry_msgs::msg::Twist_<ContainerAllocator>;
  _twist_type twist;
  using _error_message_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _error_message_type error_message;

  // setters for named parameter idiom
  Type & set__success(
    const bool & _arg)
  {
    this->success = _arg;
    return *this;
  }
  Type & set__enabled(
    const bool & _arg)
  {
    this->enabled = _arg;
    return *this;
  }
  Type & set__tracking(
    const bool & _arg)
  {
    this->tracking = _arg;
    return *this;
  }
  Type & set__target_distance(
    const float & _arg)
  {
    this->target_distance = _arg;
    return *this;
  }
  Type & set__current_distance(
    const float & _arg)
  {
    this->current_distance = _arg;
    return *this;
  }
  Type & set__target_person_id(
    const int32_t & _arg)
  {
    this->target_person_id = _arg;
    return *this;
  }
  Type & set__target_description(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->target_description = _arg;
    return *this;
  }
  Type & set__persons_detected(
    const int32_t & _arg)
  {
    this->persons_detected = _arg;
    return *this;
  }
  Type & set__twist(
    const geometry_msgs::msg::Twist_<ContainerAllocator> & _arg)
  {
    this->twist = _arg;
    return *this;
  }
  Type & set__error_message(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->error_message = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__srv__FollowMeGetStatus_Response
    std::shared_ptr<agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__srv__FollowMeGetStatus_Response
    std::shared_ptr<agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const FollowMeGetStatus_Response_ & other) const
  {
    if (this->success != other.success) {
      return false;
    }
    if (this->enabled != other.enabled) {
      return false;
    }
    if (this->tracking != other.tracking) {
      return false;
    }
    if (this->target_distance != other.target_distance) {
      return false;
    }
    if (this->current_distance != other.current_distance) {
      return false;
    }
    if (this->target_person_id != other.target_person_id) {
      return false;
    }
    if (this->target_description != other.target_description) {
      return false;
    }
    if (this->persons_detected != other.persons_detected) {
      return false;
    }
    if (this->twist != other.twist) {
      return false;
    }
    if (this->error_message != other.error_message) {
      return false;
    }
    return true;
  }
  bool operator!=(const FollowMeGetStatus_Response_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct FollowMeGetStatus_Response_

// alias to use template instance with default allocator
using FollowMeGetStatus_Response =
  agenticros_msgs::srv::FollowMeGetStatus_Response_<std::allocator<void>>;

// constant definitions

}  // namespace srv

}  // namespace agenticros_msgs


// Include directives for member types
// Member 'info'
#include "service_msgs/msg/detail/service_event_info__struct.hpp"

#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__srv__FollowMeGetStatus_Event __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__srv__FollowMeGetStatus_Event __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace srv
{

// message struct
template<class ContainerAllocator>
struct FollowMeGetStatus_Event_
{
  using Type = FollowMeGetStatus_Event_<ContainerAllocator>;

  explicit FollowMeGetStatus_Event_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : info(_init)
  {
    (void)_init;
  }

  explicit FollowMeGetStatus_Event_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : info(_alloc, _init)
  {
    (void)_init;
  }

  // field types and members
  using _info_type =
    service_msgs::msg::ServiceEventInfo_<ContainerAllocator>;
  _info_type info;
  using _request_type =
    rosidl_runtime_cpp::BoundedVector<agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator>>>;
  _request_type request;
  using _response_type =
    rosidl_runtime_cpp::BoundedVector<agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator>>>;
  _response_type response;

  // setters for named parameter idiom
  Type & set__info(
    const service_msgs::msg::ServiceEventInfo_<ContainerAllocator> & _arg)
  {
    this->info = _arg;
    return *this;
  }
  Type & set__request(
    const rosidl_runtime_cpp::BoundedVector<agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::srv::FollowMeGetStatus_Request_<ContainerAllocator>>> & _arg)
  {
    this->request = _arg;
    return *this;
  }
  Type & set__response(
    const rosidl_runtime_cpp::BoundedVector<agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::srv::FollowMeGetStatus_Response_<ContainerAllocator>>> & _arg)
  {
    this->response = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::srv::FollowMeGetStatus_Event_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::srv::FollowMeGetStatus_Event_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::srv::FollowMeGetStatus_Event_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::srv::FollowMeGetStatus_Event_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::srv::FollowMeGetStatus_Event_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::srv::FollowMeGetStatus_Event_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::srv::FollowMeGetStatus_Event_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::srv::FollowMeGetStatus_Event_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::srv::FollowMeGetStatus_Event_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::srv::FollowMeGetStatus_Event_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__srv__FollowMeGetStatus_Event
    std::shared_ptr<agenticros_msgs::srv::FollowMeGetStatus_Event_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__srv__FollowMeGetStatus_Event
    std::shared_ptr<agenticros_msgs::srv::FollowMeGetStatus_Event_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const FollowMeGetStatus_Event_ & other) const
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
  bool operator!=(const FollowMeGetStatus_Event_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct FollowMeGetStatus_Event_

// alias to use template instance with default allocator
using FollowMeGetStatus_Event =
  agenticros_msgs::srv::FollowMeGetStatus_Event_<std::allocator<void>>;

// constant definitions

}  // namespace srv

}  // namespace agenticros_msgs

namespace agenticros_msgs
{

namespace srv
{

struct FollowMeGetStatus
{
  using Request = agenticros_msgs::srv::FollowMeGetStatus_Request;
  using Response = agenticros_msgs::srv::FollowMeGetStatus_Response;
  using Event = agenticros_msgs::srv::FollowMeGetStatus_Event;
};

}  // namespace srv

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_GET_STATUS__STRUCT_HPP_
