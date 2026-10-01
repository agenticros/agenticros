// generated from rosidl_typesupport_introspection_cpp/resource/idl__type_support.cpp.em
// with input from agenticros_msgs:msg/CapabilityManifest.idl
// generated code does not contain a copyright notice

#include "array"
#include "cstddef"
#include "string"
#include "vector"
#include "rosidl_runtime_c/message_type_support_struct.h"
#include "rosidl_typesupport_cpp/message_type_support.hpp"
#include "rosidl_typesupport_interface/macros.h"
#include "agenticros_msgs/msg/detail/capability_manifest__functions.h"
#include "agenticros_msgs/msg/detail/capability_manifest__struct.hpp"
#include "rosidl_typesupport_introspection_cpp/field_types.hpp"
#include "rosidl_typesupport_introspection_cpp/identifier.hpp"
#include "rosidl_typesupport_introspection_cpp/message_introspection.hpp"
#include "rosidl_typesupport_introspection_cpp/message_type_support_decl.hpp"
#include "rosidl_typesupport_introspection_cpp/visibility_control.h"

namespace agenticros_msgs
{

namespace msg
{

namespace rosidl_typesupport_introspection_cpp
{

void CapabilityManifest_init_function(
  void * message_memory, rosidl_runtime_cpp::MessageInitialization _init)
{
  new (message_memory) agenticros_msgs::msg::CapabilityManifest(_init);
}

void CapabilityManifest_fini_function(void * message_memory)
{
  auto typed_message = static_cast<agenticros_msgs::msg::CapabilityManifest *>(message_memory);
  typed_message->~CapabilityManifest();
}

size_t size_function__CapabilityManifest__topic_names(const void * untyped_member)
{
  const auto * member = reinterpret_cast<const std::vector<std::string> *>(untyped_member);
  return member->size();
}

const void * get_const_function__CapabilityManifest__topic_names(const void * untyped_member, size_t index)
{
  const auto & member =
    *reinterpret_cast<const std::vector<std::string> *>(untyped_member);
  return &member[index];
}

void * get_function__CapabilityManifest__topic_names(void * untyped_member, size_t index)
{
  auto & member =
    *reinterpret_cast<std::vector<std::string> *>(untyped_member);
  return &member[index];
}

void fetch_function__CapabilityManifest__topic_names(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const auto & item = *reinterpret_cast<const std::string *>(
    get_const_function__CapabilityManifest__topic_names(untyped_member, index));
  auto & value = *reinterpret_cast<std::string *>(untyped_value);
  value = item;
}

void assign_function__CapabilityManifest__topic_names(
  void * untyped_member, size_t index, const void * untyped_value)
{
  auto & item = *reinterpret_cast<std::string *>(
    get_function__CapabilityManifest__topic_names(untyped_member, index));
  const auto & value = *reinterpret_cast<const std::string *>(untyped_value);
  item = value;
}

void resize_function__CapabilityManifest__topic_names(void * untyped_member, size_t size)
{
  auto * member =
    reinterpret_cast<std::vector<std::string> *>(untyped_member);
  member->resize(size);
}

size_t size_function__CapabilityManifest__topic_types(const void * untyped_member)
{
  const auto * member = reinterpret_cast<const std::vector<std::string> *>(untyped_member);
  return member->size();
}

const void * get_const_function__CapabilityManifest__topic_types(const void * untyped_member, size_t index)
{
  const auto & member =
    *reinterpret_cast<const std::vector<std::string> *>(untyped_member);
  return &member[index];
}

void * get_function__CapabilityManifest__topic_types(void * untyped_member, size_t index)
{
  auto & member =
    *reinterpret_cast<std::vector<std::string> *>(untyped_member);
  return &member[index];
}

void fetch_function__CapabilityManifest__topic_types(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const auto & item = *reinterpret_cast<const std::string *>(
    get_const_function__CapabilityManifest__topic_types(untyped_member, index));
  auto & value = *reinterpret_cast<std::string *>(untyped_value);
  value = item;
}

void assign_function__CapabilityManifest__topic_types(
  void * untyped_member, size_t index, const void * untyped_value)
{
  auto & item = *reinterpret_cast<std::string *>(
    get_function__CapabilityManifest__topic_types(untyped_member, index));
  const auto & value = *reinterpret_cast<const std::string *>(untyped_value);
  item = value;
}

void resize_function__CapabilityManifest__topic_types(void * untyped_member, size_t size)
{
  auto * member =
    reinterpret_cast<std::vector<std::string> *>(untyped_member);
  member->resize(size);
}

size_t size_function__CapabilityManifest__service_names(const void * untyped_member)
{
  const auto * member = reinterpret_cast<const std::vector<std::string> *>(untyped_member);
  return member->size();
}

const void * get_const_function__CapabilityManifest__service_names(const void * untyped_member, size_t index)
{
  const auto & member =
    *reinterpret_cast<const std::vector<std::string> *>(untyped_member);
  return &member[index];
}

void * get_function__CapabilityManifest__service_names(void * untyped_member, size_t index)
{
  auto & member =
    *reinterpret_cast<std::vector<std::string> *>(untyped_member);
  return &member[index];
}

void fetch_function__CapabilityManifest__service_names(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const auto & item = *reinterpret_cast<const std::string *>(
    get_const_function__CapabilityManifest__service_names(untyped_member, index));
  auto & value = *reinterpret_cast<std::string *>(untyped_value);
  value = item;
}

void assign_function__CapabilityManifest__service_names(
  void * untyped_member, size_t index, const void * untyped_value)
{
  auto & item = *reinterpret_cast<std::string *>(
    get_function__CapabilityManifest__service_names(untyped_member, index));
  const auto & value = *reinterpret_cast<const std::string *>(untyped_value);
  item = value;
}

void resize_function__CapabilityManifest__service_names(void * untyped_member, size_t size)
{
  auto * member =
    reinterpret_cast<std::vector<std::string> *>(untyped_member);
  member->resize(size);
}

size_t size_function__CapabilityManifest__service_types(const void * untyped_member)
{
  const auto * member = reinterpret_cast<const std::vector<std::string> *>(untyped_member);
  return member->size();
}

const void * get_const_function__CapabilityManifest__service_types(const void * untyped_member, size_t index)
{
  const auto & member =
    *reinterpret_cast<const std::vector<std::string> *>(untyped_member);
  return &member[index];
}

void * get_function__CapabilityManifest__service_types(void * untyped_member, size_t index)
{
  auto & member =
    *reinterpret_cast<std::vector<std::string> *>(untyped_member);
  return &member[index];
}

void fetch_function__CapabilityManifest__service_types(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const auto & item = *reinterpret_cast<const std::string *>(
    get_const_function__CapabilityManifest__service_types(untyped_member, index));
  auto & value = *reinterpret_cast<std::string *>(untyped_value);
  value = item;
}

void assign_function__CapabilityManifest__service_types(
  void * untyped_member, size_t index, const void * untyped_value)
{
  auto & item = *reinterpret_cast<std::string *>(
    get_function__CapabilityManifest__service_types(untyped_member, index));
  const auto & value = *reinterpret_cast<const std::string *>(untyped_value);
  item = value;
}

void resize_function__CapabilityManifest__service_types(void * untyped_member, size_t size)
{
  auto * member =
    reinterpret_cast<std::vector<std::string> *>(untyped_member);
  member->resize(size);
}

size_t size_function__CapabilityManifest__action_names(const void * untyped_member)
{
  const auto * member = reinterpret_cast<const std::vector<std::string> *>(untyped_member);
  return member->size();
}

const void * get_const_function__CapabilityManifest__action_names(const void * untyped_member, size_t index)
{
  const auto & member =
    *reinterpret_cast<const std::vector<std::string> *>(untyped_member);
  return &member[index];
}

void * get_function__CapabilityManifest__action_names(void * untyped_member, size_t index)
{
  auto & member =
    *reinterpret_cast<std::vector<std::string> *>(untyped_member);
  return &member[index];
}

void fetch_function__CapabilityManifest__action_names(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const auto & item = *reinterpret_cast<const std::string *>(
    get_const_function__CapabilityManifest__action_names(untyped_member, index));
  auto & value = *reinterpret_cast<std::string *>(untyped_value);
  value = item;
}

void assign_function__CapabilityManifest__action_names(
  void * untyped_member, size_t index, const void * untyped_value)
{
  auto & item = *reinterpret_cast<std::string *>(
    get_function__CapabilityManifest__action_names(untyped_member, index));
  const auto & value = *reinterpret_cast<const std::string *>(untyped_value);
  item = value;
}

void resize_function__CapabilityManifest__action_names(void * untyped_member, size_t size)
{
  auto * member =
    reinterpret_cast<std::vector<std::string> *>(untyped_member);
  member->resize(size);
}

size_t size_function__CapabilityManifest__action_types(const void * untyped_member)
{
  const auto * member = reinterpret_cast<const std::vector<std::string> *>(untyped_member);
  return member->size();
}

const void * get_const_function__CapabilityManifest__action_types(const void * untyped_member, size_t index)
{
  const auto & member =
    *reinterpret_cast<const std::vector<std::string> *>(untyped_member);
  return &member[index];
}

void * get_function__CapabilityManifest__action_types(void * untyped_member, size_t index)
{
  auto & member =
    *reinterpret_cast<std::vector<std::string> *>(untyped_member);
  return &member[index];
}

void fetch_function__CapabilityManifest__action_types(
  const void * untyped_member, size_t index, void * untyped_value)
{
  const auto & item = *reinterpret_cast<const std::string *>(
    get_const_function__CapabilityManifest__action_types(untyped_member, index));
  auto & value = *reinterpret_cast<std::string *>(untyped_value);
  value = item;
}

void assign_function__CapabilityManifest__action_types(
  void * untyped_member, size_t index, const void * untyped_value)
{
  auto & item = *reinterpret_cast<std::string *>(
    get_function__CapabilityManifest__action_types(untyped_member, index));
  const auto & value = *reinterpret_cast<const std::string *>(untyped_value);
  item = value;
}

void resize_function__CapabilityManifest__action_types(void * untyped_member, size_t size)
{
  auto * member =
    reinterpret_cast<std::vector<std::string> *>(untyped_member);
  member->resize(size);
}

static const ::rosidl_typesupport_introspection_cpp::MessageMember CapabilityManifest_message_member_array[9] = {
  {
    "robot_name",  // name
    ::rosidl_typesupport_introspection_cpp::ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    nullptr,  // members of sub message
    false,  // is key
    false,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs::msg::CapabilityManifest, robot_name),  // bytes offset in struct
    nullptr,  // default value
    nullptr,  // size() function pointer
    nullptr,  // get_const(index) function pointer
    nullptr,  // get(index) function pointer
    nullptr,  // fetch(index, &value) function pointer
    nullptr,  // assign(index, value) function pointer
    nullptr  // resize(index) function pointer
  },
  {
    "robot_namespace",  // name
    ::rosidl_typesupport_introspection_cpp::ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    nullptr,  // members of sub message
    false,  // is key
    false,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs::msg::CapabilityManifest, robot_namespace),  // bytes offset in struct
    nullptr,  // default value
    nullptr,  // size() function pointer
    nullptr,  // get_const(index) function pointer
    nullptr,  // get(index) function pointer
    nullptr,  // fetch(index, &value) function pointer
    nullptr,  // assign(index, value) function pointer
    nullptr  // resize(index) function pointer
  },
  {
    "topic_names",  // name
    ::rosidl_typesupport_introspection_cpp::ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    nullptr,  // members of sub message
    false,  // is key
    true,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs::msg::CapabilityManifest, topic_names),  // bytes offset in struct
    nullptr,  // default value
    size_function__CapabilityManifest__topic_names,  // size() function pointer
    get_const_function__CapabilityManifest__topic_names,  // get_const(index) function pointer
    get_function__CapabilityManifest__topic_names,  // get(index) function pointer
    fetch_function__CapabilityManifest__topic_names,  // fetch(index, &value) function pointer
    assign_function__CapabilityManifest__topic_names,  // assign(index, value) function pointer
    resize_function__CapabilityManifest__topic_names  // resize(index) function pointer
  },
  {
    "topic_types",  // name
    ::rosidl_typesupport_introspection_cpp::ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    nullptr,  // members of sub message
    false,  // is key
    true,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs::msg::CapabilityManifest, topic_types),  // bytes offset in struct
    nullptr,  // default value
    size_function__CapabilityManifest__topic_types,  // size() function pointer
    get_const_function__CapabilityManifest__topic_types,  // get_const(index) function pointer
    get_function__CapabilityManifest__topic_types,  // get(index) function pointer
    fetch_function__CapabilityManifest__topic_types,  // fetch(index, &value) function pointer
    assign_function__CapabilityManifest__topic_types,  // assign(index, value) function pointer
    resize_function__CapabilityManifest__topic_types  // resize(index) function pointer
  },
  {
    "service_names",  // name
    ::rosidl_typesupport_introspection_cpp::ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    nullptr,  // members of sub message
    false,  // is key
    true,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs::msg::CapabilityManifest, service_names),  // bytes offset in struct
    nullptr,  // default value
    size_function__CapabilityManifest__service_names,  // size() function pointer
    get_const_function__CapabilityManifest__service_names,  // get_const(index) function pointer
    get_function__CapabilityManifest__service_names,  // get(index) function pointer
    fetch_function__CapabilityManifest__service_names,  // fetch(index, &value) function pointer
    assign_function__CapabilityManifest__service_names,  // assign(index, value) function pointer
    resize_function__CapabilityManifest__service_names  // resize(index) function pointer
  },
  {
    "service_types",  // name
    ::rosidl_typesupport_introspection_cpp::ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    nullptr,  // members of sub message
    false,  // is key
    true,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs::msg::CapabilityManifest, service_types),  // bytes offset in struct
    nullptr,  // default value
    size_function__CapabilityManifest__service_types,  // size() function pointer
    get_const_function__CapabilityManifest__service_types,  // get_const(index) function pointer
    get_function__CapabilityManifest__service_types,  // get(index) function pointer
    fetch_function__CapabilityManifest__service_types,  // fetch(index, &value) function pointer
    assign_function__CapabilityManifest__service_types,  // assign(index, value) function pointer
    resize_function__CapabilityManifest__service_types  // resize(index) function pointer
  },
  {
    "action_names",  // name
    ::rosidl_typesupport_introspection_cpp::ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    nullptr,  // members of sub message
    false,  // is key
    true,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs::msg::CapabilityManifest, action_names),  // bytes offset in struct
    nullptr,  // default value
    size_function__CapabilityManifest__action_names,  // size() function pointer
    get_const_function__CapabilityManifest__action_names,  // get_const(index) function pointer
    get_function__CapabilityManifest__action_names,  // get(index) function pointer
    fetch_function__CapabilityManifest__action_names,  // fetch(index, &value) function pointer
    assign_function__CapabilityManifest__action_names,  // assign(index, value) function pointer
    resize_function__CapabilityManifest__action_names  // resize(index) function pointer
  },
  {
    "action_types",  // name
    ::rosidl_typesupport_introspection_cpp::ROS_TYPE_STRING,  // type
    0,  // upper bound of string
    nullptr,  // members of sub message
    false,  // is key
    true,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs::msg::CapabilityManifest, action_types),  // bytes offset in struct
    nullptr,  // default value
    size_function__CapabilityManifest__action_types,  // size() function pointer
    get_const_function__CapabilityManifest__action_types,  // get_const(index) function pointer
    get_function__CapabilityManifest__action_types,  // get(index) function pointer
    fetch_function__CapabilityManifest__action_types,  // fetch(index, &value) function pointer
    assign_function__CapabilityManifest__action_types,  // assign(index, value) function pointer
    resize_function__CapabilityManifest__action_types  // resize(index) function pointer
  },
  {
    "stamp",  // name
    ::rosidl_typesupport_introspection_cpp::ROS_TYPE_MESSAGE,  // type
    0,  // upper bound of string
    ::rosidl_typesupport_introspection_cpp::get_message_type_support_handle<builtin_interfaces::msg::Time>(),  // members of sub message
    false,  // is key
    false,  // is array
    0,  // array size
    false,  // is upper bound
    offsetof(agenticros_msgs::msg::CapabilityManifest, stamp),  // bytes offset in struct
    nullptr,  // default value
    nullptr,  // size() function pointer
    nullptr,  // get_const(index) function pointer
    nullptr,  // get(index) function pointer
    nullptr,  // fetch(index, &value) function pointer
    nullptr,  // assign(index, value) function pointer
    nullptr  // resize(index) function pointer
  }
};

static const ::rosidl_typesupport_introspection_cpp::MessageMembers CapabilityManifest_message_members = {
  "agenticros_msgs::msg",  // message namespace
  "CapabilityManifest",  // message name
  9,  // number of fields
  sizeof(agenticros_msgs::msg::CapabilityManifest),
  false,  // has_any_key_member_
  CapabilityManifest_message_member_array,  // message members
  CapabilityManifest_init_function,  // function to initialize message memory (memory has to be allocated)
  CapabilityManifest_fini_function  // function to terminate message instance (will not free memory)
};

static const rosidl_message_type_support_t CapabilityManifest_message_type_support_handle = {
  ::rosidl_typesupport_introspection_cpp::typesupport_identifier,
  &CapabilityManifest_message_members,
  get_message_typesupport_handle_function,
  &agenticros_msgs__msg__CapabilityManifest__get_type_hash,
  &agenticros_msgs__msg__CapabilityManifest__get_type_description,
  &agenticros_msgs__msg__CapabilityManifest__get_type_description_sources,
};

}  // namespace rosidl_typesupport_introspection_cpp

}  // namespace msg

}  // namespace agenticros_msgs


namespace rosidl_typesupport_introspection_cpp
{

template<>
ROSIDL_TYPESUPPORT_INTROSPECTION_CPP_PUBLIC
const rosidl_message_type_support_t *
get_message_type_support_handle<agenticros_msgs::msg::CapabilityManifest>()
{
  return &::agenticros_msgs::msg::rosidl_typesupport_introspection_cpp::CapabilityManifest_message_type_support_handle;
}

}  // namespace rosidl_typesupport_introspection_cpp

#ifdef __cplusplus
extern "C"
{
#endif

ROSIDL_TYPESUPPORT_INTROSPECTION_CPP_PUBLIC
const rosidl_message_type_support_t *
ROSIDL_TYPESUPPORT_INTERFACE__MESSAGE_SYMBOL_NAME(rosidl_typesupport_introspection_cpp, agenticros_msgs, msg, CapabilityManifest)() {
  return &::agenticros_msgs::msg::rosidl_typesupport_introspection_cpp::CapabilityManifest_message_type_support_handle;
}

#ifdef __cplusplus
}
#endif
