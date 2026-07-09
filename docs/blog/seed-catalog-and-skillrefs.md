# Your robot’s skill catalog just got a lot more interesting

AgenticROS already lets agents plan in **capabilities** and **missions** — not raw ROS topics. What’s new is a bigger seed catalog of *external* skills (wrap the ROS nodes you already run) and a thinner path from marketplace → robot.

## New seed skills

Install from [skills.agenticros.com](https://skills.agenticros.com):

| Skill | Capability | What it does |
|-------|------------|--------------|
| **Detect humans** | `detect_humans` | Subscribe to your vision stack’s `Detection2DArray` |
| **Start SLAM** | `start_slam` / `stop_slam` / `save_map` / `load_map` | Trigger RTAB-Map mapping / map load from a mission step |
| **Follow Me (ROS)** | `follow_person_ros` | Call the on-robot follow node via services |
| **Navigate To** | `navigate_to` | Nav2 `NavigateToPose` as a marketplace skill |
| **Navigate Through Poses** | `navigate_through_poses` | Nav2 waypoint routes |
| **MoveIt Pick** | `pick_object` | MoveIt `MoveGroup` (operator bringup) |
| **Dock to Charger** | `dock_to_charger` | OpenNav `DockRobot` (operator bringup) |

Each one is a small adjacent package — same layout as Find / Follow Me — with a capability manifest. Keep your C++/Python stack; AgenticROS dispatches over the transport you already use.

```bash
npx agenticros skills install @agenticros/navigate-to
npx agenticros skills install @agenticros/navigate-through-poses
npx agenticros skills install @agenticros/detect-humans
npx agenticros skills install @agenticros/start-slam
npx agenticros skills install @agenticros/follow-me-ros
npx agenticros skills install @agenticros/moveit-pick
npx agenticros skills install @agenticros/dock-to-charger
```

## Marketplace auto-fetch (v1 + v2)

Declare skills in config with **`skillRefs`**. On startup we resolve them from the marketplace (preferring **npm** `@agenticros/*` when listed), pack/clone into `~/.agenticros/skills-cache/`, and load them — no more “clone, build, wire `skillPaths`, hope you remembered sync.” CLI install also **auto-restarts** the OpenClaw gateway (`--no-restart` to skip).

```jsonc
{
  "skillRefs": [
    "chrismatthieu/navigate-to",
    "chrismatthieu/detect-humans@main"
  ]
}
```

Pins never auto-upgrade. OpenClaw merges already-cached paths at gateway start; MCP / Gemini can fetch missing refs on load.

## Discoverable capabilities

`ros2_list_capabilities` now surfaces marketplace verbs you *haven’t* installed yet (`discoverable: true` + `install_ref`). The agent can propose an install mid-conversation instead of guessing from a stale prompt.

Same mission dialect on OpenClaw, Claude / Codex MCP, and Gemini.

## Try it

```bash
npx agenticros init
npx agenticros skills install @agenticros/navigate-to
# or pin in config: "skillRefs": ["chrismatthieu/start-slam", "@agenticros/dock-to-charger"]
```

More: [agenticros.com](https://agenticros.com) · [skills.agenticros.com](https://skills.agenticros.com) · [missions](../missions.md) · [skills](../skills.md)

## LinkedIn / X copy

**LinkedIn**

> Your robot’s skill catalog just got a lot more interesting.
>
> AgenticROS already lets agents plan in capabilities and missions — not raw ROS topics. What’s new is a bigger seed catalog of *external* skills (wrap the ROS nodes you already run) and a thinner path from marketplace → robot.
>
> New seeds: Nav2 through-poses, MoveIt pick, dock-to-charger, SLAM load_map — plus navigate-to, detect humans, start SLAM, Follow Me (ROS).
>
> Plus `skillRefs` npm auto-fetch into `~/.agenticros/skills-cache/` and discoverable marketplace capabilities in `ros2_list_capabilities`.
>
> agenticros.com · skills.agenticros.com
>
> #Robotics #ROS2 #AIAgents #OpenSource

**X / repost (~200 chars)**

> New AgenticROS seeds: Nav2 through-poses, MoveIt pick, docking, SLAM load_map — plus skillRefs npm install + auto-restart. agenticros.com
