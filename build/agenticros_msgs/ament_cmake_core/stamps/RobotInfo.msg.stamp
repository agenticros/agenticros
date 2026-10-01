# Phase 1.e robot heartbeat — published on `<namespace>/agenticros/robot_info`
# by agenticros_discovery at 1 Hz. Mirrors the TS-side RobotEntry shape so
# the discovery service can self-advertise without TS-side static config,
# and so a future Phase 4 ACP/A2A agent-card payload is a strict superset
# of these fields. See docs/strategy-ai-agents-plus-ros.md §4(d).
#
# Required fields are at the top. Optional fields (sensors, battery, pose)
# are below — Phase 1.e ships id/name/kind/namespace/capabilities/sensors
# and leaves the others as forward-compatible placeholders so consumers
# don't have to handle a schema bump for Phase 3 spatial memory.

# Stable, human-readable identifier — the same `id` the TS side uses as
# `robot_id` in tool calls (`ros2_publish(robot_id, …)`). Falls back to
# `robot_namespace` when not set.
string id

# Display name shown to users / the chat agent (e.g. "Kitchen Bot").
string name

# Robot kind — "amr" | "arm" | "drone" | "rover" | (free-form). Used by
# `ros2_find_robots_for(kind=…)` to partition heterogeneous fleets.
string kind

# ROS2 topic namespace prefix (e.g. "robot3946b404…"). Without leading
# slash — consumers prepend "/" + this when computing topic paths.
string robot_namespace

# Capability ids the robot advertises (matches the verbs returned by
# `ros2_list_capabilities`, e.g. "drive_base", "follow_person",
# "arm_grasp"). When empty, consumers fall back to the gateway-wide
# global registry — same precedence as the TS-side per-robot allowlist.
string[] capability_ids

# Sensor / hardware flags. Three slots match the Phase 1.e schema; add
# new ones additively (default-false at the consumer when absent) so old
# subscribers don't break.
bool has_realsense
bool has_lidar
bool has_arm

# Heartbeat timestamp — consumers treat the robot as offline when the
# last observed stamp is older than ~5 s (per the strategy memo's
# "1 Hz + 5 s staleness window" recommendation).
builtin_interfaces/Time stamp
