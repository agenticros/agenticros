# Corebrum Synapse Examples

This directory contains example Corebrum Synapse workflows that show how AI agents can control or inspect ROS2 robots through natural-language interfaces.

## Available examples

| Example | Status | Description |
|---|---:|---|
| [TurtleBot3 chat control](turtlebot-chat/README.md) | Ready | Control a TurtleBot3 in Gazebo through OpenClaw messaging channels. |
| [Find and approach](find-and-approach/README.md) | Ready | Mission chaining: Find Object → approach via `run_mission`. |
| [Navigate To (Nav2)](navigate-to/README.md) | Ready | `@corebrum/navigate-to` — Nav2 NavigateToPose (sim: `up sim-amr --nav2`). |
| [Navigate Through Poses](navigate-through-poses/README.md) | Ready | `@corebrum/navigate-through-poses` — Nav2 waypoint chains (same `--nav2`). |
| [Detect Humans](detect-humans/README.md) | Ready | `@corebrum/detect-humans` — on-robot detections. |
| [Start SLAM](start-slam/README.md) | Ready | `@corebrum/start-slam` — start / stop / save / load / mapping vs localization. |
| [Explore / wander](explore/README.md) | Ready | `@corebrum/explore` — frontier coverage + safe wandering (Nav2). |
| [Follow Me (ROS)](follow-me-ros/README.md) | Ready | `@corebrum/follow-me-ros` — on-robot follow_me services. |
| [MoveIt pick](moveit-pick/README.md) | Ready | `@corebrum/moveit-pick` — MoveGroup (sim: `up sim-arm --moveit`). |
| [Dock To Charger](dock-to-charger/README.md) | Ready | `@corebrum/dock-to-charger` — OpenNav DockRobot. |
| [Robotic arm control](arm-control/README.md) | Planned | Richer pick/place + gripper; named-pose MoveIt on sim-arm is shipped. |
| [Multi-robot fleet patrol](fleet-patrol/README.md) | Partial | Use `navigate_through_poses` + fleet tools — see [docs/missions.md](../docs/missions.md). |

## Marketplace seed skills

```bash
npx @corebrum/synapse skills install @corebrum/navigate-to
npx @corebrum/synapse skills install @corebrum/navigate-through-poses
npx @corebrum/synapse skills install @corebrum/detect-humans
npx @corebrum/synapse skills install @corebrum/start-slam
npx @corebrum/synapse skills install @corebrum/explore
npx @corebrum/synapse skills install @corebrum/follow-me-ros
npx @corebrum/synapse skills install @corebrum/moveit-pick
npx @corebrum/synapse skills install @corebrum/dock-to-charger
# or pin: "skillRefs": ["@corebrum/navigate-to", "chrismatthieu/followme", ...]
```

## Quick start

Start with the [TurtleBot3 chat control demo](turtlebot-chat/README.md).

## Related documentation

- [Missions](../docs/missions.md) · [Skills](../docs/skills.md) · [Roadmap](../docs/roadmap.md)
- [Robot setup](../docs/robot-setup.md) · [Simulation](../docs/simulation.md)
