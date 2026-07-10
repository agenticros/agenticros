# AgenticROS Examples

This directory contains example AgenticROS workflows that show how AI agents can control or inspect ROS2 robots through natural-language interfaces.

## Available examples

| Example | Status | Description |
|---|---:|---|
| [TurtleBot3 chat control](turtlebot-chat/README.md) | Ready | Control a TurtleBot3 in Gazebo through OpenClaw messaging channels. |
| [Find and approach](find-and-approach/README.md) | Ready | Mission chaining: Find Object → approach via `run_mission`. |
| [Navigate To (Nav2)](navigate-to/README.md) | Ready | `@agenticros/navigate-to` — Nav2 NavigateToPose (sim: `up sim-amr --nav2`). |
| [Navigate Through Poses](navigate-through-poses/README.md) | Ready | `@agenticros/navigate-through-poses` — Nav2 waypoint chains (same `--nav2`). |
| [Detect Humans](detect-humans/README.md) | Ready | `@agenticros/detect-humans` — on-robot detections. |
| [Start SLAM](start-slam/README.md) | Ready | `@agenticros/start-slam` — start / stop / save / load map. |
| [Follow Me (ROS)](follow-me-ros/README.md) | Ready | `@agenticros/follow-me-ros` — on-robot follow_me services. |
| [MoveIt pick](moveit-pick/README.md) | Ready | `@agenticros/moveit-pick` — MoveGroup pick (operator MoveIt bringup). |
| [Dock To Charger](dock-to-charger/README.md) | Ready | `@agenticros/dock-to-charger` — OpenNav DockRobot. |
| [Robotic arm control](arm-control/README.md) | Planned | Richer pick/place demos; sim-arm MoveIt2 CI still WIP. |
| [Multi-robot fleet patrol](fleet-patrol/README.md) | Partial | Use `navigate_through_poses` + fleet tools — see [docs/missions.md](../docs/missions.md). |

## Marketplace seed skills

```bash
npx agenticros skills install @agenticros/navigate-to
npx agenticros skills install @agenticros/navigate-through-poses
npx agenticros skills install @agenticros/detect-humans
npx agenticros skills install @agenticros/start-slam
npx agenticros skills install @agenticros/follow-me-ros
npx agenticros skills install @agenticros/moveit-pick
npx agenticros skills install @agenticros/dock-to-charger
# or pin: "skillRefs": ["@agenticros/navigate-to", "chrismatthieu/followme", ...]
```

## Quick start

Start with the [TurtleBot3 chat control demo](turtlebot-chat/README.md).

## Related documentation

- [Missions](../docs/missions.md) · [Skills](../docs/skills.md) · [Roadmap](../docs/roadmap.md)
- [Robot setup](../docs/robot-setup.md) · [Simulation](../docs/simulation.md)
