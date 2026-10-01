// generated from rosidl_generator_c/resource/idl__description.c.em
// with input from agenticros_msgs:srv/FollowMeStop.idl
// generated code does not contain a copyright notice

#include "agenticros_msgs/srv/detail/follow_me_stop__functions.h"

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeStop__get_type_hash(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0xc5, 0xa8, 0x84, 0x4e, 0x0b, 0x08, 0xe5, 0x2d,
      0xbd, 0xf0, 0x1c, 0xaf, 0x10, 0xd3, 0x98, 0x6a,
      0xb4, 0x09, 0x1c, 0xb5, 0xda, 0x79, 0x93, 0xcb,
      0x7a, 0x44, 0x76, 0x7e, 0x27, 0xcb, 0x6d, 0xd1,
    }};
  return &hash;
}

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeStop_Request__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0xcb, 0x28, 0x15, 0x55, 0x52, 0xed, 0x46, 0xc6,
      0xf0, 0xec, 0xbd, 0x00, 0xe7, 0xdb, 0xd6, 0xd5,
      0x72, 0x57, 0xca, 0x7c, 0xaf, 0x37, 0x5b, 0xbd,
      0xa3, 0xfc, 0x39, 0x7f, 0xa1, 0x5e, 0x54, 0x72,
    }};
  return &hash;
}

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeStop_Response__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x66, 0xcf, 0xc6, 0xb6, 0x44, 0x68, 0x47, 0x7f,
      0xa9, 0x1a, 0xe0, 0x25, 0x8a, 0x99, 0x67, 0xbe,
      0x84, 0x25, 0x36, 0x39, 0x5e, 0x76, 0xa3, 0x54,
      0x15, 0x56, 0xcd, 0x6d, 0x2f, 0xf1, 0x11, 0x1d,
    }};
  return &hash;
}

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__FollowMeStop_Event__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x31, 0xea, 0x96, 0xfc, 0x84, 0x74, 0x6a, 0xbf,
      0xf2, 0x13, 0x14, 0xca, 0xf1, 0xa2, 0x99, 0x55,
      0x54, 0xb7, 0x26, 0x64, 0x12, 0x4a, 0x90, 0x85,
      0x79, 0xf0, 0xff, 0xab, 0xfb, 0xfc, 0xfd, 0x76,
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

static char agenticros_msgs__srv__FollowMeStop__TYPE_NAME[] = "agenticros_msgs/srv/FollowMeStop";
static char agenticros_msgs__srv__FollowMeStop_Event__TYPE_NAME[] = "agenticros_msgs/srv/FollowMeStop_Event";
static char agenticros_msgs__srv__FollowMeStop_Request__TYPE_NAME[] = "agenticros_msgs/srv/FollowMeStop_Request";
static char agenticros_msgs__srv__FollowMeStop_Response__TYPE_NAME[] = "agenticros_msgs/srv/FollowMeStop_Response";
static char builtin_interfaces__msg__Time__TYPE_NAME[] = "builtin_interfaces/msg/Time";
static char service_msgs__msg__ServiceEventInfo__TYPE_NAME[] = "service_msgs/msg/ServiceEventInfo";

// Define type names, field names, and default values
static char agenticros_msgs__srv__FollowMeStop__FIELD_NAME__request_message[] = "request_message";
static char agenticros_msgs__srv__FollowMeStop__FIELD_NAME__response_message[] = "response_message";
static char agenticros_msgs__srv__FollowMeStop__FIELD_NAME__event_message[] = "event_message";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__FollowMeStop__FIELDS[] = {
  {
    {agenticros_msgs__srv__FollowMeStop__FIELD_NAME__request_message, 15, 15},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__srv__FollowMeStop_Request__TYPE_NAME, 40, 40},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStop__FIELD_NAME__response_message, 16, 16},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__srv__FollowMeStop_Response__TYPE_NAME, 41, 41},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStop__FIELD_NAME__event_message, 13, 13},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__srv__FollowMeStop_Event__TYPE_NAME, 38, 38},
    },
    {NULL, 0, 0},
  },
};

static rosidl_runtime_c__type_description__IndividualTypeDescription agenticros_msgs__srv__FollowMeStop__REFERENCED_TYPE_DESCRIPTIONS[] = {
  {
    {agenticros_msgs__srv__FollowMeStop_Event__TYPE_NAME, 38, 38},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStop_Request__TYPE_NAME, 40, 40},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStop_Response__TYPE_NAME, 41, 41},
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
agenticros_msgs__srv__FollowMeStop__get_type_description(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__FollowMeStop__TYPE_NAME, 32, 32},
      {agenticros_msgs__srv__FollowMeStop__FIELDS, 3, 3},
    },
    {agenticros_msgs__srv__FollowMeStop__REFERENCED_TYPE_DESCRIPTIONS, 5, 5},
  };
  if (!constructed) {
    description.referenced_type_descriptions.data[0].fields = agenticros_msgs__srv__FollowMeStop_Event__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[1].fields = agenticros_msgs__srv__FollowMeStop_Request__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[2].fields = agenticros_msgs__srv__FollowMeStop_Response__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&builtin_interfaces__msg__Time__EXPECTED_HASH, builtin_interfaces__msg__Time__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[3].fields = builtin_interfaces__msg__Time__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&service_msgs__msg__ServiceEventInfo__EXPECTED_HASH, service_msgs__msg__ServiceEventInfo__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[4].fields = service_msgs__msg__ServiceEventInfo__get_type_description(NULL)->type_description.fields;
    constructed = true;
  }
  return &description;
}
// Define type names, field names, and default values
static char agenticros_msgs__srv__FollowMeStop_Request__FIELD_NAME__structure_needs_at_least_one_member[] = "structure_needs_at_least_one_member";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__FollowMeStop_Request__FIELDS[] = {
  {
    {agenticros_msgs__srv__FollowMeStop_Request__FIELD_NAME__structure_needs_at_least_one_member, 35, 35},
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
agenticros_msgs__srv__FollowMeStop_Request__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__FollowMeStop_Request__TYPE_NAME, 40, 40},
      {agenticros_msgs__srv__FollowMeStop_Request__FIELDS, 1, 1},
    },
    {NULL, 0, 0},
  };
  if (!constructed) {
    constructed = true;
  }
  return &description;
}
// Define type names, field names, and default values
static char agenticros_msgs__srv__FollowMeStop_Response__FIELD_NAME__success[] = "success";
static char agenticros_msgs__srv__FollowMeStop_Response__FIELD_NAME__message[] = "message";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__FollowMeStop_Response__FIELDS[] = {
  {
    {agenticros_msgs__srv__FollowMeStop_Response__FIELD_NAME__success, 7, 7},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_BOOLEAN,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStop_Response__FIELD_NAME__message, 7, 7},
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
agenticros_msgs__srv__FollowMeStop_Response__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__FollowMeStop_Response__TYPE_NAME, 41, 41},
      {agenticros_msgs__srv__FollowMeStop_Response__FIELDS, 2, 2},
    },
    {NULL, 0, 0},
  };
  if (!constructed) {
    constructed = true;
  }
  return &description;
}
// Define type names, field names, and default values
static char agenticros_msgs__srv__FollowMeStop_Event__FIELD_NAME__info[] = "info";
static char agenticros_msgs__srv__FollowMeStop_Event__FIELD_NAME__request[] = "request";
static char agenticros_msgs__srv__FollowMeStop_Event__FIELD_NAME__response[] = "response";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__FollowMeStop_Event__FIELDS[] = {
  {
    {agenticros_msgs__srv__FollowMeStop_Event__FIELD_NAME__info, 4, 4},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {service_msgs__msg__ServiceEventInfo__TYPE_NAME, 33, 33},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStop_Event__FIELD_NAME__request, 7, 7},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE_BOUNDED_SEQUENCE,
      1,
      0,
      {agenticros_msgs__srv__FollowMeStop_Request__TYPE_NAME, 40, 40},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStop_Event__FIELD_NAME__response, 8, 8},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE_BOUNDED_SEQUENCE,
      1,
      0,
      {agenticros_msgs__srv__FollowMeStop_Response__TYPE_NAME, 41, 41},
    },
    {NULL, 0, 0},
  },
};

static rosidl_runtime_c__type_description__IndividualTypeDescription agenticros_msgs__srv__FollowMeStop_Event__REFERENCED_TYPE_DESCRIPTIONS[] = {
  {
    {agenticros_msgs__srv__FollowMeStop_Request__TYPE_NAME, 40, 40},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__FollowMeStop_Response__TYPE_NAME, 41, 41},
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
agenticros_msgs__srv__FollowMeStop_Event__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__FollowMeStop_Event__TYPE_NAME, 38, 38},
      {agenticros_msgs__srv__FollowMeStop_Event__FIELDS, 3, 3},
    },
    {agenticros_msgs__srv__FollowMeStop_Event__REFERENCED_TYPE_DESCRIPTIONS, 4, 4},
  };
  if (!constructed) {
    description.referenced_type_descriptions.data[0].fields = agenticros_msgs__srv__FollowMeStop_Request__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[1].fields = agenticros_msgs__srv__FollowMeStop_Response__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&builtin_interfaces__msg__Time__EXPECTED_HASH, builtin_interfaces__msg__Time__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[2].fields = builtin_interfaces__msg__Time__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&service_msgs__msg__ServiceEventInfo__EXPECTED_HASH, service_msgs__msg__ServiceEventInfo__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[3].fields = service_msgs__msg__ServiceEventInfo__get_type_description(NULL)->type_description.fields;
    constructed = true;
  }
  return &description;
}

static char toplevel_type_raw_source[] =
  "---\n"
  "bool success\n"
  "string message";

static char srv_encoding[] = "srv";
static char implicit_encoding[] = "implicit";

// Define all individual source functions

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeStop__get_individual_type_description_source(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__FollowMeStop__TYPE_NAME, 32, 32},
    {srv_encoding, 3, 3},
    {toplevel_type_raw_source, 32, 32},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeStop_Request__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__FollowMeStop_Request__TYPE_NAME, 40, 40},
    {implicit_encoding, 8, 8},
    {NULL, 0, 0},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeStop_Response__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__FollowMeStop_Response__TYPE_NAME, 41, 41},
    {implicit_encoding, 8, 8},
    {NULL, 0, 0},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__FollowMeStop_Event__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__FollowMeStop_Event__TYPE_NAME, 38, 38},
    {implicit_encoding, 8, 8},
    {NULL, 0, 0},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeStop__get_type_description_sources(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[6];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 6, 6};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__FollowMeStop__get_individual_type_description_source(NULL),
    sources[1] = *agenticros_msgs__srv__FollowMeStop_Event__get_individual_type_description_source(NULL);
    sources[2] = *agenticros_msgs__srv__FollowMeStop_Request__get_individual_type_description_source(NULL);
    sources[3] = *agenticros_msgs__srv__FollowMeStop_Response__get_individual_type_description_source(NULL);
    sources[4] = *builtin_interfaces__msg__Time__get_individual_type_description_source(NULL);
    sources[5] = *service_msgs__msg__ServiceEventInfo__get_individual_type_description_source(NULL);
    constructed = true;
  }
  return &source_sequence;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeStop_Request__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[1];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 1, 1};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__FollowMeStop_Request__get_individual_type_description_source(NULL),
    constructed = true;
  }
  return &source_sequence;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeStop_Response__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[1];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 1, 1};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__FollowMeStop_Response__get_individual_type_description_source(NULL),
    constructed = true;
  }
  return &source_sequence;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__FollowMeStop_Event__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[5];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 5, 5};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__FollowMeStop_Event__get_individual_type_description_source(NULL),
    sources[1] = *agenticros_msgs__srv__FollowMeStop_Request__get_individual_type_description_source(NULL);
    sources[2] = *agenticros_msgs__srv__FollowMeStop_Response__get_individual_type_description_source(NULL);
    sources[3] = *builtin_interfaces__msg__Time__get_individual_type_description_source(NULL);
    sources[4] = *service_msgs__msg__ServiceEventInfo__get_individual_type_description_source(NULL);
    constructed = true;
  }
  return &source_sequence;
}
