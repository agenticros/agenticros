# MoveIt pick (stub)

**Not published to the marketplace yet** — blocked on `sim-arm` / MoveIt2 bringup.

This stub documents the intended `external_ros_node` shape for a future `agenticros-skill-moveit-pick` adjacent repo.

## Intended capability

```jsonc
{
  "id": "pick_object",
  "verb": "manipulate",
  "description": "Plan and execute a MoveIt pick via the MoveGroup action.",
  "inputs": {
    "x": { "type": "number", "description": "Grasp pose x (m)." },
    "y": { "type": "number", "description": "Grasp pose y (m)." },
    "z": { "type": "number", "description": "Grasp pose z (m)." },
    "frame_id": { "type": "string", "optional": true }
  },
  "implementation": {
    "kind": "external_ros_node",
    "package": "moveit_ros_move_group",
    "action": "move_action",
    "msg_type": "moveit_msgs/action/MoveGroup"
  }
}
```

`buildExternalGoal` does not yet special-case MoveGroup goals — mission inputs should pass an explicit `goal` object matching your MoveIt setup until helpers land.

## Status

| Item | Status |
|------|--------|
| Manifest / marketplace package | Deferred |
| `agenticros up sim-arm` + MoveIt2 | WIP |
| CI demo | Not claimed |

When sim-arm is ready, create `../agenticros-skill-moveit-pick` and publish like the other seed skills.
