// generated from rosidl_generator_c/resource/idl__functions.c.em
// with input from agenticros_msgs:msg/CapabilityManifest.idl
// generated code does not contain a copyright notice
#include "agenticros_msgs/msg/detail/capability_manifest__functions.h"

#include <assert.h>
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>

#include "rcutils/allocator.h"


// Include directives for member types
// Member `robot_name`
// Member `robot_namespace`
// Member `topic_names`
// Member `topic_types`
// Member `service_names`
// Member `service_types`
// Member `action_names`
// Member `action_types`
#include "rosidl_runtime_c/string_functions.h"
// Member `stamp`
#include "builtin_interfaces/msg/detail/time__functions.h"

bool
agenticros_msgs__msg__CapabilityManifest__init(agenticros_msgs__msg__CapabilityManifest * msg)
{
  if (!msg) {
    return false;
  }
  // robot_name
  if (!rosidl_runtime_c__String__init(&msg->robot_name)) {
    agenticros_msgs__msg__CapabilityManifest__fini(msg);
    return false;
  }
  // robot_namespace
  if (!rosidl_runtime_c__String__init(&msg->robot_namespace)) {
    agenticros_msgs__msg__CapabilityManifest__fini(msg);
    return false;
  }
  // topic_names
  if (!rosidl_runtime_c__String__Sequence__init(&msg->topic_names, 0)) {
    agenticros_msgs__msg__CapabilityManifest__fini(msg);
    return false;
  }
  // topic_types
  if (!rosidl_runtime_c__String__Sequence__init(&msg->topic_types, 0)) {
    agenticros_msgs__msg__CapabilityManifest__fini(msg);
    return false;
  }
  // service_names
  if (!rosidl_runtime_c__String__Sequence__init(&msg->service_names, 0)) {
    agenticros_msgs__msg__CapabilityManifest__fini(msg);
    return false;
  }
  // service_types
  if (!rosidl_runtime_c__String__Sequence__init(&msg->service_types, 0)) {
    agenticros_msgs__msg__CapabilityManifest__fini(msg);
    return false;
  }
  // action_names
  if (!rosidl_runtime_c__String__Sequence__init(&msg->action_names, 0)) {
    agenticros_msgs__msg__CapabilityManifest__fini(msg);
    return false;
  }
  // action_types
  if (!rosidl_runtime_c__String__Sequence__init(&msg->action_types, 0)) {
    agenticros_msgs__msg__CapabilityManifest__fini(msg);
    return false;
  }
  // stamp
  if (!builtin_interfaces__msg__Time__init(&msg->stamp)) {
    agenticros_msgs__msg__CapabilityManifest__fini(msg);
    return false;
  }
  return true;
}

void
agenticros_msgs__msg__CapabilityManifest__fini(agenticros_msgs__msg__CapabilityManifest * msg)
{
  if (!msg) {
    return;
  }
  // robot_name
  rosidl_runtime_c__String__fini(&msg->robot_name);
  // robot_namespace
  rosidl_runtime_c__String__fini(&msg->robot_namespace);
  // topic_names
  rosidl_runtime_c__String__Sequence__fini(&msg->topic_names);
  // topic_types
  rosidl_runtime_c__String__Sequence__fini(&msg->topic_types);
  // service_names
  rosidl_runtime_c__String__Sequence__fini(&msg->service_names);
  // service_types
  rosidl_runtime_c__String__Sequence__fini(&msg->service_types);
  // action_names
  rosidl_runtime_c__String__Sequence__fini(&msg->action_names);
  // action_types
  rosidl_runtime_c__String__Sequence__fini(&msg->action_types);
  // stamp
  builtin_interfaces__msg__Time__fini(&msg->stamp);
}

bool
agenticros_msgs__msg__CapabilityManifest__are_equal(const agenticros_msgs__msg__CapabilityManifest * lhs, const agenticros_msgs__msg__CapabilityManifest * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // robot_name
  if (!rosidl_runtime_c__String__are_equal(
      &(lhs->robot_name), &(rhs->robot_name)))
  {
    return false;
  }
  // robot_namespace
  if (!rosidl_runtime_c__String__are_equal(
      &(lhs->robot_namespace), &(rhs->robot_namespace)))
  {
    return false;
  }
  // topic_names
  if (!rosidl_runtime_c__String__Sequence__are_equal(
      &(lhs->topic_names), &(rhs->topic_names)))
  {
    return false;
  }
  // topic_types
  if (!rosidl_runtime_c__String__Sequence__are_equal(
      &(lhs->topic_types), &(rhs->topic_types)))
  {
    return false;
  }
  // service_names
  if (!rosidl_runtime_c__String__Sequence__are_equal(
      &(lhs->service_names), &(rhs->service_names)))
  {
    return false;
  }
  // service_types
  if (!rosidl_runtime_c__String__Sequence__are_equal(
      &(lhs->service_types), &(rhs->service_types)))
  {
    return false;
  }
  // action_names
  if (!rosidl_runtime_c__String__Sequence__are_equal(
      &(lhs->action_names), &(rhs->action_names)))
  {
    return false;
  }
  // action_types
  if (!rosidl_runtime_c__String__Sequence__are_equal(
      &(lhs->action_types), &(rhs->action_types)))
  {
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
agenticros_msgs__msg__CapabilityManifest__copy(
  const agenticros_msgs__msg__CapabilityManifest * input,
  agenticros_msgs__msg__CapabilityManifest * output)
{
  if (!input || !output) {
    return false;
  }
  // robot_name
  if (!rosidl_runtime_c__String__copy(
      &(input->robot_name), &(output->robot_name)))
  {
    return false;
  }
  // robot_namespace
  if (!rosidl_runtime_c__String__copy(
      &(input->robot_namespace), &(output->robot_namespace)))
  {
    return false;
  }
  // topic_names
  if (!rosidl_runtime_c__String__Sequence__copy(
      &(input->topic_names), &(output->topic_names)))
  {
    return false;
  }
  // topic_types
  if (!rosidl_runtime_c__String__Sequence__copy(
      &(input->topic_types), &(output->topic_types)))
  {
    return false;
  }
  // service_names
  if (!rosidl_runtime_c__String__Sequence__copy(
      &(input->service_names), &(output->service_names)))
  {
    return false;
  }
  // service_types
  if (!rosidl_runtime_c__String__Sequence__copy(
      &(input->service_types), &(output->service_types)))
  {
    return false;
  }
  // action_names
  if (!rosidl_runtime_c__String__Sequence__copy(
      &(input->action_names), &(output->action_names)))
  {
    return false;
  }
  // action_types
  if (!rosidl_runtime_c__String__Sequence__copy(
      &(input->action_types), &(output->action_types)))
  {
    return false;
  }
  // stamp
  if (!builtin_interfaces__msg__Time__copy(
      &(input->stamp), &(output->stamp)))
  {
    return false;
  }
  return true;
}

agenticros_msgs__msg__CapabilityManifest *
agenticros_msgs__msg__CapabilityManifest__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__msg__CapabilityManifest * msg = (agenticros_msgs__msg__CapabilityManifest *)allocator.allocate(sizeof(agenticros_msgs__msg__CapabilityManifest), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__msg__CapabilityManifest));
  bool success = agenticros_msgs__msg__CapabilityManifest__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__msg__CapabilityManifest__destroy(agenticros_msgs__msg__CapabilityManifest * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__msg__CapabilityManifest__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__msg__CapabilityManifest__Sequence__init(agenticros_msgs__msg__CapabilityManifest__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__msg__CapabilityManifest * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__msg__CapabilityManifest)) {
      return false;
    }
    data = (agenticros_msgs__msg__CapabilityManifest *)allocator.zero_allocate(size, sizeof(agenticros_msgs__msg__CapabilityManifest), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__msg__CapabilityManifest__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__msg__CapabilityManifest__fini(&data[i - 1]);
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
agenticros_msgs__msg__CapabilityManifest__Sequence__fini(agenticros_msgs__msg__CapabilityManifest__Sequence * array)
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
      agenticros_msgs__msg__CapabilityManifest__fini(&array->data[i]);
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

agenticros_msgs__msg__CapabilityManifest__Sequence *
agenticros_msgs__msg__CapabilityManifest__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__msg__CapabilityManifest__Sequence * array = (agenticros_msgs__msg__CapabilityManifest__Sequence *)allocator.allocate(sizeof(agenticros_msgs__msg__CapabilityManifest__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__msg__CapabilityManifest__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__msg__CapabilityManifest__Sequence__destroy(agenticros_msgs__msg__CapabilityManifest__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__msg__CapabilityManifest__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__msg__CapabilityManifest__Sequence__are_equal(const agenticros_msgs__msg__CapabilityManifest__Sequence * lhs, const agenticros_msgs__msg__CapabilityManifest__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__msg__CapabilityManifest__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__msg__CapabilityManifest__Sequence__copy(
  const agenticros_msgs__msg__CapabilityManifest__Sequence * input,
  agenticros_msgs__msg__CapabilityManifest__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__msg__CapabilityManifest)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__msg__CapabilityManifest);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__msg__CapabilityManifest * data =
      (agenticros_msgs__msg__CapabilityManifest *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__msg__CapabilityManifest__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__msg__CapabilityManifest__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__msg__CapabilityManifest__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}
