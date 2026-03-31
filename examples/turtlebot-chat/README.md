# TurtleBot3 Chat Control Demo

Control a TurtleBot3 in Gazebo simulation using natural language through WhatsApp, Telegram, Discord, or Slack.

## Prerequisites

- Docker and Docker Compose
- An OpenClaw instance with a messaging channel configured

## Quick Start

1. Start the simulation stack (Gazebo + TurtleBot3 + rosbridge):
   ```bash
   cd docker
   docker compose -f docker-compose.yml -f docker-compose.sim.yml up ros2
   ```
   (Rosbridge-only: `docker compose up ros2` — see [docker/README.md](../../docker/README.md). Full launch options: [README.md](../../README.md) **“RViz2 and Gazebo”**.)

2. Install the AgenticROS plugin in your OpenClaw instance:
   ```
   Configure the plugin with rosbridge URL: ws://localhost:9090
   ```

3. Send a message to your robot through any configured messaging app:
   - "Move forward 1 meter"
   - "Turn left 90 degrees"
   - "What's the battery level?"
   - "Take a photo"

## Demo Commands

| Command | What Happens |
|---|---|
| "Move forward 2 meters" | Publishes Twist to `/cmd_vel` |
| "Navigate to (3, 2)" | Sends Nav2 goal |
| "What do you see?" | Captures camera frame |
| "Check the battery" | Reads `/battery_state` |
| `/estop` | Emergency stop |

## Architecture

```
Your phone → OpenClaw → AgenticROS plugin → rosbridge → Gazebo TurtleBot3
```
