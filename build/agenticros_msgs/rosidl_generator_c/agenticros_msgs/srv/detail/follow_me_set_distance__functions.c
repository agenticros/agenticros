// generated from rosidl_generator_c/resource/idl__functions.c.em
// with input from agenticros_msgs:srv/FollowMeSetDistance.idl
// generated code does not contain a copyright notice
#include "agenticros_msgs/srv/detail/follow_me_set_distance__functions.h"

#include <assert.h>
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>

#include "rcutils/allocator.h"

bool
agenticros_msgs__srv__FollowMeSetDistance_Request__init(agenticros_msgs__srv__FollowMeSetDistance_Request * msg)
{
  if (!msg) {
    return false;
  }
  // distance
  return true;
}

void
agenticros_msgs__srv__FollowMeSetDistance_Request__fini(agenticros_msgs__srv__FollowMeSetDistance_Request * msg)
{
  if (!msg) {
    return;
  }
  // distance
}

bool
agenticros_msgs__srv__FollowMeSetDistance_Request__are_equal(const agenticros_msgs__srv__FollowMeSetDistance_Request * lhs, const agenticros_msgs__srv__FollowMeSetDistance_Request * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // distance
  if (lhs->distance != rhs->distance) {
    return false;
  }
  return true;
}

bool
agenticros_msgs__srv__FollowMeSetDistance_Request__copy(
  const agenticros_msgs__srv__FollowMeSetDistance_Request * input,
  agenticros_msgs__srv__FollowMeSetDistance_Request * output)
{
  if (!input || !output) {
    return false;
  }
  // distance
  output->distance = input->distance;
  return true;
}

agenticros_msgs__srv__FollowMeSetDistance_Request *
agenticros_msgs__srv__FollowMeSetDistance_Request__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__srv__FollowMeSetDistance_Request * msg = (agenticros_msgs__srv__FollowMeSetDistance_Request *)allocator.allocate(sizeof(agenticros_msgs__srv__FollowMeSetDistance_Request), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__srv__FollowMeSetDistance_Request));
  bool success = agenticros_msgs__srv__FollowMeSetDistance_Request__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__srv__FollowMeSetDistance_Request__destroy(agenticros_msgs__srv__FollowMeSetDistance_Request * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__srv__FollowMeSetDistance_Request__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__init(agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__srv__FollowMeSetDistance_Request * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__srv__FollowMeSetDistance_Request)) {
      return false;
    }
    data = (agenticros_msgs__srv__FollowMeSetDistance_Request *)allocator.zero_allocate(size, sizeof(agenticros_msgs__srv__FollowMeSetDistance_Request), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__srv__FollowMeSetDistance_Request__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__srv__FollowMeSetDistance_Request__fini(&data[i - 1]);
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
agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__fini(agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence * array)
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
      agenticros_msgs__srv__FollowMeSetDistance_Request__fini(&array->data[i]);
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

agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence *
agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence * array = (agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence *)allocator.allocate(sizeof(agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__destroy(agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__are_equal(const agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence * lhs, const agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__srv__FollowMeSetDistance_Request__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__copy(
  const agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence * input,
  agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__srv__FollowMeSetDistance_Request)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__srv__FollowMeSetDistance_Request);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__srv__FollowMeSetDistance_Request * data =
      (agenticros_msgs__srv__FollowMeSetDistance_Request *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__srv__FollowMeSetDistance_Request__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__srv__FollowMeSetDistance_Request__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__srv__FollowMeSetDistance_Request__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}


bool
agenticros_msgs__srv__FollowMeSetDistance_Response__init(agenticros_msgs__srv__FollowMeSetDistance_Response * msg)
{
  if (!msg) {
    return false;
  }
  // success
  // target_distance
  return true;
}

void
agenticros_msgs__srv__FollowMeSetDistance_Response__fini(agenticros_msgs__srv__FollowMeSetDistance_Response * msg)
{
  if (!msg) {
    return;
  }
  // success
  // target_distance
}

bool
agenticros_msgs__srv__FollowMeSetDistance_Response__are_equal(const agenticros_msgs__srv__FollowMeSetDistance_Response * lhs, const agenticros_msgs__srv__FollowMeSetDistance_Response * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  // success
  if (lhs->success != rhs->success) {
    return false;
  }
  // target_distance
  if (lhs->target_distance != rhs->target_distance) {
    return false;
  }
  return true;
}

bool
agenticros_msgs__srv__FollowMeSetDistance_Response__copy(
  const agenticros_msgs__srv__FollowMeSetDistance_Response * input,
  agenticros_msgs__srv__FollowMeSetDistance_Response * output)
{
  if (!input || !output) {
    return false;
  }
  // success
  output->success = input->success;
  // target_distance
  output->target_distance = input->target_distance;
  return true;
}

agenticros_msgs__srv__FollowMeSetDistance_Response *
agenticros_msgs__srv__FollowMeSetDistance_Response__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__srv__FollowMeSetDistance_Response * msg = (agenticros_msgs__srv__FollowMeSetDistance_Response *)allocator.allocate(sizeof(agenticros_msgs__srv__FollowMeSetDistance_Response), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__srv__FollowMeSetDistance_Response));
  bool success = agenticros_msgs__srv__FollowMeSetDistance_Response__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__srv__FollowMeSetDistance_Response__destroy(agenticros_msgs__srv__FollowMeSetDistance_Response * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__srv__FollowMeSetDistance_Response__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__init(agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__srv__FollowMeSetDistance_Response * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__srv__FollowMeSetDistance_Response)) {
      return false;
    }
    data = (agenticros_msgs__srv__FollowMeSetDistance_Response *)allocator.zero_allocate(size, sizeof(agenticros_msgs__srv__FollowMeSetDistance_Response), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__srv__FollowMeSetDistance_Response__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__srv__FollowMeSetDistance_Response__fini(&data[i - 1]);
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
agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__fini(agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence * array)
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
      agenticros_msgs__srv__FollowMeSetDistance_Response__fini(&array->data[i]);
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

agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence *
agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence * array = (agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence *)allocator.allocate(sizeof(agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__destroy(agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__are_equal(const agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence * lhs, const agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__srv__FollowMeSetDistance_Response__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__copy(
  const agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence * input,
  agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__srv__FollowMeSetDistance_Response)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__srv__FollowMeSetDistance_Response);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__srv__FollowMeSetDistance_Response * data =
      (agenticros_msgs__srv__FollowMeSetDistance_Response *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__srv__FollowMeSetDistance_Response__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__srv__FollowMeSetDistance_Response__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__srv__FollowMeSetDistance_Response__copy(
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
// #include "agenticros_msgs/srv/detail/follow_me_set_distance__functions.h"

bool
agenticros_msgs__srv__FollowMeSetDistance_Event__init(agenticros_msgs__srv__FollowMeSetDistance_Event * msg)
{
  if (!msg) {
    return false;
  }
  // info
  if (!service_msgs__msg__ServiceEventInfo__init(&msg->info)) {
    agenticros_msgs__srv__FollowMeSetDistance_Event__fini(msg);
    return false;
  }
  // request
  if (!agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__init(&msg->request, 0)) {
    agenticros_msgs__srv__FollowMeSetDistance_Event__fini(msg);
    return false;
  }
  // response
  if (!agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__init(&msg->response, 0)) {
    agenticros_msgs__srv__FollowMeSetDistance_Event__fini(msg);
    return false;
  }
  return true;
}

void
agenticros_msgs__srv__FollowMeSetDistance_Event__fini(agenticros_msgs__srv__FollowMeSetDistance_Event * msg)
{
  if (!msg) {
    return;
  }
  // info
  service_msgs__msg__ServiceEventInfo__fini(&msg->info);
  // request
  agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__fini(&msg->request);
  // response
  agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__fini(&msg->response);
}

bool
agenticros_msgs__srv__FollowMeSetDistance_Event__are_equal(const agenticros_msgs__srv__FollowMeSetDistance_Event * lhs, const agenticros_msgs__srv__FollowMeSetDistance_Event * rhs)
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
  if (!agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__are_equal(
      &(lhs->request), &(rhs->request)))
  {
    return false;
  }
  // response
  if (!agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__are_equal(
      &(lhs->response), &(rhs->response)))
  {
    return false;
  }
  return true;
}

bool
agenticros_msgs__srv__FollowMeSetDistance_Event__copy(
  const agenticros_msgs__srv__FollowMeSetDistance_Event * input,
  agenticros_msgs__srv__FollowMeSetDistance_Event * output)
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
  if (!agenticros_msgs__srv__FollowMeSetDistance_Request__Sequence__copy(
      &(input->request), &(output->request)))
  {
    return false;
  }
  // response
  if (!agenticros_msgs__srv__FollowMeSetDistance_Response__Sequence__copy(
      &(input->response), &(output->response)))
  {
    return false;
  }
  return true;
}

agenticros_msgs__srv__FollowMeSetDistance_Event *
agenticros_msgs__srv__FollowMeSetDistance_Event__create(void)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__srv__FollowMeSetDistance_Event * msg = (agenticros_msgs__srv__FollowMeSetDistance_Event *)allocator.allocate(sizeof(agenticros_msgs__srv__FollowMeSetDistance_Event), allocator.state);
  if (!msg) {
    return NULL;
  }
  memset(msg, 0, sizeof(agenticros_msgs__srv__FollowMeSetDistance_Event));
  bool success = agenticros_msgs__srv__FollowMeSetDistance_Event__init(msg);
  if (!success) {
    allocator.deallocate(msg, allocator.state);
    return NULL;
  }
  return msg;
}

void
agenticros_msgs__srv__FollowMeSetDistance_Event__destroy(agenticros_msgs__srv__FollowMeSetDistance_Event * msg)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (msg) {
    agenticros_msgs__srv__FollowMeSetDistance_Event__fini(msg);
  }
  allocator.deallocate(msg, allocator.state);
}


bool
agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence__init(agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence * array, size_t size)
{
  if (!array) {
    return false;
  }
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__srv__FollowMeSetDistance_Event * data = NULL;

  if (size) {
    if (size > SIZE_MAX / sizeof(agenticros_msgs__srv__FollowMeSetDistance_Event)) {
      return false;
    }
    data = (agenticros_msgs__srv__FollowMeSetDistance_Event *)allocator.zero_allocate(size, sizeof(agenticros_msgs__srv__FollowMeSetDistance_Event), allocator.state);
    if (!data) {
      return false;
    }
    // initialize all array elements
    size_t i;
    for (i = 0; i < size; ++i) {
      bool success = agenticros_msgs__srv__FollowMeSetDistance_Event__init(&data[i]);
      if (!success) {
        break;
      }
    }
    if (i < size) {
      // if initialization failed finalize the already initialized array elements
      for (; i > 0; --i) {
        agenticros_msgs__srv__FollowMeSetDistance_Event__fini(&data[i - 1]);
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
agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence__fini(agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence * array)
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
      agenticros_msgs__srv__FollowMeSetDistance_Event__fini(&array->data[i]);
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

agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence *
agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence__create(size_t size)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence * array = (agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence *)allocator.allocate(sizeof(agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence), allocator.state);
  if (!array) {
    return NULL;
  }
  bool success = agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence__init(array, size);
  if (!success) {
    allocator.deallocate(array, allocator.state);
    return NULL;
  }
  return array;
}

void
agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence__destroy(agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence * array)
{
  rcutils_allocator_t allocator = rcutils_get_default_allocator();
  if (array) {
    agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence__fini(array);
  }
  allocator.deallocate(array, allocator.state);
}

bool
agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence__are_equal(const agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence * lhs, const agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence * rhs)
{
  if (!lhs || !rhs) {
    return false;
  }
  if (lhs->size != rhs->size) {
    return false;
  }
  for (size_t i = 0; i < lhs->size; ++i) {
    if (!agenticros_msgs__srv__FollowMeSetDistance_Event__are_equal(&(lhs->data[i]), &(rhs->data[i]))) {
      return false;
    }
  }
  return true;
}

bool
agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence__copy(
  const agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence * input,
  agenticros_msgs__srv__FollowMeSetDistance_Event__Sequence * output)
{
  if (!input || !output) {
    return false;
  }
  if (output->capacity < input->size) {
    if (input->size > SIZE_MAX / sizeof(agenticros_msgs__srv__FollowMeSetDistance_Event)) {
      return false;
    }
    const size_t allocation_size =
      input->size * sizeof(agenticros_msgs__srv__FollowMeSetDistance_Event);
    rcutils_allocator_t allocator = rcutils_get_default_allocator();
    agenticros_msgs__srv__FollowMeSetDistance_Event * data =
      (agenticros_msgs__srv__FollowMeSetDistance_Event *)allocator.reallocate(
      output->data, allocation_size, allocator.state);
    if (!data) {
      return false;
    }
    // If reallocation succeeded, memory may or may not have been moved
    // to fulfill the allocation request, invalidating output->data.
    output->data = data;
    for (size_t i = output->capacity; i < input->size; ++i) {
      if (!agenticros_msgs__srv__FollowMeSetDistance_Event__init(&output->data[i])) {
        // If initialization of any new item fails, roll back
        // all previously initialized items. Existing items
        // in output are to be left unmodified.
        for (; i-- > output->capacity; ) {
          agenticros_msgs__srv__FollowMeSetDistance_Event__fini(&output->data[i]);
        }
        return false;
      }
    }
    output->capacity = input->size;
  }
  output->size = input->size;
  for (size_t i = 0; i < input->size; ++i) {
    if (!agenticros_msgs__srv__FollowMeSetDistance_Event__copy(
        &(input->data[i]), &(output->data[i])))
    {
      return false;
    }
  }
  return true;
}
