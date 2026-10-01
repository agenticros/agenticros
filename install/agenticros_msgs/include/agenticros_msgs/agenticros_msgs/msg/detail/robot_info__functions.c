// generated from rosidl_generator_c/resource/idl__functions.c.em
// with input from agenticros_msgs:msg/RobotInfo.idl
// generated code does not contain a copyright notice
#include "agenticros_msgs/msg/detail/robot_info__functions.h"

#include <assert.h>
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>

#include "rcutils/allocator.h"


// Include directives for member types
// Member `id`
// Member `name`
// Member `kind`
// Member `robot_namespace`
// Member `capability_ids`
#include "rosidl_runtime_c/string_functions.h"
// Member `stamp`
#include "builtin_interfaces/msg/detail/time__functions.h"

bool
agenticros_msgs__msg__RobotInfo__init(agenticros_msgs__msg__RobotInfo * msg)
{
  if (!msg) {
    return false;
  }
  // id
  if (!rosidl_runtime_c__String__init(&msg->id)) {
    agenticros_msgs__msg__RobotInfo__fini(msg);
    return false;
  }
  // name
  if (!rosidl_runtime_c__String__init(&msg->name)) {
    agenticros_msgs__msg__RobotInfo__fini(msg);
    return false;
  }
  // kind
  if (!rosidl_runtime_c__String__init(&msg->kind)) {
    agenticros_msgs__msg__RobotInfo__fini(msg);
    return false;
  }
  // robot_namespace
  if (!rosidl_runtime_c__String__init(&msg->robot_namespace)) {
    agenticros_msgs__msg__RobotInfo__fini(msg);
    return false;
  }
  // capability_ids
  if (!rosidl_runtime_c__String__Sequence__init(&msg->capability_ids, 0)) {
    agenticros_msgs__msg__RobotInfo__fini(msg);
    return false;
  }
  // has_realsense
  // has_lidar
  // has_arm
  // stamp
  if (!builtin_interfaces__msg__Time__init(&msg->stamp)) {
    agenticros_msgs__msg__RobotInfo__fini(msg);
    return false;
  }
  return true;
}

void
agenticros_msgs__msg__RobotInfo__fini(agenticros_msgs__msg__RobotInfo * msg)
{
  if (!msg) {
    return;
  }
  // id
  rosidl_runtime_c__String__fini(&msg->id);
  // name
  rosidl_runtime_c__String__fini(&msg->name);
  // kind
  rosidl_runtime_c__String__fini(&msg->kind);
  // robot_namespace
  rosidl_runtime_c__String__fini(&msg->robot_namespace);
  // capability_ids
  rosidl_runtime_c__String__Sequence__fini(&msg->capability_ids);
  // has_realsense
  // has_lidar
  // has_arm
  // stamp
  builtin_interfaces__msg__Time__fini(&msg->stamp);
}

bool
agenticros_msgs__msg__RobotInfo__are_equal(const agenticros_msgs__msg__RobotInfo * lhs, const agenticros_msgs__msg__RobotInfo * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // id
  if (!rosidl_runtime_c__String__are_equal(
      &(lhs->id), &(rhs->id)))
  {
    return false;
  }
  // name
  if (!rosidl_runtime_c__String__are_equal(
      &(lhs->name), &(rhs->name)))
  {
    return false;
  }
  // kind
  if (!rosidl_runtime_c__String__are_equal(
      &(lhs->kind), &(rhs->kind)))
  {
    return false;
  }
  // robot_namespace
  if (!rosidl_runtime_c__String__are_equal(
      &(lhs->robot_namespace), &(rhs->robot_namespace)))
  {
    return false;
  }
  // capability_ids
  if (!rosidl_runtime_c__String__Sequence__are_equal(
      &(lhs->capability_ids), &(rhs->capability_ids)))
  {
    return false;
  }
  // has_realsense
  if (lhs->has_realsense != rhs->has_realsense) {
    return false;
  }
  // has_lidar
  if (lhs->has_lidar != rhs->has_lidar) {
    return false;
  }
  // has_arm
  if (lhs->has_arm != rhs->has_arm) {
    return false;
  }
  // stamp
  if (!builtin_interfaces__msg__Time__are_equal(
      &(lhs->stamp), &(rhs->stamp)))
  {
    return false;
  }
  return true;
}

bool
agenticros_msgs__msg__RobotInfo__copy(
  const agenticros_msgs__msg__RobotInfo * input,
  agenticros_msgs__msg__RobotInfo * output)
{
  if (!input || !output) {
    return false;
  }
  // id
  if (!rosidl_runtime_c__String__copy(
      &(input->id), &(output->id)))
  {
    return false;
  }
  // name
  if (!rosidl_runtime_c__String__copy(
      &(input->name), &(output->name)))
  {
    return false;
  }
  // kind
  if (!rosidl_runtime_c__String__copy(
      &(input->kind), &(output->kind)))
  {
    return false;
  }
  // robot_namespace
  if (!rosidl_runtime_c__String__copy(
      &(input->robot_namespace), &(output->robot_namespace)))
  {
    return false;
  }
  // capability_ids
  if (!rosidl_runtime_c__String__Sequence__copy(
      &(input->capability_ids), &(output->capability_ids)))
  {
    return false;
  }
  // has_realsense
  output->has_realsense = input->has_realsense;
  // has_lidar
  output->has_lidar = input->has_lidar;
  // has_arm
  output->has_arm = input->has_arm;
  // stamp
  if (!builtin_interfaces__msg__Time__copy(
      &(input->stamp), &(output->stamp)))
  {
    return false;
  }
  return true;
}

agenticros_msgs__msg__RobotInfo *
agenticros_msgs__msg__RobotInfo__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__msg__RobotInfo * msg = (agenticros_msgs__msg__RobotInfo *)allocator.allocate(sizeof(agenticros_msgs__msg__RobotInfo), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__msg__RobotInfo));
  bool success = agenticros_msgs__msg__RobotInfo__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__msg__RobotInfo__destroy(agenticros_msgs__msg__RobotInfo * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__msg__RobotInfo__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__msg__RobotInfo__Sequence__init(agenticros_msgs__msg__RobotInfo__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__msg__RobotInfo * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__msg__RobotInfo)) {
      return false;
    }
    data = (agenticros_msgs__msg__RobotInfo *)allocator.zero_allocate(size, sizeof(agenticros_msgs__msg__RobotInfo), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__msg__RobotInfo__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__msg__RobotInfo__fini(&data[i - 1]);
      }
      allocator.deallocate(data, allocator.state);
      return false;
    }
  }
  array->data = data;
  array->size = size;
  array->capacity = size;
  return true;
}

void
agenticros_msgs__msg__RobotInfo__Sequence__fini(agenticros_msgs__msg__RobotInfo__Sequence * array)
{
  if (!array) {
    return;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();

  if (array->data) {
    // ensure that data and capacity values are consistent
    assert(array->capacity > 0);
    // finalize all array elements
    for (size_t i = 0; i < array->capacity; ++i) {
      agenticros_msgs__msg__RobotInfo__fini(&array->data[i]);
    }
    allocator.deallocate(array->data, allocator.state);
    array->data = NULL;
    array->size = 0;
    array->capacity = 0;
  } else {
    // ensure that data, size, and capacity values are consistent
    assert(0 == array->size);
    assert(0 == array->capacity);
  }
}

agenticros_msgs__msg__RobotInfo__Sequence *
agenticros_msgs__msg__RobotInfo__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__msg__RobotInfo__Sequence * array = (agenticros_msgs__msg__RobotInfo__Sequence *)allocator.allocate(sizeof(agenticros_msgs__msg__RobotInfo__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__msg__RobotInfo__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__msg__RobotInfo__Sequence__destroy(agenticros_msgs__msg__RobotInfo__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__msg__RobotInfo__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__msg__RobotInfo__Sequence__are_equal(const agenticros_msgs__msg__RobotInfo__Sequence * lhs, const agenticros_msgs__msg__RobotInfo__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__msg__RobotInfo__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__msg__RobotInfo__Sequence__copy(
  const agenticros_msgs__msg__RobotInfo__Sequence * input,
  agenticros_msgs__msg__RobotInfo__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__msg__RobotInfo)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__msg__RobotInfo);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__msg__RobotInfo * data =
      (agenticros_msgs__msg__RobotInfo *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__msg__RobotInfo__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__msg__RobotInfo__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__msg__RobotInfo__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}
