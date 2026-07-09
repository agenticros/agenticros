# navigate_to — Nav2 external skill

Phase 1 seed skill demonstrating `implementation.kind: "external_ros_node"`.

AgenticROS does **not** launch Nav2 for you. Bring up Nav2 on the robot (or sim), then point AgenticROS at this skill directory:

```jsonc
// ~/.agenticros/config.json
{
  "skillPaths": ["/absolute/path/to/agenticros/examples/navigate-to"]
}
```

Restart the gateway / MCP server. `ros2_list_capabilities` should include `navigate_to`.

## Mission example

```json
{
  "mission": {
    "name": "go to dock",
    "steps": [
      {
        "id": "nav",
        "capability": "navigate_to",
        "inputs": { "x": 2.1, "y": 0.4, "yaw": 0 }
      }
    ]
  }
}
```

The mission runner dispatches via `transport.sendActionGoal` to `navigate_to_pose` (`nav2_msgs/action/NavigateToPose`). The `launch` field is documentation for operators / `agenticros doctor` only.

## Requirements

- Nav2 stack running and advertising `navigate_to_pose` (namespaced under the robot namespace when applicable)
- A transport that supports actions (local DDS, rosbridge, or WebRTC). Zenoh action support depends on your bridge configuration.
