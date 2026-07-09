# AgenticROS Examples

This directory contains example AgenticROS workflows that show how AI agents can control or inspect ROS2 robots through natural-language interfaces.

## Available examples

| Example | Status | Description |
|---|---:|---|
| [TurtleBot3 chat control](turtlebot-chat/README.md) | Ready | Control a TurtleBot3 in Gazebo through OpenClaw messaging channels such as WhatsApp, Telegram, Discord, or Slack. |
| [Find and approach](find-and-approach/README.md) | Ready | Single-robot mission chaining: install Find Object, run `run_mission` with a NL goal or declarative find → approach plan. |
| [Navigate To (Nav2 external skill)](navigate-to/README.md) | Ready | Phase 1 seed: wrap Nav2 `NavigateToPose` as an `external_ros_node` capability. |
| [Robotic arm control](arm-control/README.md) | Planned | Natural-language pick and place, joint control, gripper control, and camera-guided manipulation. Requires MoveIt2 action integration. |
| [Multi-robot fleet patrol](fleet-patrol/README.md) | Planned | Scheduled waypoint patrols and fleet-wide status. Multi-robot missions and `ros2_find_robots_for` work today — see [docs/missions.md](../docs/missions.md). |

## Quick start

Start with the [TurtleBot3 chat control demo](turtlebot-chat/README.md). It is the currently runnable example and uses the standard AgenticROS flow:

```text
Messaging app -> OpenClaw -> AgenticROS plugin -> rosbridge -> ROS2 simulation
```

At a high level:

1. Start the ROS2 simulation stack from the repository `docker/` directory.
2. Configure the AgenticROS OpenClaw plugin to connect to `ws://localhost:9090`.
3. Send natural-language commands through your configured messaging channel.

See the example README for exact commands and demo prompts.

## Common prerequisites

- Docker and Docker Compose for simulation-based examples.
- An OpenClaw instance with AgenticROS installed.
- A configured messaging channel if you want to control the robot from chat.
- A ROS2 transport connection, usually rosbridge for these examples.

## Related documentation

- [Robot setup](../docs/robot-setup.md)
- [Simulation](../docs/simulation.md)
- [Teleop](../docs/teleop.md)
- [Architecture](../docs/architecture.md)
- [Missions](../docs/missions.md)
- [Skills](../docs/skills.md)
