// generated from rosidl_generator_c/resource/idl__functions.h.em
// with input from agenticros_msgs:srv/FollowMeStop.idl
// generated code does not contain a copyright notice

// IWYU pragma: private, include "agenticros_msgs/srv/follow_me_stop.h"


#ifndef AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_STOP__FUNCTIONS_H_
#define AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_STOP__FUNCTIONS_H_

#ifdef __cplusplus
extern "C"
{
#endif

#include <stdbool.h>
#include <stdlib.h>

#include "rosidl_runtime_c/action_type_support_struct.h"
#include "rosidl_runtime_c/message_type_support_struct.h"
#include "rosidl_runtime_c/service_type_support_struct.h"
#include "rosidl_runtime_c/type_description/type_description__struct.h"
#include "rosidl_runtime_c/type_description/type_source__struct.h"
#include "rosidl_runtime_c/type_hash.h"
#include "rosidl_runtime_c/visibility_control.h"
#include "agenticros_msgs/msg/rosidl_generator_c__visibility_control.h"

#include "agenticros_msgs/srv/detail/follow_me_stop__struct.h"

/// Retrieve pointer to the hash of the description of this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeStop__get_type_hash(
  const rosidl_service_type_support_t * type_support);

/// Retrieve pointer to the description of this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__FollowMeStop__get_type_description(
  const rosidl_service_type_support_t * type_support);

/// Retrieve pointer to the single raw source text that defined this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeStop__get_individual_type_description_source(
  const rosidl_service_type_support_t * type_support);

/// Retrieve pointer to the recursive raw sources that defined the description of this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeStop__get_type_description_sources(
  const rosidl_service_type_support_t * type_support);

/// Initialize srv/FollowMeStop message.
/**
 * If the init function is called twice for the same message without
 * calling fini inbetween previously allocated memory will be leaked.
 * \param[in,out] msg The previously allocated message pointer.
 * Fields without a default value will not be initialized by this function.
 * You might want to call memset(msg, 0, sizeof(
 * agenticros_msgs__srv__FollowMeStop_Request
 * )) before or use
 * agenticros_msgs__srv__FollowMeStop_Request__create()
 * to allocate and initialize the message.
 * \return true if initialization was successful, otherwise false
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Request__init(agenticros_msgs__srv__FollowMeStop_Request * msg);

/// Finalize srv/FollowMeStop message.
/**
 * \param[in,out] msg The allocated message pointer.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
void
agenticros_msgs__srv__FollowMeStop_Request__fini(agenticros_msgs__srv__FollowMeStop_Request * msg);

/// Create srv/FollowMeStop message.
/**
 * It allocates the memory for the message, sets the memory to zero, and
 * calls
 * agenticros_msgs__srv__FollowMeStop_Request__init().
 * \return The pointer to the initialized message if successful,
 * otherwise NULL
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
agenticros_msgs__srv__FollowMeStop_Request *
agenticros_msgs__srv__FollowMeStop_Request__create(void);

/// Destroy srv/FollowMeStop message.
/**
 * It calls
 * agenticros_msgs__srv__FollowMeStop_Request__fini()
 * and frees the memory of the message.
 * \param[in,out] msg The allocated message pointer.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
void
agenticros_msgs__srv__FollowMeStop_Request__destroy(agenticros_msgs__srv__FollowMeStop_Request * msg);

/// Check for srv/FollowMeStop message equality.
/**
 * \param[in] lhs The message on the left hand size of the equality operator.
 * \param[in] rhs The message on the right hand size of the equality operator.
 * \return true if messages are equal, otherwise false.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Request__are_equal(const agenticros_msgs__srv__FollowMeStop_Request * lhs, const agenticros_msgs__srv__FollowMeStop_Request * rhs);

/// Copy a srv/FollowMeStop message.
/**
 * This functions performs a deep copy, as opposed to the shallow copy that
 * plain assignment yields.
 *
 * \param[in] input The source message pointer.
 * \param[out] output The target message pointer, which must
 *   have been initialized before calling this function.
 * \return true if successful, or false if either pointer is null
 *   or memory allocation fails.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Request__copy(
  const agenticros_msgs__srv__FollowMeStop_Request * input,
  agenticros_msgs__srv__FollowMeStop_Request * output);

/// Retrieve pointer to the hash of the description of this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeStop_Request__get_type_hash(
  const rosidl_message_type_support_t * type_support);

/// Retrieve pointer to the description of this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__FollowMeStop_Request__get_type_description(
  const rosidl_message_type_support_t * type_support);

/// Retrieve pointer to the single raw source text that defined this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeStop_Request__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support);

/// Retrieve pointer to the recursive raw sources that defined the description of this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeStop_Request__get_type_description_sources(
  const rosidl_message_type_support_t * type_support);

/// Initialize array of srv/FollowMeStop messages.
/**
 * It allocates the memory for the number of elements and calls
 * agenticros_msgs__srv__FollowMeStop_Request__init()
 * for each element of the array.
 * \param[in,out] array The allocated array pointer.
 * \param[in] size The size / capacity of the array.
 * \return true if initialization was successful, otherwise false
 * If the array pointer is valid and the size is zero it is guaranteed
 # to return true.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Request__Sequence__init(agenticros_msgs__srv__FollowMeStop_Request__Sequence * array, size_t size);

/// Finalize array of srv/FollowMeStop messages.
/**
 * It calls
 * agenticros_msgs__srv__FollowMeStop_Request__fini()
 * for each element of the array and frees the memory for the number of
 * elements.
 * \param[in,out] array The initialized array pointer.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
void
agenticros_msgs__srv__FollowMeStop_Request__Sequence__fini(agenticros_msgs__srv__FollowMeStop_Request__Sequence * array);

/// Create array of srv/FollowMeStop messages.
/**
 * It allocates the memory for the array and calls
 * agenticros_msgs__srv__FollowMeStop_Request__Sequence__init().
 * \param[in] size The size / capacity of the array.
 * \return The pointer to the initialized array if successful, otherwise NULL
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
agenticros_msgs__srv__FollowMeStop_Request__Sequence *
agenticros_msgs__srv__FollowMeStop_Request__Sequence__create(size_t size);

/// Destroy array of srv/FollowMeStop messages.
/**
 * It calls
 * agenticros_msgs__srv__FollowMeStop_Request__Sequence__fini()
 * on the array,
 * and frees the memory of the array.
 * \param[in,out] array The initialized array pointer.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
void
agenticros_msgs__srv__FollowMeStop_Request__Sequence__destroy(agenticros_msgs__srv__FollowMeStop_Request__Sequence * array);

/// Check for srv/FollowMeStop message array equality.
/**
 * \param[in] lhs The message array on the left hand size of the equality operator.
 * \param[in] rhs The message array on the right hand size of the equality operator.
 * \return true if message arrays are equal in size and content, otherwise false.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Request__Sequence__are_equal(const agenticros_msgs__srv__FollowMeStop_Request__Sequence * lhs, const agenticros_msgs__srv__FollowMeStop_Request__Sequence * rhs);

/// Copy an array of srv/FollowMeStop messages.
/**
 * This functions performs a deep copy, as opposed to the shallow copy that
 * plain assignment yields.
 *
 * \param[in] input The source array pointer.
 * \param[out] output The target array pointer, which must
 *   have been initialized before calling this function.
 * \return true if successful, or false if either pointer
 *   is null or memory allocation fails.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Request__Sequence__copy(
  const agenticros_msgs__srv__FollowMeStop_Request__Sequence * input,
  agenticros_msgs__srv__FollowMeStop_Request__Sequence * output);

/// Initialize srv/FollowMeStop message.
/**
 * If the init function is called twice for the same message without
 * calling fini inbetween previously allocated memory will be leaked.
 * \param[in,out] msg The previously allocated message pointer.
 * Fields without a default value will not be initialized by this function.
 * You might want to call memset(msg, 0, sizeof(
 * agenticros_msgs__srv__FollowMeStop_Response
 * )) before or use
 * agenticros_msgs__srv__FollowMeStop_Response__create()
 * to allocate and initialize the message.
 * \return true if initialization was successful, otherwise false
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Response__init(agenticros_msgs__srv__FollowMeStop_Response * msg);

/// Finalize srv/FollowMeStop message.
/**
 * \param[in,out] msg The allocated message pointer.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
void
agenticros_msgs__srv__FollowMeStop_Response__fini(agenticros_msgs__srv__FollowMeStop_Response * msg);

/// Create srv/FollowMeStop message.
/**
 * It allocates the memory for the message, sets the memory to zero, and
 * calls
 * agenticros_msgs__srv__FollowMeStop_Response__init().
 * \return The pointer to the initialized message if successful,
 * otherwise NULL
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
agenticros_msgs__srv__FollowMeStop_Response *
agenticros_msgs__srv__FollowMeStop_Response__create(void);

/// Destroy srv/FollowMeStop message.
/**
 * It calls
 * agenticros_msgs__srv__FollowMeStop_Response__fini()
 * and frees the memory of the message.
 * \param[in,out] msg The allocated message pointer.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
void
agenticros_msgs__srv__FollowMeStop_Response__destroy(agenticros_msgs__srv__FollowMeStop_Response * msg);

/// Check for srv/FollowMeStop message equality.
/**
 * \param[in] lhs The message on the left hand size of the equality operator.
 * \param[in] rhs The message on the right hand size of the equality operator.
 * \return true if messages are equal, otherwise false.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Response__are_equal(const agenticros_msgs__srv__FollowMeStop_Response * lhs, const agenticros_msgs__srv__FollowMeStop_Response * rhs);

/// Copy a srv/FollowMeStop message.
/**
 * This functions performs a deep copy, as opposed to the shallow copy that
 * plain assignment yields.
 *
 * \param[in] input The source message pointer.
 * \param[out] output The target message pointer, which must
 *   have been initialized before calling this function.
 * \return true if successful, or false if either pointer is null
 *   or memory allocation fails.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Response__copy(
  const agenticros_msgs__srv__FollowMeStop_Response * input,
  agenticros_msgs__srv__FollowMeStop_Response * output);

/// Retrieve pointer to the hash of the description of this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeStop_Response__get_type_hash(
  const rosidl_message_type_support_t * type_support);

/// Retrieve pointer to the description of this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__FollowMeStop_Response__get_type_description(
  const rosidl_message_type_support_t * type_support);

/// Retrieve pointer to the single raw source text that defined this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeStop_Response__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support);

/// Retrieve pointer to the recursive raw sources that defined the description of this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeStop_Response__get_type_description_sources(
  const rosidl_message_type_support_t * type_support);

/// Initialize array of srv/FollowMeStop messages.
/**
 * It allocates the memory for the number of elements and calls
 * agenticros_msgs__srv__FollowMeStop_Response__init()
 * for each element of the array.
 * \param[in,out] array The allocated array pointer.
 * \param[in] size The size / capacity of the array.
 * \return true if initialization was successful, otherwise false
 * If the array pointer is valid and the size is zero it is guaranteed
 # to return true.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Response__Sequence__init(agenticros_msgs__srv__FollowMeStop_Response__Sequence * array, size_t size);

/// Finalize array of srv/FollowMeStop messages.
/**
 * It calls
 * agenticros_msgs__srv__FollowMeStop_Response__fini()
 * for each element of the array and frees the memory for the number of
 * elements.
 * \param[in,out] array The initialized array pointer.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
void
agenticros_msgs__srv__FollowMeStop_Response__Sequence__fini(agenticros_msgs__srv__FollowMeStop_Response__Sequence * array);

/// Create array of srv/FollowMeStop messages.
/**
 * It allocates the memory for the array and calls
 * agenticros_msgs__srv__FollowMeStop_Response__Sequence__init().
 * \param[in] size The size / capacity of the array.
 * \return The pointer to the initialized array if successful, otherwise NULL
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
agenticros_msgs__srv__FollowMeStop_Response__Sequence *
agenticros_msgs__srv__FollowMeStop_Response__Sequence__create(size_t size);

/// Destroy array of srv/FollowMeStop messages.
/**
 * It calls
 * agenticros_msgs__srv__FollowMeStop_Response__Sequence__fini()
 * on the array,
 * and frees the memory of the array.
 * \param[in,out] array The initialized array pointer.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
void
agenticros_msgs__srv__FollowMeStop_Response__Sequence__destroy(agenticros_msgs__srv__FollowMeStop_Response__Sequence * array);

/// Check for srv/FollowMeStop message array equality.
/**
 * \param[in] lhs The message array on the left hand size of the equality operator.
 * \param[in] rhs The message array on the right hand size of the equality operator.
 * \return true if message arrays are equal in size and content, otherwise false.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Response__Sequence__are_equal(const agenticros_msgs__srv__FollowMeStop_Response__Sequence * lhs, const agenticros_msgs__srv__FollowMeStop_Response__Sequence * rhs);

/// Copy an array of srv/FollowMeStop messages.
/**
 * This functions performs a deep copy, as opposed to the shallow copy that
 * plain assignment yields.
 *
 * \param[in] input The source array pointer.
 * \param[out] output The target array pointer, which must
 *   have been initialized before calling this function.
 * \return true if successful, or false if either pointer
 *   is null or memory allocation fails.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Response__Sequence__copy(
  const agenticros_msgs__srv__FollowMeStop_Response__Sequence * input,
  agenticros_msgs__srv__FollowMeStop_Response__Sequence * output);

/// Initialize srv/FollowMeStop message.
/**
 * If the init function is called twice for the same message without
 * calling fini inbetween previously allocated memory will be leaked.
 * \param[in,out] msg The previously allocated message pointer.
 * Fields without a default value will not be initialized by this function.
 * You might want to call memset(msg, 0, sizeof(
 * agenticros_msgs__srv__FollowMeStop_Event
 * )) before or use
 * agenticros_msgs__srv__FollowMeStop_Event__create()
 * to allocate and initialize the message.
 * \return true if initialization was successful, otherwise false
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Event__init(agenticros_msgs__srv__FollowMeStop_Event * msg);

/// Finalize srv/FollowMeStop message.
/**
 * \param[in,out] msg The allocated message pointer.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
void
agenticros_msgs__srv__FollowMeStop_Event__fini(agenticros_msgs__srv__FollowMeStop_Event * msg);

/// Create srv/FollowMeStop message.
/**
 * It allocates the memory for the message, sets the memory to zero, and
 * calls
 * agenticros_msgs__srv__FollowMeStop_Event__init().
 * \return The pointer to the initialized message if successful,
 * otherwise NULL
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
agenticros_msgs__srv__FollowMeStop_Event *
agenticros_msgs__srv__FollowMeStop_Event__create(void);

/// Destroy srv/FollowMeStop message.
/**
 * It calls
 * agenticros_msgs__srv__FollowMeStop_Event__fini()
 * and frees the memory of the message.
 * \param[in,out] msg The allocated message pointer.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
void
agenticros_msgs__srv__FollowMeStop_Event__destroy(agenticros_msgs__srv__FollowMeStop_Event * msg);

/// Check for srv/FollowMeStop message equality.
/**
 * \param[in] lhs The message on the left hand size of the equality operator.
 * \param[in] rhs The message on the right hand size of the equality operator.
 * \return true if messages are equal, otherwise false.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Event__are_equal(const agenticros_msgs__srv__FollowMeStop_Event * lhs, const agenticros_msgs__srv__FollowMeStop_Event * rhs);

/// Copy a srv/FollowMeStop message.
/**
 * This functions performs a deep copy, as opposed to the shallow copy that
 * plain assignment yields.
 *
 * \param[in] input The source message pointer.
 * \param[out] output The target message pointer, which must
 *   have been initialized before calling this function.
 * \return true if successful, or false if either pointer is null
 *   or memory allocation fails.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Event__copy(
  const agenticros_msgs__srv__FollowMeStop_Event * input,
  agenticros_msgs__srv__FollowMeStop_Event * output);

/// Retrieve pointer to the hash of the description of this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeStop_Event__get_type_hash(
  const rosidl_message_type_support_t * type_support);

/// Retrieve pointer to the description of this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__FollowMeStop_Event__get_type_description(
  const rosidl_message_type_support_t * type_support);

/// Retrieve pointer to the single raw source text that defined this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeStop_Event__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support);

/// Retrieve pointer to the recursive raw sources that defined the description of this type.
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeStop_Event__get_type_description_sources(
  const rosidl_message_type_support_t * type_support);

/// Initialize array of srv/FollowMeStop messages.
/**
 * It allocates the memory for the number of elements and calls
 * agenticros_msgs__srv__FollowMeStop_Event__init()
 * for each element of the array.
 * \param[in,out] array The allocated array pointer.
 * \param[in] size The size / capacity of the array.
 * \return true if initialization was successful, otherwise false
 * If the array pointer is valid and the size is zero it is guaranteed
 # to return true.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Event__Sequence__init(agenticros_msgs__srv__FollowMeStop_Event__Sequence * array, size_t size);

/// Finalize array of srv/FollowMeStop messages.
/**
 * It calls
 * agenticros_msgs__srv__FollowMeStop_Event__fini()
 * for each element of the array and frees the memory for the number of
 * elements.
 * \param[in,out] array The initialized array pointer.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
void
agenticros_msgs__srv__FollowMeStop_Event__Sequence__fini(agenticros_msgs__srv__FollowMeStop_Event__Sequence * array);

/// Create array of srv/FollowMeStop messages.
/**
 * It allocates the memory for the array and calls
 * agenticros_msgs__srv__FollowMeStop_Event__Sequence__init().
 * \param[in] size The size / capacity of the array.
 * \return The pointer to the initialized array if successful, otherwise NULL
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
agenticros_msgs__srv__FollowMeStop_Event__Sequence *
agenticros_msgs__srv__FollowMeStop_Event__Sequence__create(size_t size);

/// Destroy array of srv/FollowMeStop messages.
/**
 * It calls
 * agenticros_msgs__srv__FollowMeStop_Event__Sequence__fini()
 * on the array,
 * and frees the memory of the array.
 * \param[in,out] array The initialized array pointer.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
void
agenticros_msgs__srv__FollowMeStop_Event__Sequence__destroy(agenticros_msgs__srv__FollowMeStop_Event__Sequence * array);

/// Check for srv/FollowMeStop message array equality.
/**
 * \param[in] lhs The message array on the left hand size of the equality operator.
 * \param[in] rhs The message array on the right hand size of the equality operator.
 * \return true if message arrays are equal in size and content, otherwise false.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Event__Sequence__are_equal(const agenticros_msgs__srv__FollowMeStop_Event__Sequence * lhs, const agenticros_msgs__srv__FollowMeStop_Event__Sequence * rhs);

/// Copy an array of srv/FollowMeStop messages.
/**
 * This functions performs a deep copy, as opposed to the shallow copy that
 * plain assignment yields.
 *
 * \param[in] input The source array pointer.
 * \param[out] output The target array pointer, which must
 *   have been initialized before calling this function.
 * \return true if successful, or false if either pointer
 *   is null or memory allocation fails.
 */
ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
bool
agenticros_msgs__srv__FollowMeStop_Event__Sequence__copy(
  const agenticros_msgs__srv__FollowMeStop_Event__Sequence * input,
  agenticros_msgs__srv__FollowMeStop_Event__Sequence * output);
#ifdef __cplusplus
}
#endif

#endif  // AGENTICROS_MSGS__SRV__DETAIL__FOLLOW_ME_STOP__FUNCTIONS_H_
