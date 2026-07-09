# AgenticROS: agents that know what your robot can do

For a long time, talking to a robot through an LLM meant dumping topic lists into the prompt and hoping the model guessed the right `cmd_vel` twist. That works for demos. It falls apart the moment you have two robots, a Nav2 stack you already trust, or a second agent that needs to pick up where the first one left off.

AgenticROS is the contract layer that fixes that. Agents plan in **named capabilities** and **missions**, not raw topics. They can see which robots are online, pause a mission mid-flight, and call an existing ROS node — Nav2, YOLO, whatever you already run — without rewriting it in TypeScript.

This post walks through what that contract layer looks like in practice — and what we shipped recently to make it production-ready.

## The mental model shift

Before:

```text
You: drive toward the chair
Agent: *lists 40 topics* … publishes geometry_msgs/Twist to / somehow /cmd_vel
```

After:

```text
You: find a chair and drive toward it
Agent: run_mission({ goal: "find a chair and drive toward it" })
       → find_object → drive_base (steers via horizontal_offset)
```

The agent asks `ros2_list_capabilities` once, gets a typed verb list (`find_object`, `follow_person`, `navigate_to`, `drive_base`, …), and plans against that. Same surface on OpenClaw, Claude / Codex MCP, and Gemini.

## What we shipped

### 1. Fleet awareness that matches the wire

Robots already advertised themselves with an `agenticros_discovery` heartbeat on `<ns>/agenticros/robot_info` — id, kind, sensors, capability ids, timestamp. The TypeScript side was still inferring "online" from `<ns>/cmd_vel` heuristics.

We wired that heartbeat through end to end: **5 second staleness** means online; older means offline. `ros2_list_robots`, `ros2_discover_robots`, and `ros2_find_robots_for(online=true)` all agree with what the robot is actually saying. `cmd_vel` remains a fallback for stacks that haven't started the discovery node yet. Namespaces that only advertise `robot_info` (arms, drones) also show up.

Fleet config also got the IaC shape we wanted: if `~/.agenticros/fleet.json` exists (or `AGENTICROS_FLEET_PATH`), it wins over `config.robots[]`. Check it into git; treat the room like infrastructure.

```text
You: which AMRs with RealSense can follow a person right now?
Agent: ros2_find_robots_for({ capability: "follow_person", kind: "amr", online: true })
```

### 2. Missions you can pause — not only cancel

`run_mission` already sequenced capabilities, wired `{{step.outputs.field}}` templates, cancelled at step boundaries, and wrote per-step transcripts into shared memory under `mission:<id>` so another agent could inspect progress.

What's new: **`mission_pause` / `mission_resume`**. Pause holds before the next step; resume continues; cancel while paused still aborts cleanly. Useful when a human walks into the path, or when a second agent needs to inspect state before the next verb fires.

```json
{ "tool": "mission_pause", "arguments": { "mission_id": "…", "reason": "human in aisle" } }
{ "tool": "mission_resume", "arguments": { "mission_id": "…" } }
```

### 3. Dynamic skill bindings (one table, three adapters)

Until now, chaining a new skill into a mission meant editing `MISSION_BINDINGS` in three packages. That's the opposite of a skill marketplace.

Bindings now live in `@agenticros/core` (`buildMissionBindings`) and are built from the capability registry. Declare a capability on a skill; it becomes mission-chainable on OpenClaw, MCP, and Gemini without a core PR per adapter. External ROS-node capabilities plug into the same table via `external:<capability_id>`.

### 4. Gemini parity for the canonical demo

Find → approach was the flagship demo on Claude and OpenClaw. Gemini could *plan* `find_object` / `follow_person` but couldn't *execute* them.

Those tools are on Gemini now. Same mission dialect, same goal string, same robot.

### 5. External ROS nodes as first-class skills

This is the unlock for experienced ROS developers.

A capability manifest can point at an existing action, service, or topic instead of an in-process TypeScript loop:

```jsonc
{
  "id": "navigate_to",
  "verb": "navigate",
  "description": "Navigate to a pose via Nav2.",
  "inputs": {
    "x": { "type": "number" },
    "y": { "type": "number" },
    "yaw": { "type": "number", "optional": true }
  },
  "implementation": {
    "kind": "external_ros_node",
    "action": "navigate_to_pose",
    "msg_type": "nav2_msgs/action/NavigateToPose",
    "launch": "nav2_bringup navigation_launch.py"
  }
}
```

AgenticROS dispatches through the transport you already use (Zenoh, rosbridge, local, WebRTC). The `launch` field is documentation for humans and `agenticros doctor` — bringup stays operator-owned so the gateway never shells out into your robot's process tree by surprise.

We ship a reference **`navigate_to`** skill under [`examples/navigate-to`](../../examples/navigate-to/). Keep your stack. Add a manifest. The LLM calls it by name.

## Show me a full loop

```text
You: what robots are here and what can they do?
Agent: ros2_list_robots → kitchen-bot (amr, online), arm-1 (arm, offline)
       ros2_list_capabilities → drive_base, find_object, navigate_to, …

You: find the chair and drive toward it
Agent: run_mission({ goal: "find a chair and drive toward it" })

You: hold on — pause that
Agent: mission_pause({ mission_id })

You: ok continue, then navigate to the charging dock at (2.1, 0.4)
Agent: mission_resume({ mission_id })
       run_mission({ steps: [{ capability: "navigate_to", inputs: { x: 2.1, y: 0.4 } }] })
```

If memory is enabled, a second agent on another adapter can `memory_recall({ namespace: "mission:<id>" })` and see every step that already ran.

## What's in scope — and what's next

**Today:** the agent↔ROS contract — capabilities, missions, fleet discovery, cross-adapter memory handoff, and a path for existing ROS nodes to show up as AI-callable verbs.

**On the roadmap:** spatial memory ("where was the wrench?"), marketplace auto-fetch / paid skills, parallel mission steps with retries, and cross-vendor agent-to-agent protocols. See the [strategy memo](../strategy-ai-agents-plus-ros.md) and [roadmap](../roadmap.md).

## Try it

```bash
npx agenticros init
# point transport at your robot or: agenticros up sim-amr
npx agenticros mcp setup   # or OpenClaw / Gemini per docs
```

Then ask the agent: *"what can this robot do?"* followed by *"find a chair and drive toward it."*

Docs: [missions](../missions.md) · [skills](../skills.md) · [roadmap](../roadmap.md)

If you maintain a Nav2, MoveIt, or perception stack and want it callable by name, the external capability manifest is the invitation. Ship the descriptor; keep the node.
