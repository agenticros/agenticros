# Robot hardware profile

A **profile** declares what a robot body has (features) and where those
features live on *this* ROS graph (bindings). Advertised agent verbs
(`drive_base`, `take_snapshot`, skill capabilities) are the intersection
of installed skills and the body's features — not the gateway-wide skill
list.

Skills address **feature names**, never a camera brand or URDF. Two
layers stay separate:

| Layer | What it is | Example |
|---|---|---|
| Features | Frozen hardware vocabulary | `base`, `camera`, `depth`, `arm` |
| Bindings | ROS names on this robot | `cmd_vel` → `/warehouse-01/cmd_vel` |
| Verbs | Capability ids | `follow_person`, `navigate_to` |

## Back-compat

`robots[i].profile` is **optional**. No profile → no verb filtering
(today's behaviour: every robot inherits every skill loaded on the
gateway). An explicit `capabilities[]` allowlist still wins when set.
A declared profile is strict: a verb whose `requires` are not a subset
of `profile.features` is not advertised.

Published skills that omit `requires` stay visible on every robot
(current behaviour). New skills should declare `requires`.

## Schema (`agenticros.profile.v1`)

```jsonc
{
  "robots": [
    {
      "id": "warehouse-01",
      "namespace": "warehouse-01",
      "kind": "amr",
      "profile": {
        "schema": "agenticros.profile.v1",
        "features": ["base", "camera", "depth", "lidar"],
        "bindings": {
          "cmd_vel": "/cmd_vel",
          "odom": "/odom",
          "camera.rgb": "/camera/color/image_raw/compressed",
          "camera.depth": "/camera/depth/image_rect_raw",
          "lidar": "/scan"
        }
      }
    }
  ]
}
```

Relative binding names are prefixed with `robot.namespace` the same way
other AgenticROS topics are.

### Frozen features

`base`, `arm`, `gripper`, `camera`, `depth`, `lidar`, `imu`, `dock`,
`display`, `audio`, `battery`, `estop`.

Names are only added in later schema versions; they are never removed or
repurposed.

### Frozen v1 binding keys

`cmd_vel`, `odom`, `camera.rgb`, `camera.depth`, `lidar`, `joint_states`,
`navigate_to_pose`, `dock`, `battery`.

## Skill `requires`

```jsonc
{
  "id": "follow_person",
  "verb": "follow",
  "description": "Follow a person.",
  "requires": ["base", "camera"],
  "optional": ["depth"]
}
```

- `requires` — ALL-OF features. The verb is advertised only when every
  name is in `profile.features`.
- `optional` — unused for gating; docs and marketplace only.

Builtin verbs:

| Verb | `requires` |
|---|---|
| `drive_base` | `base` |
| `take_snapshot` | `camera` |
| `measure_depth` | `depth` |
| `list_topics` / `publish_topic` / `subscribe_once` | none (escape hatches) |

## CLI

```bash
agenticros robots add warehouse-01 \
  --kind=amr \
  --features=base,camera,depth \
  --binding cmd_vel=/cmd_vel \
  --binding camera.rgb=/camera/color/image_raw/compressed

agenticros robots profile show warehouse-01
agenticros robots profile infer warehouse-01          # print draft
agenticros robots profile infer warehouse-01 --apply  # write draft
```

`infer` drafts from `kind`, `cameraTopic`, deprecated `sensors`, and
namespaced `/cmd_vel`. It does not overwrite unless `--apply`.

`agenticros skills install` still installs on the gateway (mixed fleets
need that). It **warns** per configured robot whose profile fails the
skill's `requires`. It never hard-fails.

`agenticros doctor` static checks (no live graph):

- Unknown feature or binding key → red
- Declared feature missing its v1 binding → red
- Installed skill `requires` not satisfied by a profiled robot → yellow
- No profile on any robot → yellow (“verbs are gateway-wide”)
- Inverted `workspaceLimits` (xMin > xMax) → red

`agenticros doctor --live` connects over the configured transport and
checks each profile binding against the graph:

- Declared topic/action missing → red
- Type mismatch (e.g. `cmd_vel` is not Twist) → yellow
- Present and typed correctly → green
- Live graph unreachable → red

## Per-robot safety

Gateway `config.safety` is the default. Optional `robots[i].safety`
overlays velocity ceilings and an optional map-frame geofence:

```jsonc
{
  "safety": { "maxLinearVelocity": 1.0, "maxAngularVelocity": 1.5 },
  "robots": [
    {
      "id": "indoor-amr",
      "profile": { "features": ["base"], "bindings": { "cmd_vel": "/cmd_vel" } },
      "safety": {
        "maxLinearVelocity": 0.3,
        "workspaceLimits": { "xMin": -4, "xMax": 4, "yMin": -4, "yMax": 4 }
      }
    }
  ]
}
```

- Twist publishes over the cap are **blocked** (MCP / OpenClaw / Gemini).
- Teleop and find-object **clamp** to the cap.
- `workspaceLimits` is optional; omit it to leave navigation unfenced.
- On transport loss (and again on reconnect), AgenticROS publishes a
  zero Twist to every robot whose profile has `base` (legacy kind other
  than `arm` if no profile).

Deprecated `sensors.has_realsense | has_lidar | has_arm` still work when
`profile` is absent (`has_realsense` maps to `camera`+`depth`). Prefer
an explicit profile.

See also: [skills.md](skills.md), [missions.md](missions.md), [cli.md](cli.md).
