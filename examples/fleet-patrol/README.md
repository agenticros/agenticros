# Multi-Robot Fleet Patrol Demo

Manage a fleet of robots performing patrol missions through a single chat interface.

## Status

**Partially available today** — multi-robot registration, live discovery, capability-aware filtering (`ros2_find_robots_for`), and per-step `robot_id` routing in `run_mission` are shipped. **Scheduled recurring patrols** (OpenClaw cron) and Nav2 waypoint missions are still planned.

## What works now

See **[docs/missions.md](../../docs/missions.md)** for the full orchestration guide. At a high level:

1. Register robots: `agenticros robots add <id> --kind=amr --capabilities=...`
2. Discover who is online: `ros2_discover_robots` / `ros2_find_robots_for`
3. Run a patrol-style sequence with `run_mission` — declarative steps or NL goals like *"take a picture then drive forward"*
4. Cancel in flight: `mission_cancel({ mission_id })`
5. Hand off to another agent via `memory_recall(namespace="mission:<id>")` when memory is enabled

## Planned additions

- Waypoint-based Nav2 patrol skill
- Scheduled recurring patrols via OpenClaw cron
- Fleet-wide status dashboard in chat

## Related

- [Find and approach demo](../find-and-approach/README.md) — minimal single-robot mission walkthrough
- [Missions guide](../../docs/missions.md)
