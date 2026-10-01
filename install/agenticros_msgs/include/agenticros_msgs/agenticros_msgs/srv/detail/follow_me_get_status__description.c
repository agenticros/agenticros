// generated from rosidl_generator_c/resource/idl__description.c.em
// with input from agenticros_msgs:srv/FollowMeGetStatus.idl
// generated code does not contain a copyright notice

#include "agenticros_msgs/srv/detail/follow_me_get_status__functions.h"

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeGetStatus__get_type_hash(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x64, 0x10, 0x5d, 0x57, 0x47, 0xdf, 0x44, 0x6b,
      0x5c, 0x18, 0xa7, 0xcd, 0x72, 0x3c, 0xa8, 0x33,
      0xa6, 0xd1, 0x60, 0x38, 0x01, 0x8b, 0x7f, 0x52,
      0xda, 0x37, 0xc6, 0x7c, 0xe2, 0xef, 0x29, 0xf1,
    }};
  return &hash;
}

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeGetStatus_Request__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x50, 0x69, 0xbb, 0xf8, 0xd4, 0x25, 0x65, 0xe0,
      0x01, 0x93, 0x2a, 0x06, 0x41, 0xb5, 0x48, 0x8f,
      0xce, 0x73, 0x09, 0x70, 0x1c, 0xdf, 0x64, 0xa9,
      0x23, 0xb1, 0xf1, 0xc5, 0x2b, 0x70, 0x63, 0xa4,
    }};
  return &hash;
}

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeGetStatus_Response__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x5b, 0x88, 0x45, 0x23, 0xea, 0xc3, 0x6d, 0x79,
      0x56, 0x83, 0x62, 0x6a, 0x36, 0xb4, 0x23, 0xa8,
      0x36, 0xe6, 0x4d, 0xf5, 0x3d, 0x45, 0x6e, 0x7d,
      0x5b, 0x75, 0xbd, 0x6c, 0xc6, 0x13, 0x4b, 0xd1,
    }};
  return &hash;
}

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeGetStatus_Event__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x6d, 0x55, 0xfd, 0x58, 0xd1, 0xc0, 0x5c, 0x32,
      0xe0, 0x77, 0x24, 0x99, 0x89, 0x8f, 0x03, 0xb4,
      0x4c, 0x8b, 0x9c, 0xd5, 0xf1, 0x46, 0x96, 0x43,
      0x96, 0x47, 0x9c, 0x5a, 0xae, 0xf8, 0x73, 0xc6,
    }};
  return &hash;
}

#include <assert.h>
#include <string.h>

// Include directives for referenced types
#include "geometry_msgs/msg/detail/vector3__functions.h"
#include "service_msgs/msg/detail/service_event_info__functions.h"
#include "geometry_msgs/msg/detail/twist__functions.h"
#include "builtin_interfaces/msg/detail/time__functions.h"

// Hashes for external referenced types
#ifndef NDEBUG
static const rosidl_type_hash_t builtin_interfaces__msg__Time__EXPECTED_HASH = {1, {
    0xb1, 0x06, 0x23, 0x5e, 0x25, 0xa4, 0xc5, 0xed,
    0x35, 0x09, 0x8a, 0xa0, 0xa6, 0x1a, 0x3e, 0xe9,
    0xc9, 0xb1, 0x8d, 0x19, 0x7f, 0x39, 0x8b, 0x0e,
    0x42, 0x06, 0xce, 0xa9, 0xac, 0xf9, 0xc1, 0x97,
  }};
static const rosidl_type_hash_t geometry_msgs__msg__Twist__EXPECTED_HASH = {1, {
    0x9c, 0x45, 0xbf, 0x16, 0xfe, 0x09, 0x83, 0xd8,
    0x0e, 0x3c, 0xfe, 0x75, 0x0d, 0x68, 0x35, 0x84,
    0x3d, 0x26, 0x5a, 0x9a, 0x6c, 0x46, 0xbd, 0x2e,
    0x60, 0x9f, 0xcd, 0xdd, 0xe6, 0xfb, 0x8d, 0x2a,
  }};
static const rosidl_type_hash_t geometry_msgs__msg__Vector3__EXPECTED_HASH = {1, {
    0xcc, 0x12, 0xfe, 0x83, 0xe4, 0xc0, 0x27, 0x19,
    0xf1, 0xce, 0x80, 0x70, 0xbf, 0xd1, 0x4a, 0xec,
    0xd4, 0x0f, 0x75, 0xa9, 0x66, 0x96, 0xa6, 0x7a,
    0x2a, 0x1f, 0x37, 0xf7, 0xdb, 0xb0, 0x76, 0x5d,
  }};
static const rosidl_type_hash_t service_msgs__msg__ServiceEventInfo__EXPECTED_HASH = {1, {
    0x41, 0xbc, 0xbb, 0xe0, 0x7a, 0x75, 0xc9, 0xb5,
    0x2b, 0xc9, 0x6b, 0xfd, 0x5c, 0x24, 0xd7, 0xf0,
    0xfc, 0x0a, 0x08, 0xc0, 0xcb, 0x79, 0x21, 0xb3,
    0x37, 0x3c, 0x57, 0x32, 0x34, 0x5a, 0x6f, 0x45,
  }};
#endif

static char agenticros_msgs__srv__FollowMeGetStatus__TYPE_NAME[] = "agenticros_msgs/srv/FollowMeGetStatus";
static char agenticros_msgs__srv__FollowMeGetStatus_Event__TYPE_NAME[] = "agenticros_msgs/srv/FollowMeGetStatus_Event";
static char agenticros_msgs__srv__FollowMeGetStatus_Request__TYPE_NAME[] = "agenticros_msgs/srv/FollowMeGetStatus_Request";
static char agenticros_msgs__srv__FollowMeGetStatus_Response__TYPE_NAME[] = "agenticros_msgs/srv/FollowMeGetStatus_Response";
static char builtin_interfaces__msg__Time__TYPE_NAME[] = "builtin_interfaces/msg/Time";
static char geometry_msgs__msg__Twist__TYPE_NAME[] = "geometry_msgs/msg/Twist";
static char geometry_msgs__msg__Vector3__TYPE_NAME[] = "geometry_msgs/msg/Vector3";
static char service_msgs__msg__ServiceEventInfo__TYPE_NAME[] = "service_msgs/msg/ServiceEventInfo";

// Define type names, field names, and default values
static char agenticros_msgs__srv__FollowMeGetStatus__FIELD_NAME__request_message[] = "request_message";
static char agenticros_msgs__srv__FollowMeGetStatus__FIELD_NAME__response_message[] = "response_message";
static char agenticros_msgs__srv__FollowMeGetStatus__FIELD_NAME__event_message[] = "event_message";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__FollowMeGetStatus__FIELDS[] = {
  {
    {agenticros_msgs__srv__FollowMeGetStatus__FIELD_NAME__request_message, 15, 15},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__srv__FollowMeGetStatus_Request__TYPE_NAME, 45, 45},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus__FIELD_NAME__response_message, 16, 16},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__srv__FollowMeGetStatus_Response__TYPE_NAME, 46, 46},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus__FIELD_NAME__event_message, 13, 13},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__srv__FollowMeGetStatus_Event__TYPE_NAME, 43, 43},
    },
    {NULL, 0, 0},
  },
};

static rosidl_runtime_c__type_description__IndividualTypeDescription agenticros_msgs__srv__FollowMeGetStatus__REFERENCED_TYPE_DESCRIPTIONS[] = {
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Event__TYPE_NAME, 43, 43},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Request__TYPE_NAME, 45, 45},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__TYPE_NAME, 46, 46},
    {NULL, 0, 0},
  },
  {
    {builtin_interfaces__msg__Time__TYPE_NAME, 27, 27},
    {NULL, 0, 0},
  },
  {
    {geometry_msgs__msg__Twist__TYPE_NAME, 23, 23},
    {NULL, 0, 0},
  },
  {
    {geometry_msgs__msg__Vector3__TYPE_NAME, 25, 25},
    {NULL, 0, 0},
  },
  {
    {service_msgs__msg__ServiceEventInfo__TYPE_NAME, 33, 33},
    {NULL, 0, 0},
  },
};

const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__FollowMeGetStatus__get_type_description(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__FollowMeGetStatus__TYPE_NAME, 37, 37},
      {agenticros_msgs__srv__FollowMeGetStatus__FIELDS, 3, 3},
    },
    {agenticros_msgs__srv__FollowMeGetStatus__REFERENCED_TYPE_DESCRIPTIONS, 7, 7},
  };
  if (!constructed) {
    description.referenced_type_descriptions.data[0].fields = agenticros_msgs__srv__FollowMeGetStatus_Event__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[1].fields = agenticros_msgs__srv__FollowMeGetStatus_Request__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[2].fields = agenticros_msgs__srv__FollowMeGetStatus_Response__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&builtin_interfaces__msg__Time__EXPECTED_HASH, builtin_interfaces__msg__Time__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[3].fields = builtin_interfaces__msg__Time__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&geometry_msgs__msg__Twist__EXPECTED_HASH, geometry_msgs__msg__Twist__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[4].fields = geometry_msgs__msg__Twist__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&geometry_msgs__msg__Vector3__EXPECTED_HASH, geometry_msgs__msg__Vector3__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[5].fields = geometry_msgs__msg__Vector3__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&service_msgs__msg__ServiceEventInfo__EXPECTED_HASH, service_msgs__msg__ServiceEventInfo__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[6].fields = service_msgs__msg__ServiceEventInfo__get_type_description(NULL)->type_description.fields;
    constructed = true;
  }
  return &description;
}
// Define type names, field names, and default values
static char agenticros_msgs__srv__FollowMeGetStatus_Request__FIELD_NAME__structure_needs_at_least_one_member[] = "structure_needs_at_least_one_member";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__FollowMeGetStatus_Request__FIELDS[] = {
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Request__FIELD_NAME__structure_needs_at_least_one_member, 35, 35},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_UINT8,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
};

const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__FollowMeGetStatus_Request__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__FollowMeGetStatus_Request__TYPE_NAME, 45, 45},
      {agenticros_msgs__srv__FollowMeGetStatus_Request__FIELDS, 1, 1},
    },
    {NULL, 0, 0},
  };
  if (!constructed) {
    constructed = true;
  }
  return &description;
}
// Define type names, field names, and default values
static char agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__success[] = "success";
static char agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__enabled[] = "enabled";
static char agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__tracking[] = "tracking";
static char agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__target_distance[] = "target_distance";
static char agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__current_distance[] = "current_distance";
static char agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__target_person_id[] = "target_person_id";
static char agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__target_description[] = "target_description";
static char agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__persons_detected[] = "persons_detected";
static char agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__twist[] = "twist";
static char agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__error_message[] = "error_message";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__FollowMeGetStatus_Response__FIELDS[] = {
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__success, 7, 7},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_BOOLEAN,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__enabled, 7, 7},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_BOOLEAN,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__tracking, 8, 8},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_BOOLEAN,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__target_distance, 15, 15},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_FLOAT,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__current_distance, 16, 16},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_FLOAT,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__target_person_id, 16, 16},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_INT32,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__target_description, 18, 18},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__persons_detected, 16, 16},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_INT32,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__twist, 5, 5},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {geometry_msgs__msg__Twist__TYPE_NAME, 23, 23},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__FIELD_NAME__error_message, 13, 13},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
};

static rosidl_runtime_c__type_description__IndividualTypeDescription agenticros_msgs__srv__FollowMeGetStatus_Response__REFERENCED_TYPE_DESCRIPTIONS[] = {
  {
    {geometry_msgs__msg__Twist__TYPE_NAME, 23, 23},
    {NULL, 0, 0},
  },
  {
    {geometry_msgs__msg__Vector3__TYPE_NAME, 25, 25},
    {NULL, 0, 0},
  },
};

const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__FollowMeGetStatus_Response__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__FollowMeGetStatus_Response__TYPE_NAME, 46, 46},
      {agenticros_msgs__srv__FollowMeGetStatus_Response__FIELDS, 10, 10},
    },
    {agenticros_msgs__srv__FollowMeGetStatus_Response__REFERENCED_TYPE_DESCRIPTIONS, 2, 2},
  };
  if (!constructed) {
    assert(0 == memcmp(&geometry_msgs__msg__Twist__EXPECTED_HASH, geometry_msgs__msg__Twist__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[0].fields = geometry_msgs__msg__Twist__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&geometry_msgs__msg__Vector3__EXPECTED_HASH, geometry_msgs__msg__Vector3__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[1].fields = geometry_msgs__msg__Vector3__get_type_description(NULL)->type_description.fields;
    constructed = true;
  }
  return &description;
}
// Define type names, field names, and default values
static char agenticros_msgs__srv__FollowMeGetStatus_Event__FIELD_NAME__info[] = "info";
static char agenticros_msgs__srv__FollowMeGetStatus_Event__FIELD_NAME__request[] = "request";
static char agenticros_msgs__srv__FollowMeGetStatus_Event__FIELD_NAME__response[] = "response";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__FollowMeGetStatus_Event__FIELDS[] = {
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Event__FIELD_NAME__info, 4, 4},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {service_msgs__msg__ServiceEventInfo__TYPE_NAME, 33, 33},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Event__FIELD_NAME__request, 7, 7},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE_BOUNDED_SEQUENCE,
      1,
      0,
      {agenticros_msgs__srv__FollowMeGetStatus_Request__TYPE_NAME, 45, 45},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Event__FIELD_NAME__response, 8, 8},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE_BOUNDED_SEQUENCE,
      1,
      0,
      {agenticros_msgs__srv__FollowMeGetStatus_Response__TYPE_NAME, 46, 46},
    },
    {NULL, 0, 0},
  },
};

static rosidl_runtime_c__type_description__IndividualTypeDescription agenticros_msgs__srv__FollowMeGetStatus_Event__REFERENCED_TYPE_DESCRIPTIONS[] = {
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Request__TYPE_NAME, 45, 45},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__TYPE_NAME, 46, 46},
    {NULL, 0, 0},
  },
  {
    {builtin_interfaces__msg__Time__TYPE_NAME, 27, 27},
    {NULL, 0, 0},
  },
  {
    {geometry_msgs__msg__Twist__TYPE_NAME, 23, 23},
    {NULL, 0, 0},
  },
  {
    {geometry_msgs__msg__Vector3__TYPE_NAME, 25, 25},
    {NULL, 0, 0},
  },
  {
    {service_msgs__msg__ServiceEventInfo__TYPE_NAME, 33, 33},
    {NULL, 0, 0},
  },
};

const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__FollowMeGetStatus_Event__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__FollowMeGetStatus_Event__TYPE_NAME, 43, 43},
      {agenticros_msgs__srv__FollowMeGetStatus_Event__FIELDS, 3, 3},
    },
    {agenticros_msgs__srv__FollowMeGetStatus_Event__REFERENCED_TYPE_DESCRIPTIONS, 6, 6},
  };
  if (!constructed) {
    description.referenced_type_descriptions.data[0].fields = agenticros_msgs__srv__FollowMeGetStatus_Request__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[1].fields = agenticros_msgs__srv__FollowMeGetStatus_Response__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&builtin_interfaces__msg__Time__EXPECTED_HASH, builtin_interfaces__msg__Time__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[2].fields = builtin_interfaces__msg__Time__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&geometry_msgs__msg__Twist__EXPECTED_HASH, geometry_msgs__msg__Twist__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[3].fields = geometry_msgs__msg__Twist__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&geometry_msgs__msg__Vector3__EXPECTED_HASH, geometry_msgs__msg__Vector3__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[4].fields = geometry_msgs__msg__Vector3__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&service_msgs__msg__ServiceEventInfo__EXPECTED_HASH, service_msgs__msg__ServiceEventInfo__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[5].fields = service_msgs__msg__ServiceEventInfo__get_type_description(NULL)->type_description.fields;
    constructed = true;
  }
  return &description;
}

static char toplevel_type_raw_source[] =
  "---\n"
  "bool success\n"
  "bool enabled\n"
  "bool tracking\n"
  "float32 target_distance\n"
  "float32 current_distance\n"
  "int32 target_person_id\n"
  "string target_description\n"
  "int32 persons_detected\n"
  "geometry_msgs/Twist twist\n"
  "string error_message";

static char srv_encoding[] = "srv";
static char implicit_encoding[] = "implicit";

// Define all individual source functions

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeGetStatus__get_individual_type_description_source(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__FollowMeGetStatus__TYPE_NAME, 37, 37},
    {srv_encoding, 3, 3},
    {toplevel_type_raw_source, 212, 212},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeGetStatus_Request__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__FollowMeGetStatus_Request__TYPE_NAME, 45, 45},
    {implicit_encoding, 8, 8},
    {NULL, 0, 0},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeGetStatus_Response__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__FollowMeGetStatus_Response__TYPE_NAME, 46, 46},
    {implicit_encoding, 8, 8},
    {NULL, 0, 0},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeGetStatus_Event__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__FollowMeGetStatus_Event__TYPE_NAME, 43, 43},
    {implicit_encoding, 8, 8},
    {NULL, 0, 0},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeGetStatus__get_type_description_sources(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[8];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 8, 8};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__FollowMeGetStatus__get_individual_type_description_source(NULL),
    sources[1] = *agenticros_msgs__srv__FollowMeGetStatus_Event__get_individual_type_description_source(NULL);
    sources[2] = *agenticros_msgs__srv__FollowMeGetStatus_Request__get_individual_type_description_source(NULL);
    sources[3] = *agenticros_msgs__srv__FollowMeGetStatus_Response__get_individual_type_description_source(NULL);
    sources[4] = *builtin_interfaces__msg__Time__get_individual_type_description_source(NULL);
    sources[5] = *geometry_msgs__msg__Twist__get_individual_type_description_source(NULL);
    sources[6] = *geometry_msgs__msg__Vector3__get_individual_type_description_source(NULL);
    sources[7] = *service_msgs__msg__ServiceEventInfo__get_individual_type_description_source(NULL);
    constructed = true;
  }
  return &source_sequence;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeGetStatus_Request__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[1];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 1, 1};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__FollowMeGetStatus_Request__get_individual_type_description_source(NULL),
    constructed = true;
  }
  return &source_sequence;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeGetStatus_Response__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[3];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 3, 3};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__FollowMeGetStatus_Response__get_individual_type_description_source(NULL),
    sources[1] = *geometry_msgs__msg__Twist__get_individual_type_description_source(NULL);
    sources[2] = *geometry_msgs__msg__Vector3__get_individual_type_description_source(NULL);
    constructed = true;
  }
  return &source_sequence;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeGetStatus_Event__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[7];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 7, 7};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__FollowMeGetStatus_Event__get_individual_type_description_source(NULL),
    sources[1] = *agenticros_msgs__srv__FollowMeGetStatus_Request__get_individual_type_description_source(NULL);
    sources[2] = *agenticros_msgs__srv__FollowMeGetStatus_Response__get_individual_type_description_source(NULL);
    sources[3] = *builtin_interfaces__msg__Time__get_individual_type_description_source(NULL);
    sources[4] = *geometry_msgs__msg__Twist__get_individual_type_description_source(NULL);
    sources[5] = *geometry_msgs__msg__Vector3__get_individual_type_description_source(NULL);
    sources[6] = *service_msgs__msg__ServiceEventInfo__get_individual_type_description_source(NULL);
    constructed = true;
  }
  return &source_sequence;
}
