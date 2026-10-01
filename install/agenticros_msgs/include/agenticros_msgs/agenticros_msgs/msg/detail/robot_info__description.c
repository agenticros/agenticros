// generated from rosidl_generator_c/resource/idl__description.c.em
// with input from agenticros_msgs:msg/RobotInfo.idl
// generated code does not contain a copyright notice

#include "agenticros_msgs/msg/detail/robot_info__functions.h"

ROSIDL_GENERATOR_C_PUBLIC_agenticros_msgs
const rosidl_type_hash_t *
agenticros_msgs__msg__RobotInfo__get_type_hash(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_type_hash_t hash = {1, {
      0x9d, 0x0b, 0xa4, 0xad, 0x00, 0x68, 0x56, 0xee,
      0x63, 0x2d, 0xc2, 0x4a, 0x03, 0x35, 0xed, 0xa9,
      0x0a, 0xfd, 0x11, 0x0d, 0x99, 0x38, 0x72, 0xa2,
      0xdb, 0xf3, 0x08, 0xd8, 0x58, 0x9d, 0xae, 0xb8,
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

static char agenticros_msgs__msg__RobotInfo__TYPE_NAME[] = "agenticros_msgs/msg/RobotInfo";
static char builtin_interfaces__msg__Time__TYPE_NAME[] = "builtin_interfaces/msg/Time";

// Define type names, field names, and default values
static char agenticros_msgs__msg__RobotInfo__FIELD_NAME__id[] = "id";
static char agenticros_msgs__msg__RobotInfo__FIELD_NAME__name[] = "name";
static char agenticros_msgs__msg__RobotInfo__FIELD_NAME__kind[] = "kind";
static char agenticros_msgs__msg__RobotInfo__FIELD_NAME__robot_namespace[] = "robot_namespace";
static char agenticros_msgs__msg__RobotInfo__FIELD_NAME__capability_ids[] = "capability_ids";
static char agenticros_msgs__msg__RobotInfo__FIELD_NAME__has_realsense[] = "has_realsense";
static char agenticros_msgs__msg__RobotInfo__FIELD_NAME__has_lidar[] = "has_lidar";
static char agenticros_msgs__msg__RobotInfo__FIELD_NAME__has_arm[] = "has_arm";
static char agenticros_msgs__msg__RobotInfo__FIELD_NAME__stamp[] = "stamp";

static rosidl_runtime_c__type_description__Field agenticros_msgs__msg__RobotInfo__FIELDS[] = {
  {
    {agenticros_msgs__msg__RobotInfo__FIELD_NAME__id, 2, 2},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__RobotInfo__FIELD_NAME__name, 4, 4},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__RobotInfo__FIELD_NAME__kind, 4, 4},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__RobotInfo__FIELD_NAME__robot_namespace, 15, 15},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__RobotInfo__FIELD_NAME__capability_ids, 14, 14},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_STRING_UNBOUNDED_SEQUENCE,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__RobotInfo__FIELD_NAME__has_realsense, 13, 13},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_BOOLEAN,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__RobotInfo__FIELD_NAME__has_lidar, 9, 9},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_BOOLEAN,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__RobotInfo__FIELD_NAME__has_arm, 7, 7},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_BOOLEAN,
      0,
      0,
      {NULL, 0, 0},
    },
    {NULL, 0, 0},
  },
  {
    {agenticros_msgs__msg__RobotInfo__FIELD_NAME__stamp, 5, 5},
    {
      rosidl_runtime_c__type_description__FieldType__FIELD_TYPE_NESTED_TYPE,
      0,
      0,
      {builtin_interfaces__msg__Time__TYPE_NAME, 27, 27},
    },
    {NULL, 0, 0},
  },
};

static rosidl_runtime_c__type_description__IndividualTypeDescription agenticros_msgs__msg__RobotInfo__REFERENCED_TYPE_DESCRIPTIONS[] = {
  {
    {builtin_interfaces__msg__Time__TYPE_NAME, 27, 27},
    {NULL, 0, 0},
  },
};

const rosidl_runtime_c__type_description__TypeDescription *
agenticros_msgs__msg__RobotInfo__get_type_description(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static bool constructed = false;
  static const rosidl_runtime_c__type_description__TypeDescription description = {
    {
      {agenticros_msgs__msg__RobotInfo__TYPE_NAME, 29, 29},
      {agenticros_msgs__msg__RobotInfo__FIELDS, 9, 9},
    },
    {agenticros_msgs__msg__RobotInfo__REFERENCED_TYPE_DESCRIPTIONS, 1, 1},
  };
  if (!constructed) {
    assert(0 == memcmp(&builtin_interfaces__msg__Time__EXPECTED_HASH, builtin_interfaces__msg__Time__get_type_hash(NULL), sizeof(rosidl_type_hash_t)));
    description.referenced_type_descriptions.data[0].fields = builtin_interfaces__msg__Time__get_type_description(NULL)->type_description.fields;
    constructed = true;
  }
  return &description;
}

static char toplevel_type_raw_source[] =
  "# Phase 1.e robot heartbeat \\xe2\\x80\\x94 published on `<namespace>/agenticros/robot_info`\n"
  "# by agenticros_discovery at 1 Hz. Mirrors the TS-side RobotEntry shape so\n"
  "# the discovery service can self-advertise without TS-side static config,\n"
  "# and so a future Phase 4 ACP/A2A agent-card payload is a strict superset\n"
  "# of these fields. See docs/strategy-ai-agents-plus-ros.md \\xc2\\xa74(d).\n"
  "#\n"
  "# Required fields are at the top. Optional fields (sensors, battery, pose)\n"
  "# are below \\xe2\\x80\\x94 Phase 1.e ships id/name/kind/namespace/capabilities/sensors\n"
  "# and leaves the others as forward-compatible placeholders so consumers\n"
  "# don't have to handle a schema bump for Phase 3 spatial memory.\n"
  "\n"
  "# Stable, human-readable identifier \\xe2\\x80\\x94 the same `id` the TS side uses as\n"
  "# `robot_id` in tool calls (`ros2_publish(robot_id, \\xe2\\x80\\xa6)`). Falls back to\n"
  "# `robot_namespace` when not set.\n"
  "string id\n"
  "\n"
  "# Display name shown to users / the chat agent (e.g. \"Kitchen Bot\").\n"
  "string name\n"
  "\n"
  "# Robot kind \\xe2\\x80\\x94 \"amr\" | \"arm\" | \"drone\" | \"rover\" | (free-form). Used by\n"
  "# `ros2_find_robots_for(kind=\\xe2\\x80\\xa6)` to partition heterogeneous fleets.\n"
  "string kind\n"
  "\n"
  "# ROS2 topic namespace prefix (e.g. \"robot3946b404\\xe2\\x80\\xa6\"). Without leading\n"
  "# slash \\xe2\\x80\\x94 consumers prepend \"/\" + this when computing topic paths.\n"
  "string robot_namespace\n"
  "\n"
  "# Capability ids the robot advertises (matches the verbs returned by\n"
  "# `ros2_list_capabilities`, e.g. \"drive_base\", \"follow_person\",\n"
  "# \"arm_grasp\"). When empty, consumers fall back to the gateway-wide\n"
  "# global registry \\xe2\\x80\\x94 same precedence as the TS-side per-robot allowlist.\n"
  "string[] capability_ids\n"
  "\n"
  "# Sensor / hardware flags. Three slots match the Phase 1.e schema; add\n"
  "# new ones additively (default-false at the consumer when absent) so old\n"
  "# subscribers don't break.\n"
  "bool has_realsense\n"
  "bool has_lidar\n"
  "bool has_arm\n"
  "\n"
  "# Heartbeat timestamp \\xe2\\x80\\x94 consumers treat the robot as offline when the\n"
  "# last observed stamp is older than ~5 s (per the strategy memo's\n"
  "# \"1 Hz + 5 s staleness window\" recommendation).\n"
  "builtin_interfaces/Time stamp";

static char msg_encoding[] = "msg";

// Define all individual source functions

const rosidl_runtime_c__type_description__TypeSource *
agenticros_msgs__msg__RobotInfo__get_individual_type_description_source(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static const rosidl_runtime_c__type_description__TypeSource source = {
    {agenticros_msgs__msg__RobotInfo__TYPE_NAME, 29, 29},
    {msg_encoding, 3, 3},
    {toplevel_type_raw_source, 1975, 1975},
  };
  return &source;
}

const rosidl_runtime_c__type_description__TypeSource__Sequence *
agenticros_msgs__msg__RobotInfo__get_type_description_sources(
  const rosidl_message_type_support_t * type_support)
{
  (void)type_support;
  static rosidl_runtime_c__type_description__TypeSource sources[2];
  static const rosidl_runtime_c__type_description__TypeSource__Sequence source_sequence = {sources, 2, 2};
  static bool constructed = false;
  if (!constructed) {
    sources[0] = *agenticros_msgs__msg__RobotInfo__get_individual_type_description_source(NULL),
    sources[1] = *builtin_interfaces__msg__Time__get_individual_type_description_source(NULL);
    constructed = true;
  }
  return &source_sequence;
}
