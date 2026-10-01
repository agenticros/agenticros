// generated from rosidl_generator_c/resource/idl__description.c.em
// with input from agenticros_msgs:srv/FollowMeStart.idl
// generated code does not contain a copyright notice

#include "agenticros_msgs/srv/detail/follow_me_start__functions.h"

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeStart__get_type_hash(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0xe6, 0x51, 0xfd, 0x39, 0x3a, 0x77, 0xae, 0x07,
      0x93, 0x46, 0xaa, 0xe2, 0x55, 0xa7, 0xb9, 0x1c,
      0x7e, 0xb9, 0xd8, 0xa7, 0x76, 0x26, 0x5e, 0x8d,
      0x35, 0x63, 0x45, 0x63, 0xec, 0x14, 0x68, 0xc5,
    }};
  return &hash;
}

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeStart_Request__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x8b, 0xf9, 0xfd, 0xb0, 0x9d, 0x4c, 0xdc, 0xe0,
      0xc6, 0x07, 0x43, 0x07, 0xa3, 0x53, 0xa2, 0xaa,
      0x88, 0x9c, 0xfd, 0xb7, 0xd8, 0xbd, 0xa0, 0x21,
      0x3d, 0xe4, 0x5b, 0x8b, 0xa5, 0xe9, 0xbf, 0x13,
    }};
  return &hash;
}

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeStart_Response__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x9c, 0x51, 0xbd, 0xa3, 0x9a, 0x44, 0xb3, 0xf0,
      0xf2, 0x0c, 0x7a, 0x5b, 0x20, 0x43, 0xfc, 0x5a,
      0xa0, 0x91, 0x5b, 0x5d, 0x35, 0x26, 0x99, 0x5e,
      0xff, 0x49, 0x4b, 0x13, 0x74, 0x20, 0x25, 0xf4,
    }};
  return &hash;
}

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeStart_Event__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x84, 0xc3, 0x9e, 0x0d, 0xde, 0x44, 0x08, 0xc5,
      0x07, 0xcb, 0x24, 0x40, 0xea, 0xf3, 0x95, 0xe3,
      0x54, 0xc8, 0xff, 0xb8, 0x4d, 0x2f, 0x28, 0xc0,
      0x48, 0xb8, 0x80, 0x48, 0xf9, 0x1b, 0x0e, 0xda,
    }};
  return &hash;
}

#include <assert.h>
#include <string.h>

// Include directives for referenced types
#include "service_msgs/msg/detail/service_event_info__functions.h"
#include "builtin_interfaces/msg/detail/time__functions.h"

// Hashes for external referenced types
#ifndef NDEBUG
static const rosidl_type_hash_t builtin_interfaces__msg__Time__EXPECTED_HASH = {1, {
    0xb1, 0x06, 0x23, 0x5e, 0x25, 0xa4, 0xc5, 0xed,
    0x35, 0x09, 0x8a, 0xa0, 0xa6, 0x1a, 0x3e, 0xe9,
    0xc9, 0xb1, 0x8d, 0x19, 0x7f, 0x39, 0x8b, 0x0e,
    0x42, 0x06, 0xce, 0xa9, 0xac, 0xf9, 0xc1, 0x97,
  }};
static const rosidl_type_hash_t service_msgs__msg__ServiceEventInfo__EXPECTED_HASH = {1, {
    0x41, 0xbc, 0xbb, 0xe0, 0x7a, 0x75, 0xc9, 0xb5,
    0x2b, 0xc9, 0x6b, 0xfd, 0x5c, 0x24, 0xd7, 0xf0,
    0xfc, 0x0a, 0x08, 0xc0, 0xcb, 0x79, 0x21, 0xb3,
    0x37, 0x3c, 0x57, 0x32, 0x34, 0x5a, 0x6f, 0x45,
  }};
#endif

static char agenticros_msgs__srv__FollowMeStart__TYPE_NAME[] = "agenticros_msgs/srv/FollowMeStart";
static char agenticros_msgs__srv__FollowMeStart_Event__TYPE_NAME[] = "agenticros_msgs/srv/FollowMeStart_Event";
static char agenticros_msgs__srv__FollowMeStart_Request__TYPE_NAME[] = "agenticros_msgs/srv/FollowMeStart_Request";
static char agenticros_msgs__srv__FollowMeStart_Response__TYPE_NAME[] = "agenticros_msgs/srv/FollowMeStart_Response";
static char builtin_interfaces__msg__Time__TYPE_NAME[] = "builtin_interfaces/msg/Time";
static char service_msgs__msg__ServiceEventInfo__TYPE_NAME[] = "service_msgs/msg/ServiceEventInfo";

// Define type names, field names, and default values
static char agenticros_msgs__srv__FollowMeStart__FIELD_NAME__request_message[] = "request_message";
static char agenticros_msgs__srv__FollowMeStart__FIELD_NAME__response_message[] = "response_message";
static char agenticros_msgs__srv__FollowMeStart__FIELD_NAME__event_message[] = "event_message";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__FollowMeStart__FIELDS[] = {
  {
    {agenticros_msgs__srv__FollowMeStart__FIELD_NAME__request_message, 15, 15},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__srv__FollowMeStart_Request__TYPE_NAME, 41, 41},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStart__FIELD_NAME__response_message, 16, 16},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__srv__FollowMeStart_Response__TYPE_NAME, 42, 42},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStart__FIELD_NAME__event_message, 13, 13},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__srv__FollowMeStart_Event__TYPE_NAME, 39, 39},
    },
    {NULL, 0, 0},
  },
};

static rosidl_runtime_c__type_description__IndividualTypeDescription agenticros_msgs__srv__FollowMeStart__REFERENCED_TYPE_DESCRIPTIONS[] = {
  {
    {agenticros_msgs__srv__FollowMeStart_Event__TYPE_NAME, 39, 39},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStart_Request__TYPE_NAME, 41, 41},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStart_Response__TYPE_NAME, 42, 42},
    {NULL, 0, 0},
  },
  {
    {builtin_interfaces__msg__Time__TYPE_NAME, 27, 27},
    {NULL, 0, 0},
  },
  {
    {service_msgs__msg__ServiceEventInfo__TYPE_NAME, 33, 33},
    {NULL, 0, 0},
  },
};

const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__FollowMeStart__get_type_description(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__FollowMeStart__TYPE_NAME, 33, 33},
      {agenticros_msgs__srv__FollowMeStart__FIELDS, 3, 3},
    },
    {agenticros_msgs__srv__FollowMeStart__REFERENCED_TYPE_DESCRIPTIONS, 5, 5},
  };
  if (!constructed) {
    description.referenced_type_descriptions.data[0].fields = agenticros_msgs__srv__FollowMeStart_Event__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[1].fields = agenticros_msgs__srv__FollowMeStart_Request__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[2].fields = agenticros_msgs__srv__FollowMeStart_Response__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&builtin_interfaces__msg__Time__EXPECTED_HASH, builtin_interfaces__msg__Time__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[3].fields = builtin_interfaces__msg__Time__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&service_msgs__msg__ServiceEventInfo__EXPECTED_HASH, service_msgs__msg__ServiceEventInfo__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[4].fields = service_msgs__msg__ServiceEventInfo__get_type_description(NULL)->type_description.fields;
    constructed = true;
  }
  return &description;
}
// Define type names, field names, and default values
static char agenticros_msgs__srv__FollowMeStart_Request__FIELD_NAME__target_description[] = "target_description";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__FollowMeStart_Request__FIELDS[] = {
  {
    {agenticros_msgs__srv__FollowMeStart_Request__FIELD_NAME__target_description, 18, 18},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
};

const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__FollowMeStart_Request__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__FollowMeStart_Request__TYPE_NAME, 41, 41},
      {agenticros_msgs__srv__FollowMeStart_Request__FIELDS, 1, 1},
    },
    {NULL, 0, 0},
  };
  if (!constructed) {
    constructed = true;
  }
  return &description;
}
// Define type names, field names, and default values
static char agenticros_msgs__srv__FollowMeStart_Response__FIELD_NAME__success[] = "success";
static char agenticros_msgs__srv__FollowMeStart_Response__FIELD_NAME__message[] = "message";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__FollowMeStart_Response__FIELDS[] = {
  {
    {agenticros_msgs__srv__FollowMeStart_Response__FIELD_NAME__success, 7, 7},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_BOOLEAN,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStart_Response__FIELD_NAME__message, 7, 7},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
};

const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__FollowMeStart_Response__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__FollowMeStart_Response__TYPE_NAME, 42, 42},
      {agenticros_msgs__srv__FollowMeStart_Response__FIELDS, 2, 2},
    },
    {NULL, 0, 0},
  };
  if (!constructed) {
    constructed = true;
  }
  return &description;
}
// Define type names, field names, and default values
static char agenticros_msgs__srv__FollowMeStart_Event__FIELD_NAME__info[] = "info";
static char agenticros_msgs__srv__FollowMeStart_Event__FIELD_NAME__request[] = "request";
static char agenticros_msgs__srv__FollowMeStart_Event__FIELD_NAME__response[] = "response";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__FollowMeStart_Event__FIELDS[] = {
  {
    {agenticros_msgs__srv__FollowMeStart_Event__FIELD_NAME__info, 4, 4},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {service_msgs__msg__ServiceEventInfo__TYPE_NAME, 33, 33},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStart_Event__FIELD_NAME__request, 7, 7},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE_BOUNDED_SEQUENCE,
      1,
      0,
      {agenticros_msgs__srv__FollowMeStart_Request__TYPE_NAME, 41, 41},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStart_Event__FIELD_NAME__response, 8, 8},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE_BOUNDED_SEQUENCE,
      1,
      0,
      {agenticros_msgs__srv__FollowMeStart_Response__TYPE_NAME, 42, 42},
    },
    {NULL, 0, 0},
  },
};

static rosidl_runtime_c__type_description__IndividualTypeDescription agenticros_msgs__srv__FollowMeStart_Event__REFERENCED_TYPE_DESCRIPTIONS[] = {
  {
    {agenticros_msgs__srv__FollowMeStart_Request__TYPE_NAME, 41, 41},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStart_Response__TYPE_NAME, 42, 42},
    {NULL, 0, 0},
  },
  {
    {builtin_interfaces__msg__Time__TYPE_NAME, 27, 27},
    {NULL, 0, 0},
  },
  {
    {service_msgs__msg__ServiceEventInfo__TYPE_NAME, 33, 33},
    {NULL, 0, 0},
  },
};

const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__FollowMeStart_Event__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__FollowMeStart_Event__TYPE_NAME, 39, 39},
      {agenticros_msgs__srv__FollowMeStart_Event__FIELDS, 3, 3},
    },
    {agenticros_msgs__srv__FollowMeStart_Event__REFERENCED_TYPE_DESCRIPTIONS, 4, 4},
  };
  if (!constructed) {
    description.referenced_type_descriptions.data[0].fields = agenticros_msgs__srv__FollowMeStart_Request__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[1].fields = agenticros_msgs__srv__FollowMeStart_Response__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&builtin_interfaces__msg__Time__EXPECTED_HASH, builtin_interfaces__msg__Time__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[2].fields = builtin_interfaces__msg__Time__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&service_msgs__msg__ServiceEventInfo__EXPECTED_HASH, service_msgs__msg__ServiceEventInfo__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[3].fields = service_msgs__msg__ServiceEventInfo__get_type_description(NULL)->type_description.fields;
    constructed = true;
  }
  return &description;
}

static char toplevel_type_raw_source[] =
  "# Start following. Empty target_description = follow closest person.\n"
  "string target_description\n"
  "---\n"
  "bool success\n"
  "string message";

static char srv_encoding[] = "srv";
static char implicit_encoding[] = "implicit";

// Define all individual source functions

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeStart__get_individual_type_description_source(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__FollowMeStart__TYPE_NAME, 33, 33},
    {srv_encoding, 3, 3},
    {toplevel_type_raw_source, 127, 127},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeStart_Request__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__FollowMeStart_Request__TYPE_NAME, 41, 41},
    {implicit_encoding, 8, 8},
    {NULL, 0, 0},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeStart_Response__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__FollowMeStart_Response__TYPE_NAME, 42, 42},
    {implicit_encoding, 8, 8},
    {NULL, 0, 0},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeStart_Event__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__FollowMeStart_Event__TYPE_NAME, 39, 39},
    {implicit_encoding, 8, 8},
    {NULL, 0, 0},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeStart__get_type_description_sources(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[6];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 6, 6};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__FollowMeStart__get_individual_type_description_source(NULL),
    sources[1] = *agenticros_msgs__srv__FollowMeStart_Event__get_individual_type_description_source(NULL);
    sources[2] = *agenticros_msgs__srv__FollowMeStart_Request__get_individual_type_description_source(NULL);
    sources[3] = *agenticros_msgs__srv__FollowMeStart_Response__get_individual_type_description_source(NULL);
    sources[4] = *builtin_interfaces__msg__Time__get_individual_type_description_source(NULL);
    sources[5] = *service_msgs__msg__ServiceEventInfo__get_individual_type_description_source(NULL);
    constructed = true;
  }
  return &source_sequence;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeStart_Request__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[1];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 1, 1};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__FollowMeStart_Request__get_individual_type_description_source(NULL),
    constructed = true;
  }
  return &source_sequence;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeStart_Response__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[1];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 1, 1};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__FollowMeStart_Response__get_individual_type_description_source(NULL),
    constructed = true;
  }
  return &source_sequence;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeStart_Event__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[5];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 5, 5};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__FollowMeStart_Event__get_individual_type_description_source(NULL),
    sources[1] = *agenticros_msgs__srv__FollowMeStart_Request__get_individual_type_description_source(NULL);
    sources[2] = *agenticros_msgs__srv__FollowMeStart_Response__get_individual_type_description_source(NULL);
    sources[3] = *builtin_interfaces__msg__Time__get_individual_type_description_source(NULL);
    sources[4] = *service_msgs__msg__ServiceEventInfo__get_individual_type_description_source(NULL);
    constructed = true;
  }
  return &source_sequence;
}
