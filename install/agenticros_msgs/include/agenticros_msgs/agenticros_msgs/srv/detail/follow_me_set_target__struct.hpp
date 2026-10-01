// generated from rosidl_generator_cpp/resource/idl__struct.hpp.em
// with input from agenticros_msgs:srv/FollowMeSetTarget.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/srv/follow_me_set_target.hpp"


#ifndef AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_SET_TARGET__STRUCT_HPP_
#define AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_SET_TARGET__STRUCT_HPP_

#include <algorithm>
#include <array>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "rosidl_runtime_cpp/bounded_vector.hpp"
#include "rosidl_runtime_cpp/message_initialization.hpp"


#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__srv__FollowMeSetTarget_Request __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__srv__FollowMeSetTarget_Request __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace srv
{

// message struct
template<class ContainerAllocator>
struct FollowMeSetTarget_Request_
{
  using Type = FollowMeSetTarget_Request_<ContainerAllocator>;

  explicit FollowMeSetTarget_Request_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->description = "";
    }
  }

  explicit FollowMeSetTarget_Request_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : description(_alloc)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->description = "";
    }
  }

  // field types and members
  using _description_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _description_type description;

  // setters for named parameter idiom
  Type & set__description(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->description = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__srv__FollowMeSetTarget_Request
    std::shared_ptr<agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__srv__FollowMeSetTarget_Request
    std::shared_ptr<agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const FollowMeSetTarget_Request_ & other) const
  {
    if (this->description != other.description) {
      return false;
    }
    return true;
  }
  bool operator!=(const FollowMeSetTarget_Request_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct FollowMeSetTarget_Request_

// alias to use template instance with default allocator
using FollowMeSetTarget_Request =
  agenticros_msgs::srv::FollowMeSetTarget_Request_<std::allocator<void>>;

// constant definitions

}  // namespace srv

}  // namespace agenticros_msgs


#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__srv__FollowMeSetTarget_Response __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__srv__FollowMeSetTarget_Response __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace srv
{

// message struct
template<class ContainerAllocator>
struct FollowMeSetTarget_Response_
{
  using Type = FollowMeSetTarget_Response_<ContainerAllocator>;

  explicit FollowMeSetTarget_Response_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->success = false;
      this->person_id = 0l;
      this->confidence = 0.0f;
      this->message = "";
    }
  }

  explicit FollowMeSetTarget_Response_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : message(_alloc)
  {
    if (rosidl_runtime_cpp::MessageInitialization::ALL == _init ||
      rosidl_runtime_cpp::MessageInitialization::ZERO == _init)
    {
      this->success = false;
      this->person_id = 0l;
      this->confidence = 0.0f;
      this->message = "";
    }
  }

  // field types and members
  using _success_type =
    bool;
  _success_type success;
  using _person_id_type =
    int32_t;
  _person_id_type person_id;
  using _confidence_type =
    float;
  _confidence_type confidence;
  using _message_type =
    std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>>;
  _message_type message;

  // setters for named parameter idiom
  Type & set__success(
    const bool & _arg)
  {
    this->success = _arg;
    return *this;
  }
  Type & set__person_id(
    const int32_t & _arg)
  {
    this->person_id = _arg;
    return *this;
  }
  Type & set__confidence(
    const float & _arg)
  {
    this->confidence = _arg;
    return *this;
  }
  Type & set__message(
    const std::basic_string<char, std::char_traits<char>, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<char>> & _arg)
  {
    this->message = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__srv__FollowMeSetTarget_Response
    std::shared_ptr<agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__srv__FollowMeSetTarget_Response
    std::shared_ptr<agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const FollowMeSetTarget_Response_ & other) const
  {
    if (this->success != other.success) {
      return false;
    }
    if (this->person_id != other.person_id) {
      return false;
    }
    if (this->confidence != other.confidence) {
      return false;
    }
    if (this->message != other.message) {
      return false;
    }
    return true;
  }
  bool operator!=(const FollowMeSetTarget_Response_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct FollowMeSetTarget_Response_

// alias to use template instance with default allocator
using FollowMeSetTarget_Response =
  agenticros_msgs::srv::FollowMeSetTarget_Response_<std::allocator<void>>;

// constant definitions

}  // namespace srv

}  // namespace agenticros_msgs


// Include directives for member types
// Member 'info'
#include "service_msgs/msg/detail/service_event_info__struct.hpp"

#ifndef _WIN32
# define DEPRECATED__agenticros_msgs__srv__FollowMeSetTarget_Event __attribute__((deprecated))
#else
# define DEPRECATED__agenticros_msgs__srv__FollowMeSetTarget_Event __declspec(deprecated)
#endif

namespace agenticros_msgs
{

namespace srv
{

// message struct
template<class ContainerAllocator>
struct FollowMeSetTarget_Event_
{
  using Type = FollowMeSetTarget_Event_<ContainerAllocator>;

  explicit FollowMeSetTarget_Event_(rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : info(_init)
  {
    (void)_init;
  }

  explicit FollowMeSetTarget_Event_(const ContainerAllocator & _alloc, rosidl_runtime_cpp::MessageInitialization _init = rosidl_runtime_cpp::MessageInitialization::ALL)
  : info(_alloc, _init)
  {
    (void)_init;
  }

  // field types and members
  using _info_type =
    service_msgs::msg::ServiceEventInfo_<ContainerAllocator>;
  _info_type info;
  using _request_type =
    rosidl_runtime_cpp::BoundedVector<agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator>>>;
  _request_type request;
  using _response_type =
    rosidl_runtime_cpp::BoundedVector<agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator>>>;
  _response_type response;

  // setters for named parameter idiom
  Type & set__info(
    const service_msgs::msg::ServiceEventInfo_<ContainerAllocator> & _arg)
  {
    this->info = _arg;
    return *this;
  }
  Type & set__request(
    const rosidl_runtime_cpp::BoundedVector<agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::srv::FollowMeSetTarget_Request_<ContainerAllocator>>> & _arg)
  {
    this->request = _arg;
    return *this;
  }
  Type & set__response(
    const rosidl_runtime_cpp::BoundedVector<agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator>, 1, typename std::allocator_traits<ContainerAllocator>::template rebind_alloc<agenticros_msgs::srv::FollowMeSetTarget_Response_<ContainerAllocator>>> & _arg)
  {
    this->response = _arg;
    return *this;
  }

  // constant declarations

  // pointer types
  using RawPtr =
    agenticros_msgs::srv::FollowMeSetTarget_Event_<ContainerAllocator> *;
  using ConstRawPtr =
    const agenticros_msgs::srv::FollowMeSetTarget_Event_<ContainerAllocator> *;
  using SharedPtr =
    std::shared_ptr<agenticros_msgs::srv::FollowMeSetTarget_Event_<ContainerAllocator>>;
  using ConstSharedPtr =
    std::shared_ptr<agenticros_msgs::srv::FollowMeSetTarget_Event_<ContainerAllocator> const>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::srv::FollowMeSetTarget_Event_<ContainerAllocator>>>
  using UniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::srv::FollowMeSetTarget_Event_<ContainerAllocator>, Deleter>;

  using UniquePtr = UniquePtrWithDeleter<>;

  template<typename Deleter = std::default_delete<
      agenticros_msgs::srv::FollowMeSetTarget_Event_<ContainerAllocator>>>
  using ConstUniquePtrWithDeleter =
    std::unique_ptr<agenticros_msgs::srv::FollowMeSetTarget_Event_<ContainerAllocator> const, Deleter>;
  using ConstUniquePtr = ConstUniquePtrWithDeleter<>;

  using WeakPtr =
    std::weak_ptr<agenticros_msgs::srv::FollowMeSetTarget_Event_<ContainerAllocator>>;
  using ConstWeakPtr =
    std::weak_ptr<agenticros_msgs::srv::FollowMeSetTarget_Event_<ContainerAllocator> const>;

  // pointer types similar to ROS 1, use SharedPtr / ConstSharedPtr instead
  // NOTE: Can't use 'using' here because GNU C++ can't parse attributes properly
  typedef DEPRECATED__agenticros_msgs__srv__FollowMeSetTarget_Event
    std::shared_ptr<agenticros_msgs::srv::FollowMeSetTarget_Event_<ContainerAllocator>>
    Ptr;
  typedef DEPRECATED__agenticros_msgs__srv__FollowMeSetTarget_Event
    std::shared_ptr<agenticros_msgs::srv::FollowMeSetTarget_Event_<ContainerAllocator> const>
    ConstPtr;

  // comparison operators
  bool operator==(const FollowMeSetTarget_Event_ & other) const
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
  bool operator!=(const FollowMeSetTarget_Event_ & other) const
  {
    return !this->operator==(other);
  }
};  // struct FollowMeSetTarget_Event_

// alias to use template instance with default allocator
using FollowMeSetTarget_Event =
  agenticros_msgs::srv::FollowMeSetTarget_Event_<std::allocator<void>>;

// constant definitions

}  // namespace srv

}  // namespace agenticros_msgs

namespace agenticros_msgs
{

namespace srv
{

struct FollowMeSetTarget
{
  using Request = agenticros_msgs::srv::FollowMeSetTarget_Request;
  using Response = agenticros_msgs::srv::FollowMeSetTarget_Response;
  using Event = agenticros_msgs::srv::FollowMeSetTarget_Event;
};

}  // namespace srv

}  // namespace agenticros_msgs

#endif  // AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_SET_TARGET__STRUCT_HPP_
