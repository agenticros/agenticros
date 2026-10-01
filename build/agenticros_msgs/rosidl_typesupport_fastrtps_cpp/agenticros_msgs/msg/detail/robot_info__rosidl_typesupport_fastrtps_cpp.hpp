// generated from rosidl_typesupport_fastrtps_cpp/resource/idl__rosidl_typesupport_fastrtps_cpp.hpp.em
// with input from agenticros_msgs:msg/RobotInfo.idl
// generated code does not contain a copyright notice

#ifndef AGENTICROS_MSGS__MSG__DETAIL__ROBOT_INFO__ROSIDL_TYPESUPPORT_FASTRTPS_CPP_HPP_
#define AGENTICROS_MSGS__MSG__DETAIL__ROBOT_INFO__ROSIDL_TYPESUPPORT_FASTRTPS_CPP_HPP_

#include <cstddef>
#include "rosidl_runtime_c/message_type_support_struct.h"
#include "rosidl_typesupport_interface/macros.h"
#include "agenticros_msgs/msg/rosidl_typesupport_fastrtps_cpp__visibility_control.h"
#include "agenticros_msgs/msg/detail/robot_info__struct.hpp"

#ifndef _WIN32
# pragma GCC diagnostic push
# pragma GCC diagnostic ignored "-Wunused-parameter"
# ifdef __clang__
#  pragma clang diagnostic ignored "-Wdeprecated-register"
#  pragma clang diagnostic ignored "-Wreturn-type-c-linkage"
# endif
#endif
#ifndef _WIN32
# pragma GCC diagnostic pop
#endif

#include "fastcdr/Cdr.h"

namespace agenticros_msgs
{

namespace msg
{

namespace typesupport_fastrtps_cpp
{

bool
ROSIDL_TYPESUPPORT_FASTRTPS_CPP_PUBLIC_agenticros_msgs
cdr_serialize(
  const agenticros_msgs::msg::RobotInfo & ros_message,
  eprosima::fastcdr::Cdr & cdr);

bool
ROSIDL_TYPESUPPORT_FASTRTPS_CPP_PUBLIC_agenticros_msgs
cdr_deserialize(
  eprosima::fastcdr::Cdr & cdr,
  agenticros_msgs::msg::RobotInfo & ros_message);

size_t
ROSIDL_TYPESUPPORT_FASTRTPS_CPP_PUBLIC_agenticros_msgs
get_serialized_size(
  const agenticros_msgs::msg::RobotInfo & ros_message,
  size_t current_alignment);

size_t
ROSIDL_TYPESUPPORT_FASTRTPS_CPP_PUBLIC_agenticros_msgs
max_serialized_size_RobotInfo(
  bool & full_bounded,
  bool & is_plain,
  size_t current_alignment);

bool
ROSIDL_TYPESUPPORT_FASTRTPS_CPP_PUBLIC_agenticros_msgs
cdr_serialize_key(
  const agenticros_msgs::msg::RobotInfo & ros_message,
  eprosima::fastcdr::Cdr &);

size_t
ROSIDL_TYPESUPPORT_FASTRTPS_CPP_PUBLIC_agenticros_msgs
get_serialized_size_key(
  const agenticros_msgs::msg::RobotInfo & ros_message,
  size_t current_alignment);

size_t
ROSIDL_TYPESUPPORT_FASTRTPS_CPP_PUBLIC_agenticros_msgs
max_serialized_size_key_RobotInfo(
  bool & full_bounded,
  bool & is_plain,
  size_t current_alignment);

}  // namespace typesupport_fastrtps_cpp

}  // namespace msg

}  // namespace agenticros_msgs

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_FASTRTPS_CPP_PUBLIC_agenticros_msgs
const rosidl_message_type_support_t *
  ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_fastrtps_cpp, agenticros_msgs, msg, RobotInfo)();

#ifdef __cplusplus
}
#endif

#endif  // AGENTICROS_MSGS__MSG__DETAIL__ROBOT_INFO__ROSIDL_TYPESUPPORT_FASTRTPS_CPP_HPP_
