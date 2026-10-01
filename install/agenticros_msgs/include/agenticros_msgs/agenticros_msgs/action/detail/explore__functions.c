// generated from rosidl_generator_c/resource/idl__functions.c.em
// with input from agenticros_msgs:action/Explore.idl
// generated code does not contain a copyright notice
#include "agenticros_msgs/action/detail/explore__functions.h"

#include <assert.h>
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>

#include "rcutils/allocator.h"


// Include directives for member types
// Member `mode`
#include "rosidl_runtime_c/string_functions.h"

bool
agenticros_msgs__action__Explore_Goal__init(agenticros_msgs__action__Explore_Goal * msg)
{
  if (!msg) {
    return false;
  }
  // mode
  if (!rosidl_runtime_c__String__init(&msg->mode)) {
    agenticros_msgs__action__Explore_Goal__fini(msg);
    return false;
  }
  // timeout_s
  // min_frontier_m
  // max_goals
  return true;
}

void
agenticros_msgs__action__Explore_Goal__fini(agenticros_msgs__action__Explore_Goal * msg)
{
  if (!msg) {
    return;
  }
  // mode
  rosidl_runtime_c__String__fini(&msg->mode);
  // timeout_s
  // min_frontier_m
  // max_goals
}

bool
agenticros_msgs__action__Explore_Goal__are_equal(const agenticros_msgs__action__Explore_Goal * lhs, const agenticros_msgs__action__Explore_Goal * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // mode
  if (!rosidl_runtime_c__String__are_equal(
      &(lhs->mode), &(rhs->mode)))
  {
    return false;
  }
  // timeout_s
  if (lhs->timeout_s != rhs->timeout_s) {
    return false;
  }
  // min_frontier_m
  if (lhs->min_frontier_m != rhs->min_frontier_m) {
    return false;
  }
  // max_goals
  if (lhs->max_goals != rhs->max_goals) {
    return false;
  }
  return true;
}

bool
agenticros_msgs__action__Explore_Goal__copy(
  const agenticros_msgs__action__Explore_Goal * input,
  agenticros_msgs__action__Explore_Goal * output)
{
  if (!input || !output) {
    return false;
  }
  // mode
  if (!rosidl_runtime_c__String__copy(
      &(input->mode), &(output->mode)))
  {
    return false;
  }
  // timeout_s
  output->timeout_s = input->timeout_s;
  // min_frontier_m
  output->min_frontier_m = input->min_frontier_m;
  // max_goals
  output->max_goals = input->max_goals;
  return true;
}

agenticros_msgs__action__Explore_Goal *
agenticros_msgs__action__Explore_Goal__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_Goal * msg = (agenticros_msgs__action__Explore_Goal *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_Goal), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__action__Explore_Goal));
  bool success = agenticros_msgs__action__Explore_Goal__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__action__Explore_Goal__destroy(agenticros_msgs__action__Explore_Goal * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__action__Explore_Goal__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__action__Explore_Goal__Sequence__init(agenticros_msgs__action__Explore_Goal__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_Goal * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_Goal)) {
      return false;
    }
    data = (agenticros_msgs__action__Explore_Goal *)allocator.zero_allocate(size, sizeof(agenticros_msgs__action__Explore_Goal), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__action__Explore_Goal__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__action__Explore_Goal__fini(&data[i - 1]);
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
agenticros_msgs__action__Explore_Goal__Sequence__fini(agenticros_msgs__action__Explore_Goal__Sequence * array)
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
      agenticros_msgs__action__Explore_Goal__fini(&array->data[i]);
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

agenticros_msgs__action__Explore_Goal__Sequence *
agenticros_msgs__action__Explore_Goal__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_Goal__Sequence * array = (agenticros_msgs__action__Explore_Goal__Sequence *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_Goal__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__action__Explore_Goal__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__action__Explore_Goal__Sequence__destroy(agenticros_msgs__action__Explore_Goal__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__action__Explore_Goal__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__action__Explore_Goal__Sequence__are_equal(const agenticros_msgs__action__Explore_Goal__Sequence * lhs, const agenticros_msgs__action__Explore_Goal__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__action__Explore_Goal__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__action__Explore_Goal__Sequence__copy(
  const agenticros_msgs__action__Explore_Goal__Sequence * input,
  agenticros_msgs__action__Explore_Goal__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_Goal)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__action__Explore_Goal);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__action__Explore_Goal * data =
      (agenticros_msgs__action__Explore_Goal *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__action__Explore_Goal__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__action__Explore_Goal__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__action__Explore_Goal__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}


// Include directives for member types
// Member `message`
// already included above
// #include "rosidl_runtime_c/string_functions.h"

bool
agenticros_msgs__action__Explore_Result__init(agenticros_msgs__action__Explore_Result * msg)
{
  if (!msg) {
    return false;
  }
  // success
  // message
  if (!rosidl_runtime_c__String__init(&msg->message)) {
    agenticros_msgs__action__Explore_Result__fini(msg);
    return false;
  }
  // coverage_ratio
  // goals_sent
  return true;
}

void
agenticros_msgs__action__Explore_Result__fini(agenticros_msgs__action__Explore_Result * msg)
{
  if (!msg) {
    return;
  }
  // success
  // message
  rosidl_runtime_c__String__fini(&msg->message);
  // coverage_ratio
  // goals_sent
}

bool
agenticros_msgs__action__Explore_Result__are_equal(const agenticros_msgs__action__Explore_Result * lhs, const agenticros_msgs__action__Explore_Result * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // success
  if (lhs->success != rhs->success) {
    return false;
  }
  // message
  if (!rosidl_runtime_c__String__are_equal(
      &(lhs->message), &(rhs->message)))
  {
    return false;
  }
  // coverage_ratio
  if (lhs->coverage_ratio != rhs->coverage_ratio) {
    return false;
  }
  // goals_sent
  if (lhs->goals_sent != rhs->goals_sent) {
    return false;
  }
  return true;
}

bool
agenticros_msgs__action__Explore_Result__copy(
  const agenticros_msgs__action__Explore_Result * input,
  agenticros_msgs__action__Explore_Result * output)
{
  if (!input || !output) {
    return false;
  }
  // success
  output->success = input->success;
  // message
  if (!rosidl_runtime_c__String__copy(
      &(input->message), &(output->message)))
  {
    return false;
  }
  // coverage_ratio
  output->coverage_ratio = input->coverage_ratio;
  // goals_sent
  output->goals_sent = input->goals_sent;
  return true;
}

agenticros_msgs__action__Explore_Result *
agenticros_msgs__action__Explore_Result__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_Result * msg = (agenticros_msgs__action__Explore_Result *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_Result), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__action__Explore_Result));
  bool success = agenticros_msgs__action__Explore_Result__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__action__Explore_Result__destroy(agenticros_msgs__action__Explore_Result * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__action__Explore_Result__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__action__Explore_Result__Sequence__init(agenticros_msgs__action__Explore_Result__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_Result * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_Result)) {
      return false;
    }
    data = (agenticros_msgs__action__Explore_Result *)allocator.zero_allocate(size, sizeof(agenticros_msgs__action__Explore_Result), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__action__Explore_Result__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__action__Explore_Result__fini(&data[i - 1]);
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
agenticros_msgs__action__Explore_Result__Sequence__fini(agenticros_msgs__action__Explore_Result__Sequence * array)
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
      agenticros_msgs__action__Explore_Result__fini(&array->data[i]);
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

agenticros_msgs__action__Explore_Result__Sequence *
agenticros_msgs__action__Explore_Result__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_Result__Sequence * array = (agenticros_msgs__action__Explore_Result__Sequence *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_Result__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__action__Explore_Result__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__action__Explore_Result__Sequence__destroy(agenticros_msgs__action__Explore_Result__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__action__Explore_Result__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__action__Explore_Result__Sequence__are_equal(const agenticros_msgs__action__Explore_Result__Sequence * lhs, const agenticros_msgs__action__Explore_Result__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__action__Explore_Result__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__action__Explore_Result__Sequence__copy(
  const agenticros_msgs__action__Explore_Result__Sequence * input,
  agenticros_msgs__action__Explore_Result__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_Result)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__action__Explore_Result);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__action__Explore_Result * data =
      (agenticros_msgs__action__Explore_Result *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__action__Explore_Result__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__action__Explore_Result__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__action__Explore_Result__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}


// Include directives for member types
// Member `state`
// already included above
// #include "rosidl_runtime_c/string_functions.h"

bool
agenticros_msgs__action__Explore_Feedback__init(agenticros_msgs__action__Explore_Feedback * msg)
{
  if (!msg) {
    return false;
  }
  // state
  if (!rosidl_runtime_c__String__init(&msg->state)) {
    agenticros_msgs__action__Explore_Feedback__fini(msg);
    return false;
  }
  // coverage_ratio
  // goals_sent
  // elapsed_s
  return true;
}

void
agenticros_msgs__action__Explore_Feedback__fini(agenticros_msgs__action__Explore_Feedback * msg)
{
  if (!msg) {
    return;
  }
  // state
  rosidl_runtime_c__String__fini(&msg->state);
  // coverage_ratio
  // goals_sent
  // elapsed_s
}

bool
agenticros_msgs__action__Explore_Feedback__are_equal(const agenticros_msgs__action__Explore_Feedback * lhs, const agenticros_msgs__action__Explore_Feedback * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // state
  if (!rosidl_runtime_c__String__are_equal(
      &(lhs->state), &(rhs->state)))
  {
    return false;
  }
  // coverage_ratio
  if (lhs->coverage_ratio != rhs->coverage_ratio) {
    return false;
  }
  // goals_sent
  if (lhs->goals_sent != rhs->goals_sent) {
    return false;
  }
  // elapsed_s
  if (lhs->elapsed_s != rhs->elapsed_s) {
    return false;
  }
  return true;
}

bool
agenticros_msgs__action__Explore_Feedback__copy(
  const agenticros_msgs__action__Explore_Feedback * input,
  agenticros_msgs__action__Explore_Feedback * output)
{
  if (!input || !output) {
    return false;
  }
  // state
  if (!rosidl_runtime_c__String__copy(
      &(input->state), &(output->state)))
  {
    return false;
  }
  // coverage_ratio
  output->coverage_ratio = input->coverage_ratio;
  // goals_sent
  output->goals_sent = input->goals_sent;
  // elapsed_s
  output->elapsed_s = input->elapsed_s;
  return true;
}

agenticros_msgs__action__Explore_Feedback *
agenticros_msgs__action__Explore_Feedback__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_Feedback * msg = (agenticros_msgs__action__Explore_Feedback *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_Feedback), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__action__Explore_Feedback));
  bool success = agenticros_msgs__action__Explore_Feedback__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__action__Explore_Feedback__destroy(agenticros_msgs__action__Explore_Feedback * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__action__Explore_Feedback__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__action__Explore_Feedback__Sequence__init(agenticros_msgs__action__Explore_Feedback__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_Feedback * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_Feedback)) {
      return false;
    }
    data = (agenticros_msgs__action__Explore_Feedback *)allocator.zero_allocate(size, sizeof(agenticros_msgs__action__Explore_Feedback), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__action__Explore_Feedback__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__action__Explore_Feedback__fini(&data[i - 1]);
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
agenticros_msgs__action__Explore_Feedback__Sequence__fini(agenticros_msgs__action__Explore_Feedback__Sequence * array)
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
      agenticros_msgs__action__Explore_Feedback__fini(&array->data[i]);
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

agenticros_msgs__action__Explore_Feedback__Sequence *
agenticros_msgs__action__Explore_Feedback__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_Feedback__Sequence * array = (agenticros_msgs__action__Explore_Feedback__Sequence *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_Feedback__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__action__Explore_Feedback__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__action__Explore_Feedback__Sequence__destroy(agenticros_msgs__action__Explore_Feedback__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__action__Explore_Feedback__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__action__Explore_Feedback__Sequence__are_equal(const agenticros_msgs__action__Explore_Feedback__Sequence * lhs, const agenticros_msgs__action__Explore_Feedback__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__action__Explore_Feedback__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__action__Explore_Feedback__Sequence__copy(
  const agenticros_msgs__action__Explore_Feedback__Sequence * input,
  agenticros_msgs__action__Explore_Feedback__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_Feedback)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__action__Explore_Feedback);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__action__Explore_Feedback * data =
      (agenticros_msgs__action__Explore_Feedback *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__action__Explore_Feedback__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__action__Explore_Feedback__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__action__Explore_Feedback__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}


// Include directives for member types
// Member `goal_id`
#include "unique_identifier_msgs/msg/detail/uuid__functions.h"
// Member `goal`
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"

bool
agenticros_msgs__action__Explore_SendGoal_Request__init(agenticros_msgs__action__Explore_SendGoal_Request * msg)
{
  if (!msg) {
    return false;
  }
  // goal_id
  if (!unique_identifier_msgs__msg__UUID__init(&msg->goal_id)) {
    agenticros_msgs__action__Explore_SendGoal_Request__fini(msg);
    return false;
  }
  // goal
  if (!agenticros_msgs__action__Explore_Goal__init(&msg->goal)) {
    agenticros_msgs__action__Explore_SendGoal_Request__fini(msg);
    return false;
  }
  return true;
}

void
agenticros_msgs__action__Explore_SendGoal_Request__fini(agenticros_msgs__action__Explore_SendGoal_Request * msg)
{
  if (!msg) {
    return;
  }
  // goal_id
  unique_identifier_msgs__msg__UUID__fini(&msg->goal_id);
  // goal
  agenticros_msgs__action__Explore_Goal__fini(&msg->goal);
}

bool
agenticros_msgs__action__Explore_SendGoal_Request__are_equal(const agenticros_msgs__action__Explore_SendGoal_Request * lhs, const agenticros_msgs__action__Explore_SendGoal_Request * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // goal_id
  if (!unique_identifier_msgs__msg__UUID__are_equal(
      &(lhs->goal_id), &(rhs->goal_id)))
  {
    return false;
  }
  // goal
  if (!agenticros_msgs__action__Explore_Goal__are_equal(
      &(lhs->goal), &(rhs->goal)))
  {
    return false;
  }
  return true;
}

bool
agenticros_msgs__action__Explore_SendGoal_Request__copy(
  const agenticros_msgs__action__Explore_SendGoal_Request * input,
  agenticros_msgs__action__Explore_SendGoal_Request * output)
{
  if (!input || !output) {
    return false;
  }
  // goal_id
  if (!unique_identifier_msgs__msg__UUID__copy(
      &(input->goal_id), &(output->goal_id)))
  {
    return false;
  }
  // goal
  if (!agenticros_msgs__action__Explore_Goal__copy(
      &(input->goal), &(output->goal)))
  {
    return false;
  }
  return true;
}

agenticros_msgs__action__Explore_SendGoal_Request *
agenticros_msgs__action__Explore_SendGoal_Request__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_SendGoal_Request * msg = (agenticros_msgs__action__Explore_SendGoal_Request *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_SendGoal_Request), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__action__Explore_SendGoal_Request));
  bool success = agenticros_msgs__action__Explore_SendGoal_Request__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__action__Explore_SendGoal_Request__destroy(agenticros_msgs__action__Explore_SendGoal_Request * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__action__Explore_SendGoal_Request__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__action__Explore_SendGoal_Request__Sequence__init(agenticros_msgs__action__Explore_SendGoal_Request__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_SendGoal_Request * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_SendGoal_Request)) {
      return false;
    }
    data = (agenticros_msgs__action__Explore_SendGoal_Request *)allocator.zero_allocate(size, sizeof(agenticros_msgs__action__Explore_SendGoal_Request), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__action__Explore_SendGoal_Request__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__action__Explore_SendGoal_Request__fini(&data[i - 1]);
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
agenticros_msgs__action__Explore_SendGoal_Request__Sequence__fini(agenticros_msgs__action__Explore_SendGoal_Request__Sequence * array)
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
      agenticros_msgs__action__Explore_SendGoal_Request__fini(&array->data[i]);
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

agenticros_msgs__action__Explore_SendGoal_Request__Sequence *
agenticros_msgs__action__Explore_SendGoal_Request__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_SendGoal_Request__Sequence * array = (agenticros_msgs__action__Explore_SendGoal_Request__Sequence *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_SendGoal_Request__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__action__Explore_SendGoal_Request__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__action__Explore_SendGoal_Request__Sequence__destroy(agenticros_msgs__action__Explore_SendGoal_Request__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__action__Explore_SendGoal_Request__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__action__Explore_SendGoal_Request__Sequence__are_equal(const agenticros_msgs__action__Explore_SendGoal_Request__Sequence * lhs, const agenticros_msgs__action__Explore_SendGoal_Request__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__action__Explore_SendGoal_Request__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__action__Explore_SendGoal_Request__Sequence__copy(
  const agenticros_msgs__action__Explore_SendGoal_Request__Sequence * input,
  agenticros_msgs__action__Explore_SendGoal_Request__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_SendGoal_Request)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__action__Explore_SendGoal_Request);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__action__Explore_SendGoal_Request * data =
      (agenticros_msgs__action__Explore_SendGoal_Request *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__action__Explore_SendGoal_Request__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__action__Explore_SendGoal_Request__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__action__Explore_SendGoal_Request__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}


// Include directives for member types
// Member `stamp`
#include "builtin_interfaces/msg/detail/time__functions.h"

bool
agenticros_msgs__action__Explore_SendGoal_Response__init(agenticros_msgs__action__Explore_SendGoal_Response * msg)
{
  if (!msg) {
    return false;
  }
  // accepted
  // stamp
  if (!builtin_interfaces__msg__Time__init(&msg->stamp)) {
    agenticros_msgs__action__Explore_SendGoal_Response__fini(msg);
    return false;
  }
  return true;
}

void
agenticros_msgs__action__Explore_SendGoal_Response__fini(agenticros_msgs__action__Explore_SendGoal_Response * msg)
{
  if (!msg) {
    return;
  }
  // accepted
  // stamp
  builtin_interfaces__msg__Time__fini(&msg->stamp);
}

bool
agenticros_msgs__action__Explore_SendGoal_Response__are_equal(const agenticros_msgs__action__Explore_SendGoal_Response * lhs, const agenticros_msgs__action__Explore_SendGoal_Response * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // accepted
  if (lhs->accepted != rhs->accepted) {
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
agenticros_msgs__action__Explore_SendGoal_Response__copy(
  const agenticros_msgs__action__Explore_SendGoal_Response * input,
  agenticros_msgs__action__Explore_SendGoal_Response * output)
{
  if (!input || !output) {
    return false;
  }
  // accepted
  output->accepted = input->accepted;
  // stamp
  if (!builtin_interfaces__msg__Time__copy(
      &(input->stamp), &(output->stamp)))
  {
    return false;
  }
  return true;
}

agenticros_msgs__action__Explore_SendGoal_Response *
agenticros_msgs__action__Explore_SendGoal_Response__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_SendGoal_Response * msg = (agenticros_msgs__action__Explore_SendGoal_Response *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_SendGoal_Response), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__action__Explore_SendGoal_Response));
  bool success = agenticros_msgs__action__Explore_SendGoal_Response__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__action__Explore_SendGoal_Response__destroy(agenticros_msgs__action__Explore_SendGoal_Response * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__action__Explore_SendGoal_Response__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__action__Explore_SendGoal_Response__Sequence__init(agenticros_msgs__action__Explore_SendGoal_Response__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_SendGoal_Response * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_SendGoal_Response)) {
      return false;
    }
    data = (agenticros_msgs__action__Explore_SendGoal_Response *)allocator.zero_allocate(size, sizeof(agenticros_msgs__action__Explore_SendGoal_Response), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__action__Explore_SendGoal_Response__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__action__Explore_SendGoal_Response__fini(&data[i - 1]);
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
agenticros_msgs__action__Explore_SendGoal_Response__Sequence__fini(agenticros_msgs__action__Explore_SendGoal_Response__Sequence * array)
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
      agenticros_msgs__action__Explore_SendGoal_Response__fini(&array->data[i]);
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

agenticros_msgs__action__Explore_SendGoal_Response__Sequence *
agenticros_msgs__action__Explore_SendGoal_Response__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_SendGoal_Response__Sequence * array = (agenticros_msgs__action__Explore_SendGoal_Response__Sequence *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_SendGoal_Response__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__action__Explore_SendGoal_Response__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__action__Explore_SendGoal_Response__Sequence__destroy(agenticros_msgs__action__Explore_SendGoal_Response__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__action__Explore_SendGoal_Response__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__action__Explore_SendGoal_Response__Sequence__are_equal(const agenticros_msgs__action__Explore_SendGoal_Response__Sequence * lhs, const agenticros_msgs__action__Explore_SendGoal_Response__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__action__Explore_SendGoal_Response__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__action__Explore_SendGoal_Response__Sequence__copy(
  const agenticros_msgs__action__Explore_SendGoal_Response__Sequence * input,
  agenticros_msgs__action__Explore_SendGoal_Response__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_SendGoal_Response)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__action__Explore_SendGoal_Response);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__action__Explore_SendGoal_Response * data =
      (agenticros_msgs__action__Explore_SendGoal_Response *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__action__Explore_SendGoal_Response__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__action__Explore_SendGoal_Response__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__action__Explore_SendGoal_Response__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}


// Include directives for member types
// Member `info`
#include "service_msgs/msg/detail/service_event_info__functions.h"
// Member `request`
// Member `response`
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"

bool
agenticros_msgs__action__Explore_SendGoal_Event__init(agenticros_msgs__action__Explore_SendGoal_Event * msg)
{
  if (!msg) {
    return false;
  }
  // info
  if (!service_msgs__msg__ServiceEventInfo__init(&msg->info)) {
    agenticros_msgs__action__Explore_SendGoal_Event__fini(msg);
    return false;
  }
  // request
  if (!agenticros_msgs__action__Explore_SendGoal_Request__Sequence__init(&msg->request, 0)) {
    agenticros_msgs__action__Explore_SendGoal_Event__fini(msg);
    return false;
  }
  // response
  if (!agenticros_msgs__action__Explore_SendGoal_Response__Sequence__init(&msg->response, 0)) {
    agenticros_msgs__action__Explore_SendGoal_Event__fini(msg);
    return false;
  }
  return true;
}

void
agenticros_msgs__action__Explore_SendGoal_Event__fini(agenticros_msgs__action__Explore_SendGoal_Event * msg)
{
  if (!msg) {
    return;
  }
  // info
  service_msgs__msg__ServiceEventInfo__fini(&msg->info);
  // request
  agenticros_msgs__action__Explore_SendGoal_Request__Sequence__fini(&msg->request);
  // response
  agenticros_msgs__action__Explore_SendGoal_Response__Sequence__fini(&msg->response);
}

bool
agenticros_msgs__action__Explore_SendGoal_Event__are_equal(const agenticros_msgs__action__Explore_SendGoal_Event * lhs, const agenticros_msgs__action__Explore_SendGoal_Event * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // info
  if (!service_msgs__msg__ServiceEventInfo__are_equal(
      &(lhs->info), &(rhs->info)))
  {
    return false;
  }
  // request
  if (!agenticros_msgs__action__Explore_SendGoal_Request__Sequence__are_equal(
      &(lhs->request), &(rhs->request)))
  {
    return false;
  }
  // response
  if (!agenticros_msgs__action__Explore_SendGoal_Response__Sequence__are_equal(
      &(lhs->response), &(rhs->response)))
  {
    return false;
  }
  return true;
}

bool
agenticros_msgs__action__Explore_SendGoal_Event__copy(
  const agenticros_msgs__action__Explore_SendGoal_Event * input,
  agenticros_msgs__action__Explore_SendGoal_Event * output)
{
  if (!input || !output) {
    return false;
  }
  // info
  if (!service_msgs__msg__ServiceEventInfo__copy(
      &(input->info), &(output->info)))
  {
    return false;
  }
  // request
  if (!agenticros_msgs__action__Explore_SendGoal_Request__Sequence__copy(
      &(input->request), &(output->request)))
  {
    return false;
  }
  // response
  if (!agenticros_msgs__action__Explore_SendGoal_Response__Sequence__copy(
      &(input->response), &(output->response)))
  {
    return false;
  }
  return true;
}

agenticros_msgs__action__Explore_SendGoal_Event *
agenticros_msgs__action__Explore_SendGoal_Event__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_SendGoal_Event * msg = (agenticros_msgs__action__Explore_SendGoal_Event *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_SendGoal_Event), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__action__Explore_SendGoal_Event));
  bool success = agenticros_msgs__action__Explore_SendGoal_Event__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__action__Explore_SendGoal_Event__destroy(agenticros_msgs__action__Explore_SendGoal_Event * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__action__Explore_SendGoal_Event__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__action__Explore_SendGoal_Event__Sequence__init(agenticros_msgs__action__Explore_SendGoal_Event__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_SendGoal_Event * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_SendGoal_Event)) {
      return false;
    }
    data = (agenticros_msgs__action__Explore_SendGoal_Event *)allocator.zero_allocate(size, sizeof(agenticros_msgs__action__Explore_SendGoal_Event), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__action__Explore_SendGoal_Event__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__action__Explore_SendGoal_Event__fini(&data[i - 1]);
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
agenticros_msgs__action__Explore_SendGoal_Event__Sequence__fini(agenticros_msgs__action__Explore_SendGoal_Event__Sequence * array)
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
      agenticros_msgs__action__Explore_SendGoal_Event__fini(&array->data[i]);
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

agenticros_msgs__action__Explore_SendGoal_Event__Sequence *
agenticros_msgs__action__Explore_SendGoal_Event__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_SendGoal_Event__Sequence * array = (agenticros_msgs__action__Explore_SendGoal_Event__Sequence *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_SendGoal_Event__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__action__Explore_SendGoal_Event__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__action__Explore_SendGoal_Event__Sequence__destroy(agenticros_msgs__action__Explore_SendGoal_Event__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__action__Explore_SendGoal_Event__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__action__Explore_SendGoal_Event__Sequence__are_equal(const agenticros_msgs__action__Explore_SendGoal_Event__Sequence * lhs, const agenticros_msgs__action__Explore_SendGoal_Event__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__action__Explore_SendGoal_Event__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__action__Explore_SendGoal_Event__Sequence__copy(
  const agenticros_msgs__action__Explore_SendGoal_Event__Sequence * input,
  agenticros_msgs__action__Explore_SendGoal_Event__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_SendGoal_Event)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__action__Explore_SendGoal_Event);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__action__Explore_SendGoal_Event * data =
      (agenticros_msgs__action__Explore_SendGoal_Event *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__action__Explore_SendGoal_Event__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__action__Explore_SendGoal_Event__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__action__Explore_SendGoal_Event__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}


// Include directives for member types
// Member `goal_id`
// already included above
// #include "unique_identifier_msgs/msg/detail/uuid__functions.h"

bool
agenticros_msgs__action__Explore_GetResult_Request__init(agenticros_msgs__action__Explore_GetResult_Request * msg)
{
  if (!msg) {
    return false;
  }
  // goal_id
  if (!unique_identifier_msgs__msg__UUID__init(&msg->goal_id)) {
    agenticros_msgs__action__Explore_GetResult_Request__fini(msg);
    return false;
  }
  return true;
}

void
agenticros_msgs__action__Explore_GetResult_Request__fini(agenticros_msgs__action__Explore_GetResult_Request * msg)
{
  if (!msg) {
    return;
  }
  // goal_id
  unique_identifier_msgs__msg__UUID__fini(&msg->goal_id);
}

bool
agenticros_msgs__action__Explore_GetResult_Request__are_equal(const agenticros_msgs__action__Explore_GetResult_Request * lhs, const agenticros_msgs__action__Explore_GetResult_Request * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // goal_id
  if (!unique_identifier_msgs__msg__UUID__are_equal(
      &(lhs->goal_id), &(rhs->goal_id)))
  {
    return false;
  }
  return true;
}

bool
agenticros_msgs__action__Explore_GetResult_Request__copy(
  const agenticros_msgs__action__Explore_GetResult_Request * input,
  agenticros_msgs__action__Explore_GetResult_Request * output)
{
  if (!input || !output) {
    return false;
  }
  // goal_id
  if (!unique_identifier_msgs__msg__UUID__copy(
      &(input->goal_id), &(output->goal_id)))
  {
    return false;
  }
  return true;
}

agenticros_msgs__action__Explore_GetResult_Request *
agenticros_msgs__action__Explore_GetResult_Request__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_GetResult_Request * msg = (agenticros_msgs__action__Explore_GetResult_Request *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_GetResult_Request), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__action__Explore_GetResult_Request));
  bool success = agenticros_msgs__action__Explore_GetResult_Request__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__action__Explore_GetResult_Request__destroy(agenticros_msgs__action__Explore_GetResult_Request * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__action__Explore_GetResult_Request__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__action__Explore_GetResult_Request__Sequence__init(agenticros_msgs__action__Explore_GetResult_Request__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_GetResult_Request * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_GetResult_Request)) {
      return false;
    }
    data = (agenticros_msgs__action__Explore_GetResult_Request *)allocator.zero_allocate(size, sizeof(agenticros_msgs__action__Explore_GetResult_Request), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__action__Explore_GetResult_Request__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__action__Explore_GetResult_Request__fini(&data[i - 1]);
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
agenticros_msgs__action__Explore_GetResult_Request__Sequence__fini(agenticros_msgs__action__Explore_GetResult_Request__Sequence * array)
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
      agenticros_msgs__action__Explore_GetResult_Request__fini(&array->data[i]);
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

agenticros_msgs__action__Explore_GetResult_Request__Sequence *
agenticros_msgs__action__Explore_GetResult_Request__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_GetResult_Request__Sequence * array = (agenticros_msgs__action__Explore_GetResult_Request__Sequence *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_GetResult_Request__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__action__Explore_GetResult_Request__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__action__Explore_GetResult_Request__Sequence__destroy(agenticros_msgs__action__Explore_GetResult_Request__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__action__Explore_GetResult_Request__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__action__Explore_GetResult_Request__Sequence__are_equal(const agenticros_msgs__action__Explore_GetResult_Request__Sequence * lhs, const agenticros_msgs__action__Explore_GetResult_Request__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__action__Explore_GetResult_Request__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__action__Explore_GetResult_Request__Sequence__copy(
  const agenticros_msgs__action__Explore_GetResult_Request__Sequence * input,
  agenticros_msgs__action__Explore_GetResult_Request__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_GetResult_Request)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__action__Explore_GetResult_Request);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__action__Explore_GetResult_Request * data =
      (agenticros_msgs__action__Explore_GetResult_Request *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__action__Explore_GetResult_Request__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__action__Explore_GetResult_Request__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__action__Explore_GetResult_Request__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}


// Include directives for member types
// Member `result`
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"

bool
agenticros_msgs__action__Explore_GetResult_Response__init(agenticros_msgs__action__Explore_GetResult_Response * msg)
{
  if (!msg) {
    return false;
  }
  // status
  // result
  if (!agenticros_msgs__action__Explore_Result__init(&msg->result)) {
    agenticros_msgs__action__Explore_GetResult_Response__fini(msg);
    return false;
  }
  return true;
}

void
agenticros_msgs__action__Explore_GetResult_Response__fini(agenticros_msgs__action__Explore_GetResult_Response * msg)
{
  if (!msg) {
    return;
  }
  // status
  // result
  agenticros_msgs__action__Explore_Result__fini(&msg->result);
}

bool
agenticros_msgs__action__Explore_GetResult_Response__are_equal(const agenticros_msgs__action__Explore_GetResult_Response * lhs, const agenticros_msgs__action__Explore_GetResult_Response * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // status
  if (lhs->status != rhs->status) {
    return false;
  }
  // result
  if (!agenticros_msgs__action__Explore_Result__are_equal(
      &(lhs->result), &(rhs->result)))
  {
    return false;
  }
  return true;
}

bool
agenticros_msgs__action__Explore_GetResult_Response__copy(
  const agenticros_msgs__action__Explore_GetResult_Response * input,
  agenticros_msgs__action__Explore_GetResult_Response * output)
{
  if (!input || !output) {
    return false;
  }
  // status
  output->status = input->status;
  // result
  if (!agenticros_msgs__action__Explore_Result__copy(
      &(input->result), &(output->result)))
  {
    return false;
  }
  return true;
}

agenticros_msgs__action__Explore_GetResult_Response *
agenticros_msgs__action__Explore_GetResult_Response__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_GetResult_Response * msg = (agenticros_msgs__action__Explore_GetResult_Response *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_GetResult_Response), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__action__Explore_GetResult_Response));
  bool success = agenticros_msgs__action__Explore_GetResult_Response__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__action__Explore_GetResult_Response__destroy(agenticros_msgs__action__Explore_GetResult_Response * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__action__Explore_GetResult_Response__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__action__Explore_GetResult_Response__Sequence__init(agenticros_msgs__action__Explore_GetResult_Response__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_GetResult_Response * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_GetResult_Response)) {
      return false;
    }
    data = (agenticros_msgs__action__Explore_GetResult_Response *)allocator.zero_allocate(size, sizeof(agenticros_msgs__action__Explore_GetResult_Response), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__action__Explore_GetResult_Response__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__action__Explore_GetResult_Response__fini(&data[i - 1]);
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
agenticros_msgs__action__Explore_GetResult_Response__Sequence__fini(agenticros_msgs__action__Explore_GetResult_Response__Sequence * array)
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
      agenticros_msgs__action__Explore_GetResult_Response__fini(&array->data[i]);
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

agenticros_msgs__action__Explore_GetResult_Response__Sequence *
agenticros_msgs__action__Explore_GetResult_Response__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_GetResult_Response__Sequence * array = (agenticros_msgs__action__Explore_GetResult_Response__Sequence *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_GetResult_Response__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__action__Explore_GetResult_Response__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__action__Explore_GetResult_Response__Sequence__destroy(agenticros_msgs__action__Explore_GetResult_Response__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__action__Explore_GetResult_Response__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__action__Explore_GetResult_Response__Sequence__are_equal(const agenticros_msgs__action__Explore_GetResult_Response__Sequence * lhs, const agenticros_msgs__action__Explore_GetResult_Response__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__action__Explore_GetResult_Response__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__action__Explore_GetResult_Response__Sequence__copy(
  const agenticros_msgs__action__Explore_GetResult_Response__Sequence * input,
  agenticros_msgs__action__Explore_GetResult_Response__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_GetResult_Response)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__action__Explore_GetResult_Response);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__action__Explore_GetResult_Response * data =
      (agenticros_msgs__action__Explore_GetResult_Response *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__action__Explore_GetResult_Response__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__action__Explore_GetResult_Response__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__action__Explore_GetResult_Response__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}


// Include directives for member types
// Member `info`
// already included above
// #include "service_msgs/msg/detail/service_event_info__functions.h"
// Member `request`
// Member `response`
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"

bool
agenticros_msgs__action__Explore_GetResult_Event__init(agenticros_msgs__action__Explore_GetResult_Event * msg)
{
  if (!msg) {
    return false;
  }
  // info
  if (!service_msgs__msg__ServiceEventInfo__init(&msg->info)) {
    agenticros_msgs__action__Explore_GetResult_Event__fini(msg);
    return false;
  }
  // request
  if (!agenticros_msgs__action__Explore_GetResult_Request__Sequence__init(&msg->request, 0)) {
    agenticros_msgs__action__Explore_GetResult_Event__fini(msg);
    return false;
  }
  // response
  if (!agenticros_msgs__action__Explore_GetResult_Response__Sequence__init(&msg->response, 0)) {
    agenticros_msgs__action__Explore_GetResult_Event__fini(msg);
    return false;
  }
  return true;
}

void
agenticros_msgs__action__Explore_GetResult_Event__fini(agenticros_msgs__action__Explore_GetResult_Event * msg)
{
  if (!msg) {
    return;
  }
  // info
  service_msgs__msg__ServiceEventInfo__fini(&msg->info);
  // request
  agenticros_msgs__action__Explore_GetResult_Request__Sequence__fini(&msg->request);
  // response
  agenticros_msgs__action__Explore_GetResult_Response__Sequence__fini(&msg->response);
}

bool
agenticros_msgs__action__Explore_GetResult_Event__are_equal(const agenticros_msgs__action__Explore_GetResult_Event * lhs, const agenticros_msgs__action__Explore_GetResult_Event * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // info
  if (!service_msgs__msg__ServiceEventInfo__are_equal(
      &(lhs->info), &(rhs->info)))
  {
    return false;
  }
  // request
  if (!agenticros_msgs__action__Explore_GetResult_Request__Sequence__are_equal(
      &(lhs->request), &(rhs->request)))
  {
    return false;
  }
  // response
  if (!agenticros_msgs__action__Explore_GetResult_Response__Sequence__are_equal(
      &(lhs->response), &(rhs->response)))
  {
    return false;
  }
  return true;
}

bool
agenticros_msgs__action__Explore_GetResult_Event__copy(
  const agenticros_msgs__action__Explore_GetResult_Event * input,
  agenticros_msgs__action__Explore_GetResult_Event * output)
{
  if (!input || !output) {
    return false;
  }
  // info
  if (!service_msgs__msg__ServiceEventInfo__copy(
      &(input->info), &(output->info)))
  {
    return false;
  }
  // request
  if (!agenticros_msgs__action__Explore_GetResult_Request__Sequence__copy(
      &(input->request), &(output->request)))
  {
    return false;
  }
  // response
  if (!agenticros_msgs__action__Explore_GetResult_Response__Sequence__copy(
      &(input->response), &(output->response)))
  {
    return false;
  }
  return true;
}

agenticros_msgs__action__Explore_GetResult_Event *
agenticros_msgs__action__Explore_GetResult_Event__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_GetResult_Event * msg = (agenticros_msgs__action__Explore_GetResult_Event *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_GetResult_Event), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__action__Explore_GetResult_Event));
  bool success = agenticros_msgs__action__Explore_GetResult_Event__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__action__Explore_GetResult_Event__destroy(agenticros_msgs__action__Explore_GetResult_Event * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__action__Explore_GetResult_Event__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__action__Explore_GetResult_Event__Sequence__init(agenticros_msgs__action__Explore_GetResult_Event__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_GetResult_Event * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_GetResult_Event)) {
      return false;
    }
    data = (agenticros_msgs__action__Explore_GetResult_Event *)allocator.zero_allocate(size, sizeof(agenticros_msgs__action__Explore_GetResult_Event), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__action__Explore_GetResult_Event__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__action__Explore_GetResult_Event__fini(&data[i - 1]);
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
agenticros_msgs__action__Explore_GetResult_Event__Sequence__fini(agenticros_msgs__action__Explore_GetResult_Event__Sequence * array)
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
      agenticros_msgs__action__Explore_GetResult_Event__fini(&array->data[i]);
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

agenticros_msgs__action__Explore_GetResult_Event__Sequence *
agenticros_msgs__action__Explore_GetResult_Event__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_GetResult_Event__Sequence * array = (agenticros_msgs__action__Explore_GetResult_Event__Sequence *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_GetResult_Event__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__action__Explore_GetResult_Event__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__action__Explore_GetResult_Event__Sequence__destroy(agenticros_msgs__action__Explore_GetResult_Event__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__action__Explore_GetResult_Event__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__action__Explore_GetResult_Event__Sequence__are_equal(const agenticros_msgs__action__Explore_GetResult_Event__Sequence * lhs, const agenticros_msgs__action__Explore_GetResult_Event__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__action__Explore_GetResult_Event__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__action__Explore_GetResult_Event__Sequence__copy(
  const agenticros_msgs__action__Explore_GetResult_Event__Sequence * input,
  agenticros_msgs__action__Explore_GetResult_Event__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_GetResult_Event)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__action__Explore_GetResult_Event);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__action__Explore_GetResult_Event * data =
      (agenticros_msgs__action__Explore_GetResult_Event *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__action__Explore_GetResult_Event__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__action__Explore_GetResult_Event__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__action__Explore_GetResult_Event__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}


// Include directives for member types
// Member `goal_id`
// already included above
// #include "unique_identifier_msgs/msg/detail/uuid__functions.h"
// Member `feedback`
// already included above
// #include "agenticros_msgs/action/detail/explore__functions.h"

bool
agenticros_msgs__action__Explore_FeedbackMessage__init(agenticros_msgs__action__Explore_FeedbackMessage * msg)
{
  if (!msg) {
    return false;
  }
  // goal_id
  if (!unique_identifier_msgs__msg__UUID__init(&msg->goal_id)) {
    agenticros_msgs__action__Explore_FeedbackMessage__fini(msg);
    return false;
  }
  // feedback
  if (!agenticros_msgs__action__Explore_Feedback__init(&msg->feedback)) {
    agenticros_msgs__action__Explore_FeedbackMessage__fini(msg);
    return false;
  }
  return true;
}

void
agenticros_msgs__action__Explore_FeedbackMessage__fini(agenticros_msgs__action__Explore_FeedbackMessage * msg)
{
  if (!msg) {
    return;
  }
  // goal_id
  unique_identifier_msgs__msg__UUID__fini(&msg->goal_id);
  // feedback
  agenticros_msgs__action__Explore_Feedback__fini(&msg->feedback);
}

bool
agenticros_msgs__action__Explore_FeedbackMessage__are_equal(const agenticros_msgs__action__Explore_FeedbackMessage * lhs, const agenticros_msgs__action__Explore_FeedbackMessage * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // goal_id
  if (!unique_identifier_msgs__msg__UUID__are_equal(
      &(lhs->goal_id), &(rhs->goal_id)))
  {
    return false;
  }
  // feedback
  if (!agenticros_msgs__action__Explore_Feedback__are_equal(
      &(lhs->feedback), &(rhs->feedback)))
  {
    return false;
  }
  return true;
}

bool
agenticros_msgs__action__Explore_FeedbackMessage__copy(
  const agenticros_msgs__action__Explore_FeedbackMessage * input,
  agenticros_msgs__action__Explore_FeedbackMessage * output)
{
  if (!input || !output) {
    return false;
  }
  // goal_id
  if (!unique_identifier_msgs__msg__UUID__copy(
      &(input->goal_id), &(output->goal_id)))
  {
    return false;
  }
  // feedback
  if (!agenticros_msgs__action__Explore_Feedback__copy(
      &(input->feedback), &(output->feedback)))
  {
    return false;
  }
  return true;
}

agenticros_msgs__action__Explore_FeedbackMessage *
agenticros_msgs__action__Explore_FeedbackMessage__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_FeedbackMessage * msg = (agenticros_msgs__action__Explore_FeedbackMessage *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_FeedbackMessage), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__action__Explore_FeedbackMessage));
  bool success = agenticros_msgs__action__Explore_FeedbackMessage__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__action__Explore_FeedbackMessage__destroy(agenticros_msgs__action__Explore_FeedbackMessage * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__action__Explore_FeedbackMessage__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__action__Explore_FeedbackMessage__Sequence__init(agenticros_msgs__action__Explore_FeedbackMessage__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_FeedbackMessage * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_FeedbackMessage)) {
      return false;
    }
    data = (agenticros_msgs__action__Explore_FeedbackMessage *)allocator.zero_allocate(size, sizeof(agenticros_msgs__action__Explore_FeedbackMessage), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__action__Explore_FeedbackMessage__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__action__Explore_FeedbackMessage__fini(&data[i - 1]);
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
agenticros_msgs__action__Explore_FeedbackMessage__Sequence__fini(agenticros_msgs__action__Explore_FeedbackMessage__Sequence * array)
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
      agenticros_msgs__action__Explore_FeedbackMessage__fini(&array->data[i]);
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

agenticros_msgs__action__Explore_FeedbackMessage__Sequence *
agenticros_msgs__action__Explore_FeedbackMessage__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__action__Explore_FeedbackMessage__Sequence * array = (agenticros_msgs__action__Explore_FeedbackMessage__Sequence *)allocator.allocate(sizeof(agenticros_msgs__action__Explore_FeedbackMessage__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__action__Explore_FeedbackMessage__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__action__Explore_FeedbackMessage__Sequence__destroy(agenticros_msgs__action__Explore_FeedbackMessage__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__action__Explore_FeedbackMessage__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__action__Explore_FeedbackMessage__Sequence__are_equal(const agenticros_msgs__action__Explore_FeedbackMessage__Sequence * lhs, const agenticros_msgs__action__Explore_FeedbackMessage__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__action__Explore_FeedbackMessage__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__action__Explore_FeedbackMessage__Sequence__copy(
  const agenticros_msgs__action__Explore_FeedbackMessage__Sequence * input,
  agenticros_msgs__action__Explore_FeedbackMessage__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__action__Explore_FeedbackMessage)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__action__Explore_FeedbackMessage);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__action__Explore_FeedbackMessage * data =
      (agenticros_msgs__action__Explore_FeedbackMessage *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__action__Explore_FeedbackMessage__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__action__Explore_FeedbackMessage__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__action__Explore_FeedbackMessage__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}
