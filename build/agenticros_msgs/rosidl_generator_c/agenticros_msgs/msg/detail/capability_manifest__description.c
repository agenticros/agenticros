// generated from rosidl_generator_c/resource/idl__description.c.em
// with input from agenticros_msgs:msg/CapabilityManifest.idl
// generated code does not contain a copyright notice

#include "agenticros_msgs/msg/detail/capability_manifest__functions.h"

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__msg__CapabilityManifest__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0xa6, 0xb9, 0x0e, 0x18, 0x37, 0x79, 0x94, 0x13,
      0xcf, 0x85, 0xa9, 0x3c, 0x2f, 0x11, 0xaf, 0x47,
      0x5a, 0xa1, 0x26, 0xbc, 0x15, 0x00, 0x8d, 0xca,
      0xfb, 0x9f, 0x99, 0x9d, 0xd5, 0xb2, 0x2e, 0x95,
    }};
  return &hash;
}

#include <assert.h>
#include <string.h>

// Include directives for referenced types
#include "builtin_interfaces/msg/detail/time__functions.h"

// Hashes for external referenced types
#ifndef NDEBUG
static const rosidl_type_hash_t builtin_interfaces__msg__Time__EXPECTED_HASH = {1, {
    0xb1, 0x06, 0x23, 0x5e, 0x25, 0xa4, 0xc5, 0xed,
    0x35, 0x09, 0x8a, 0xa0, 0xa6, 0x1a, 0x3e, 0xe9,
    0xc9, 0xb1, 0x8d, 0x19, 0x7f, 0x39, 0x8b, 0x0e,
    0x42, 0x06, 0xce, 0xa9, 0xac, 0xf9, 0xc1, 0x97,
  }};
#endif

static char agenticros_msgs__msg__CapabilityManifest__TYPE_NAME[] = "agenticros_msgs/msg/CapabilityManifest";
static char builtin_interfaces__msg__Time__TYPE_NAME[] = "builtin_interfaces/msg/Time";

// Define type names, field names, and default values
static char agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__robot_name[] = "robot_name";
static char agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__robot_namespace[] = "robot_namespace";
static char agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__topic_names[] = "topic_names";
static char agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__topic_types[] = "topic_types";
static char agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__service_names[] = "service_names";
static char agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__service_types[] = "service_types";
static char agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__action_names[] = "action_names";
static char agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__action_types[] = "action_types";
static char agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__stamp[] = "stamp";

static rosidl_runtime_c__type_description__Field agenticros_msgs__msg__CapabilityManifest__FIELDS[] = {
  {
    {agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__robot_name, 10, 10},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__robot_namespace, 15, 15},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__topic_names, 11, 11},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING_UNBOUNDED_SEQUENCE,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__topic_types, 11, 11},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING_UNBOUNDED_SEQUENCE,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__service_names, 13, 13},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING_UNBOUNDED_SEQUENCE,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__service_types, 13, 13},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING_UNBOUNDED_SEQUENCE,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__action_names, 12, 12},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING_UNBOUNDED_SEQUENCE,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__action_types, 12, 12},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING_UNBOUNDED_SEQUENCE,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__CapabilityManifest__FIELD_NAME__stamp, 5, 5},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {builtin_interfaces__msg__Time__TYPE_NAME, 27, 27},
    },
    {NULL, 0, 0},
  },
};

static rosidl_runtime_c__type_description__IndividualTypeDescription agenticros_msgs__msg__CapabilityManifest__REFERENCED_TYPE_DESCRIPTIONS[] = {
  {
    {builtin_interfaces__msg__Time__TYPE_NAME, 27, 27},
    {NULL, 0, 0},
  },
};

const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__msg__CapabilityManifest__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__msg__CapabilityManifest__TYPE_NAME, 38, 38},
      {agenticros_msgs__msg__CapabilityManifest__FIELDS, 9, 9},
    },
    {agenticros_msgs__msg__CapabilityManifest__REFERENCED_TYPE_DESCRIPTIONS, 1, 1},
  };
  if (!constructed) {
    assert(0 == memcmp(&builtin_interfaces__msg__Time__EXPECTED_HASH, builtin_interfaces__msg__Time__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[0].fields = builtin_interfaces__msg__Time__get_type_description(NULL)->type_description.fields;
    constructed = true;
  }
  return &description;
}

static char toplevel_type_raw_source[] =
  "string robot_name\n"
  "string robot_namespace\n"
  "string[] topic_names\n"
  "string[] topic_types\n"
  "string[] service_names\n"
  "string[] service_types\n"
  "string[] action_names\n"
  "string[] action_types\n"
  "builtin_interfaces/Time stamp";

static char msg_encoding[] = "msg";

// Define all individual source functions

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__msg__CapabilityManifest__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__msg__CapabilityManifest__TYPE_NAME, 38, 38},
    {msg_encoding, 3, 3},
    {toplevel_type_raw_source, 203, 203},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__msg__CapabilityManifest__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[2];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 2, 2};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__msg__CapabilityManifest__get_individual_type_description_source(NULL),
    sources[1] = *builtin_interfaces__msg__Time__get_individual_type_description_source(NULL);
    constructed = true;
  }
  return &source_sequence;
}
