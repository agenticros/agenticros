// generated from rosidl_generator_c/resource/idl__description.c.em
// with input from agenticros_msgs:srv/GetCapabilities.idl
// generated code does not contain a copyright notice

#include "agenticros_msgs/srv/detail/get_capabilities__functions.h"

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__GetCapabilities__get_type_hash(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x1e, 0x9c, 0x1c, 0xdd, 0xbb, 0x99, 0x71, 0x49,
      0xe8, 0x2d, 0xff, 0x34, 0x45, 0x06, 0x6c, 0xa7,
      0xfd, 0xec, 0x0f, 0x4a, 0xe8, 0x26, 0xb2, 0x22,
      0x4d, 0x8c, 0xe9, 0x4d, 0x09, 0x8e, 0x98, 0xa9,
    }};
  return &hash;
}

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__GetCapabilities_Request__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0xaf, 0xd5, 0xbf, 0x81, 0x1e, 0xfb, 0x1b, 0xdd,
      0xa0, 0x23, 0xfc, 0x27, 0xf1, 0x07, 0xb2, 0x10,
      0x19, 0xf1, 0x30, 0xdc, 0x47, 0xd2, 0x85, 0x29,
      0x8f, 0x1d, 0x27, 0x66, 0xbf, 0x2d, 0x87, 0x72,
    }};
  return &hash;
}

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__GetCapabilities_Response__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x91, 0xff, 0xa6, 0x30, 0x8c, 0xe0, 0xd2, 0x41,
      0xc9, 0xb3, 0x6f, 0xb2, 0x3c, 0x81, 0x00, 0xa3,
      0x16, 0x9a, 0x52, 0x22, 0xbc, 0xfd, 0x3c, 0x4d,
      0x8e, 0xa6, 0x8e, 0x88, 0x73, 0xcf, 0xbd, 0xde,
    }};
  return &hash;
}

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__srv__GetCapabilities_Event__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x13, 0xa2, 0xd2, 0x94, 0xa9, 0xec, 0x67, 0x7c,
      0x81, 0xc8, 0x91, 0x3c, 0x70, 0xa3, 0x5b, 0x5f,
      0xcb, 0x1d, 0x29, 0x75, 0x4e, 0x48, 0x73, 0x10,
      0x41, 0x9b, 0x59, 0x84, 0x5b, 0x80, 0xf5, 0x12,
    }};
  return &hash;
}

#include <assert.h>
#include <string.h>

// Include directives for referenced types
#include "agenticros_msgs/msg/detail/capability_manifest__functions.h"
#include "service_msgs/msg/detail/service_event_info__functions.h"
#include "builtin_interfaces/msg/detail/time__functions.h"

// Hashes for external referenced types
#ifndef NDEBUG
static const rosidl_type_hash_t agenticros_msgs__msg__CapabilityManifest__EXPECTED_HASH = {1, {
    0xa6, 0xb9, 0x0e, 0x18, 0x37, 0x79, 0x94, 0x13,
    0xcf, 0x85, 0xa9, 0x3c, 0x2f, 0x11, 0xaf, 0x47,
    0x5a, 0xa1, 0x26, 0xbc, 0x15, 0x00, 0x8d, 0xca,
    0xfb, 0x9f, 0x99, 0x9d, 0xd5, 0xb2, 0x2e, 0x95,
  }};
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

static char agenticros_msgs__srv__GetCapabilities__TYPE_NAME[] = "agenticros_msgs/srv/GetCapabilities";
static char agenticros_msgs__msg__CapabilityManifest__TYPE_NAME[] = "agenticros_msgs/msg/CapabilityManifest";
static char agenticros_msgs__srv__GetCapabilities_Event__TYPE_NAME[] = "agenticros_msgs/srv/GetCapabilities_Event";
static char agenticros_msgs__srv__GetCapabilities_Request__TYPE_NAME[] = "agenticros_msgs/srv/GetCapabilities_Request";
static char agenticros_msgs__srv__GetCapabilities_Response__TYPE_NAME[] = "agenticros_msgs/srv/GetCapabilities_Response";
static char builtin_interfaces__msg__Time__TYPE_NAME[] = "builtin_interfaces/msg/Time";
static char service_msgs__msg__ServiceEventInfo__TYPE_NAME[] = "service_msgs/msg/ServiceEventInfo";

// Define type names, field names, and default values
static char agenticros_msgs__srv__GetCapabilities__FIELD_NAME__request_message[] = "request_message";
static char agenticros_msgs__srv__GetCapabilities__FIELD_NAME__response_message[] = "response_message";
static char agenticros_msgs__srv__GetCapabilities__FIELD_NAME__event_message[] = "event_message";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__GetCapabilities__FIELDS[] = {
  {
    {agenticros_msgs__srv__GetCapabilities__FIELD_NAME__request_message, 15, 15},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__srv__GetCapabilities_Request__TYPE_NAME, 43, 43},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__GetCapabilities__FIELD_NAME__response_message, 16, 16},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__srv__GetCapabilities_Response__TYPE_NAME, 44, 44},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__GetCapabilities__FIELD_NAME__event_message, 13, 13},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__srv__GetCapabilities_Event__TYPE_NAME, 41, 41},
    },
    {NULL, 0, 0},
  },
};

static rosidl_runtime_c__type_description__IndividualTypeDescription agenticros_msgs__srv__GetCapabilities__REFERENCED_TYPE_DESCRIPTIONS[] = {
  {
    {agenticros_msgs__msg__CapabilityManifest__TYPE_NAME, 38, 38},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__GetCapabilities_Event__TYPE_NAME, 41, 41},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__GetCapabilities_Request__TYPE_NAME, 43, 43},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__GetCapabilities_Response__TYPE_NAME, 44, 44},
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
agenticros_msgs__srv__GetCapabilities__get_type_description(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__GetCapabilities__TYPE_NAME, 35, 35},
      {agenticros_msgs__srv__GetCapabilities__FIELDS, 3, 3},
    },
    {agenticros_msgs__srv__GetCapabilities__REFERENCED_TYPE_DESCRIPTIONS, 6, 6},
  };
  if (!constructed) {
    assert(0 == memcmp(&agenticros_msgs__msg__CapabilityManifest__EXPECTED_HASH, agenticros_msgs__msg__CapabilityManifest__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[0].fields = agenticros_msgs__msg__CapabilityManifest__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[1].fields = agenticros_msgs__srv__GetCapabilities_Event__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[2].fields = agenticros_msgs__srv__GetCapabilities_Request__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[3].fields = agenticros_msgs__srv__GetCapabilities_Response__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&builtin_interfaces__msg__Time__EXPECTED_HASH, builtin_interfaces__msg__Time__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[4].fields = builtin_interfaces__msg__Time__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&service_msgs__msg__ServiceEventInfo__EXPECTED_HASH, service_msgs__msg__ServiceEventInfo__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[5].fields = service_msgs__msg__ServiceEventInfo__get_type_description(NULL)->type_description.fields;
    constructed = true;
  }
  return &description;
}
// Define type names, field names, and default values
static char agenticros_msgs__srv__GetCapabilities_Request__FIELD_NAME__robot_namespace[] = "robot_namespace";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__GetCapabilities_Request__FIELDS[] = {
  {
    {agenticros_msgs__srv__GetCapabilities_Request__FIELD_NAME__robot_namespace, 15, 15},
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
agenticros_msgs__srv__GetCapabilities_Request__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__GetCapabilities_Request__TYPE_NAME, 43, 43},
      {agenticros_msgs__srv__GetCapabilities_Request__FIELDS, 1, 1},
    },
    {NULL, 0, 0},
  };
  if (!constructed) {
    constructed = true;
  }
  return &description;
}
// Define type names, field names, and default values
static char agenticros_msgs__srv__GetCapabilities_Response__FIELD_NAME__manifest[] = "manifest";
static char agenticros_msgs__srv__GetCapabilities_Response__FIELD_NAME__success[] = "success";
static char agenticros_msgs__srv__GetCapabilities_Response__FIELD_NAME__error_message[] = "error_message";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__GetCapabilities_Response__FIELDS[] = {
  {
    {agenticros_msgs__srv__GetCapabilities_Response__FIELD_NAME__manifest, 8, 8},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {agenticros_msgs__msg__CapabilityManifest__TYPE_NAME, 38, 38},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__GetCapabilities_Response__FIELD_NAME__success, 7, 7},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_BOOLEAN,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__GetCapabilities_Response__FIELD_NAME__error_message, 13, 13},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
};

static rosidl_runtime_c__type_description__IndividualTypeDescription agenticros_msgs__srv__GetCapabilities_Response__REFERENCED_TYPE_DESCRIPTIONS[] = {
  {
    {agenticros_msgs__msg__CapabilityManifest__TYPE_NAME, 38, 38},
    {NULL, 0, 0},
  },
  {
    {builtin_interfaces__msg__Time__TYPE_NAME, 27, 27},
    {NULL, 0, 0},
  },
};

const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__srv__GetCapabilities_Response__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__GetCapabilities_Response__TYPE_NAME, 44, 44},
      {agenticros_msgs__srv__GetCapabilities_Response__FIELDS, 3, 3},
    },
    {agenticros_msgs__srv__GetCapabilities_Response__REFERENCED_TYPE_DESCRIPTIONS, 2, 2},
  };
  if (!constructed) {
    assert(0 == memcmp(&agenticros_msgs__msg__CapabilityManifest__EXPECTED_HASH, agenticros_msgs__msg__CapabilityManifest__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[0].fields = agenticros_msgs__msg__CapabilityManifest__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&builtin_interfaces__msg__Time__EXPECTED_HASH, builtin_interfaces__msg__Time__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[1].fields = builtin_interfaces__msg__Time__get_type_description(NULL)->type_description.fields;
    constructed = true;
  }
  return &description;
}
// Define type names, field names, and default values
static char agenticros_msgs__srv__GetCapabilities_Event__FIELD_NAME__info[] = "info";
static char agenticros_msgs__srv__GetCapabilities_Event__FIELD_NAME__request[] = "request";
static char agenticros_msgs__srv__GetCapabilities_Event__FIELD_NAME__response[] = "response";

static rosidl_runtime_c__type_description__Field agenticros_msgs__srv__GetCapabilities_Event__FIELDS[] = {
  {
    {agenticros_msgs__srv__GetCapabilities_Event__FIELD_NAME__info, 4, 4},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {service_msgs__msg__ServiceEventInfo__TYPE_NAME, 33, 33},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__GetCapabilities_Event__FIELD_NAME__request, 7, 7},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE_BOUNDED_SEQUENCE,
      1,
      0,
      {agenticros_msgs__srv__GetCapabilities_Request__TYPE_NAME, 43, 43},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__GetCapabilities_Event__FIELD_NAME__response, 8, 8},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE_BOUNDED_SEQUENCE,
      1,
      0,
      {agenticros_msgs__srv__GetCapabilities_Response__TYPE_NAME, 44, 44},
    },
    {NULL, 0, 0},
  },
};

static rosidl_runtime_c__type_description__IndividualTypeDescription agenticros_msgs__srv__GetCapabilities_Event__REFERENCED_TYPE_DESCRIPTIONS[] = {
  {
    {agenticros_msgs__msg__CapabilityManifest__TYPE_NAME, 38, 38},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__GetCapabilities_Request__TYPE_NAME, 43, 43},
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__srv__GetCapabilities_Response__TYPE_NAME, 44, 44},
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
agenticros_msgs__srv__GetCapabilities_Event__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__srv__GetCapabilities_Event__TYPE_NAME, 41, 41},
      {agenticros_msgs__srv__GetCapabilities_Event__FIELDS, 3, 3},
    },
    {agenticros_msgs__srv__GetCapabilities_Event__REFERENCED_TYPE_DESCRIPTIONS, 5, 5},
  };
  if (!constructed) {
    assert(0 == memcmp(&agenticros_msgs__msg__CapabilityManifest__EXPECTED_HASH, agenticros_msgs__msg__CapabilityManifest__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[0].fields = agenticros_msgs__msg__CapabilityManifest__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[1].fields = agenticros_msgs__srv__GetCapabilities_Request__get_type_description(NULL)->type_description.fields;
    description.referenced_type_descriptions.data[2].fields = agenticros_msgs__srv__GetCapabilities_Response__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&builtin_interfaces__msg__Time__EXPECTED_HASH, builtin_interfaces__msg__Time__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[3].fields = builtin_interfaces__msg__Time__get_type_description(NULL)->type_description.fields;
    assert(0 == memcmp(&service_msgs__msg__ServiceEventInfo__EXPECTED_HASH, service_msgs__msg__ServiceEventInfo__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[4].fields = service_msgs__msg__ServiceEventInfo__get_type_description(NULL)->type_description.fields;
    constructed = true;
  }
  return &description;
}

static char toplevel_type_raw_source[] =
  "string robot_namespace\n"
  "---\n"
  "agenticros_msgs/CapabilityManifest manifest\n"
  "bool success\n"
  "string error_message";

static char srv_encoding[] = "srv";
static char implicit_encoding[] = "implicit";

// Define all individual source functions

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__GetCapabilities__get_individual_type_description_source(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__GetCapabilities__TYPE_NAME, 35, 35},
    {srv_encoding, 3, 3},
    {toplevel_type_raw_source, 105, 105},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__GetCapabilities_Request__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__GetCapabilities_Request__TYPE_NAME, 43, 43},
    {implicit_encoding, 8, 8},
    {NULL, 0, 0},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__GetCapabilities_Response__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__GetCapabilities_Response__TYPE_NAME, 44, 44},
    {implicit_encoding, 8, 8},
    {NULL, 0, 0},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__srv__GetCapabilities_Event__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__srv__GetCapabilities_Event__TYPE_NAME, 41, 41},
    {implicit_encoding, 8, 8},
    {NULL, 0, 0},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__GetCapabilities__get_type_description_sources(
  const rosidl_service_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[7];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 7, 7};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__GetCapabilities__get_individual_type_description_source(NULL),
    sources[1] = *agenticros_msgs__msg__CapabilityManifest__get_individual_type_description_source(NULL);
    sources[2] = *agenticros_msgs__srv__GetCapabilities_Event__get_individual_type_description_source(NULL);
    sources[3] = *agenticros_msgs__srv__GetCapabilities_Request__get_individual_type_description_source(NULL);
    sources[4] = *agenticros_msgs__srv__GetCapabilities_Response__get_individual_type_description_source(NULL);
    sources[5] = *builtin_interfaces__msg__Time__get_individual_type_description_source(NULL);
    sources[6] = *service_msgs__msg__ServiceEventInfo__get_individual_type_description_source(NULL);
    constructed = true;
  }
  return &source_sequence;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__GetCapabilities_Request__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[1];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 1, 1};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__GetCapabilities_Request__get_individual_type_description_source(NULL),
    constructed = true;
  }
  return &source_sequence;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__GetCapabilities_Response__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[3];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 3, 3};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__GetCapabilities_Response__get_individual_type_description_source(NULL),
    sources[1] = *agenticros_msgs__msg__CapabilityManifest__get_individual_type_description_source(NULL);
    sources[2] = *builtin_interfaces__msg__Time__get_individual_type_description_source(NULL);
    constructed = true;
  }
  return &source_sequence;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__srv__GetCapabilities_Event__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[6];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 6, 6};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__srv__GetCapabilities_Event__get_individual_type_description_source(NULL),
    sources[1] = *agenticros_msgs__msg__CapabilityManifest__get_individual_type_description_source(NULL);
    sources[2] = *agenticros_msgs__srv__GetCapabilities_Request__get_individual_type_description_source(NULL);
    sources[3] = *agenticros_msgs__srv__GetCapabilities_Response__get_individual_type_description_source(NULL);
    sources[4] = *builtin_interfaces__msg__Time__get_individual_type_description_source(NULL);
    sources[5] = *service_msgs__msg__ServiceEventInfo__get_individual_type_description_source(NULL);
    constructed = true;
  }
  return &source_sequence;
}
