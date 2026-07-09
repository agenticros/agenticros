# Missions — capability chaining and fleet orchestration

AgenticROS sits a **contract layer** between AI agents and ROS 2. Agents plan in **intentions** (*"find the chair and drive toward it"*); the platform validates those intentions against a typed **capability registry**, compiles them into structured steps, and only then dispatches to ROS tools.

```
Agent (reasoning)  →  Contract layer  →  ROS 2  →  Robot
                       capabilities
                       run_mission
                       safety + fleet filters
```

Every adapter exposes the same surface — OpenClaw, Claude Code / Desktop / Dispatch, Codex CLI, Hermes Agent, and Gemini CLI — so two agents on different stacks can run the same mission dialect against the same robot.

## Prerequisites

1. **A running robot or sim** — `agenticros up real`, `agenticros up sim-amr`, or your own stack with Zenoh / rosbridge / local DDS connected.
2. **An agent with AgenticROS tools** — MCP clients: `agenticros mcp setup`; OpenClaw: plugin installed via `agenticros init`.
3. **Optional skills** — compound missions like *find → approach* need `find_object` and `follow_person` in the registry. Install from the [Skills Marketplace](https://skills.agenticros.com):

   ```bash
   npx agenticros skills install chrismatthieu/find
   npx agenticros skills install chrismatthieu/followme
   agenticros skills sync
   # Restart OpenClaw gateway if you use the plugin adapter
   ```

## Step 1 — Discover what the robot can do

Call **`ros2_list_capabilities`**. The response is the agent's planning surface: built-in verbs (`drive_base`, `take_snapshot`, `measure_depth`, …) plus every skill's declared capabilities (`find_object`, `follow_person`, …).

Each capability carries optional **inputs**, **outputs**, and **preconditions** — shaped like an ACP / A2A agent card so the same manifest can advertise a robot's skills to other agents later.

If a capability is missing, install the skill that provides it and restart the gateway / MCP server, then list again.

## Step 2 — Run a simple mission (natural language)

For common verbs, pass a **`goal`** string to **`run_mission`**. A deterministic local planner in `@agenticros/core` compiles it against the live registry — no extra LLM required.

**Agent prompt examples** (the agent calls the tool for you):

| Say this | Compiled plan |
|---|---|
| `take a picture` | `take_snapshot` |
| `follow me` | `follow_person` |
| `find a chair and drive toward it` | `find_object` → `drive_base` (steers via `{{find.outputs.horizontal_offset}}`) |
| `take a picture and then measure depth` | `take_snapshot` → `measure_depth` |

**Direct tool call** (MCP / debugging):

```json
{
  "goal": "find a chair and drive toward it"
}
```

The response includes:

- `mission_id` — pass to `mission_cancel` to abort at the next step boundary
- `status` — `ok`, `failed`, or `cancelled`
- `steps[]` — per-step inputs, outputs, errors, and duration
- When a `goal` was used: the **compiled plan** so you can see exactly what the planner emitted

If the goal cannot be compiled, the error lists recognised verbs and the current capability registry so the agent can self-correct (e.g. install a missing skill).

## Step 3 — Run a precise mission (declarative plan)

When you need full control — custom `on_fail` behaviour, explicit wiring, or steps the planner does not recognise — pass a **`mission`** object with a `steps[]` array.

**Canonical find → approach** (same plan the NL planner produces for *"find a chair and drive toward it"*):

```json
{
  "mission": {
    "name": "find chair and approach",
    "steps": [
      {
        "id": "find",
        "capability": "find_object",
        "inputs": { "target": "chair" }
      },
      {
        "id": "approach",
        "capability": "drive_base",
        "inputs": {
          "linear_x": 0.2,
          "angular_z": "{{find.outputs.horizontal_offset}}"
        }
      }
    ]
  }
}
```

### Step fields

| Field | Purpose |
|---|---|
| `id` | Unique within the mission; later steps reference `{{id.outputs.field}}` |
| `capability` | Must exist in `ros2_list_capabilities` |
| `inputs` | Literals or `{{stepId.outputs.fieldName}}` template refs |
| `on_fail` | `"stop"` (default) aborts remaining steps; `"continue"` records the error and keeps going |

Steps run **sequentially**. Each step's structured outputs are available to later steps after the runner parses the tool response.

## Step 4 — Fleet setup (multi-robot)

Register robots in `~/.agenticros/config.json` with the CLI:

```bash
# AMR with RealSense — inherits gateway-wide capabilities unless narrowed
agenticros robots add warehouse-amr \
  --name="Warehouse AMR" \
  --namespace=robot3946b404c33e4aa39a8d16deb1c5c593 \
  --kind=amr \
  --sensors=has_realsense,!has_arm \
  --capabilities=drive_base,take_snapshot,find_object,follow_person

# Arm robot — only this robot can run arm skills when you narrow capabilities
agenticros robots add lab-arm \
  --name="Lab Arm" \
  --namespace=lab_arm_01 \
  --kind=arm \
  --sensors=has_arm,!has_realsense \
  --capabilities=drive_base,take_snapshot
```

**Fleet tools:**

| Tool | When to use |
|---|---|
| `ros2_list_robots` | Configured fleet — id, name, kind, capabilities, online hint |
| `ros2_discover_robots` | Live wire scan — who is publishing `/<ns>/cmd_vel` right now? |
| `ros2_find_robots_for` | *"Give me an online AMR that can `follow_person`"* — ranked best-first |

Example query:

```json
{
  "capability": "follow_person",
  "kind": "amr",
  "online": true
}
```

Robots publish a 1 Hz heartbeat on `<namespace>/agenticros/robot_info` so the online filter reflects reachability.

### Route a mission to one robot

Set **`mission.robot_id`** (or top-level **`robot_id`** when using `goal`) to pin every step to one robot:

```json
{
  "goal": "take a picture",
  "robot_id": "warehouse-amr"
}
```

### Mix robots in one mission

Set **`inputs.robot_id`** on individual steps. Per-step id wins over `mission.robot_id`:

```json
{
  "mission": {
    "name": "AMR finds, arm picks (illustrative)",
    "robot_id": "warehouse-amr",
    "steps": [
      {
        "id": "find",
        "capability": "find_object",
        "inputs": { "target": "box" }
      },
      {
        "id": "grasp",
        "capability": "drive_base",
        "inputs": { "robot_id": "lab-arm", "linear_x": 0 }
      }
    ]
  }
}
```

Replace `grasp` with your arm skill's capability id once that skill is installed and bound. The pattern — **fleet filter → single mission → per-step `robot_id`** — is the multi-robot orchestration model.

## Step 5 — Pause, cancel, and hand off

**Pause in flight** (holds before the next step):

```json
{ "mission_id": "<id from run_mission>", "reason": "human in aisle" }
```

Call **`mission_pause`**, then **`mission_resume`** with the same `mission_id` when ready. Cancel while paused still aborts cleanly.

**Cancel in flight:**

```json
{ "mission_id": "<id from run_mission>" }
```

Call **`mission_cancel`**. The runner stops at the **next step boundary** (the current step finishes; subsequent steps are marked `cancelled`). Safe to call on unknown ids.

**Share progress across agents** — enable [memory](memory.md) (`config.memory.enabled: true`). Every step is written to namespace `mission:<mission_id>`. A second agent recalls the timeline:

```
memory_recall({ "query": "step status", "namespace": "mission:<mission_id>" })
```

Use this for handoffs, debugging, or post-mortems without re-querying ROS.

## Fleet config (`fleet.json`)

When `~/.agenticros/fleet.json` exists (or `AGENTICROS_FLEET_PATH` points at a file), that robot list **wins** over `config.robots[]`. The file may be a JSON array of robot entries or `{ "robots": [ ... ] }` using the same shape as `config.robots`.

Online status prefers the `agenticros_discovery` heartbeat on `<ns>/agenticros/robot_info` (5 s staleness). `<ns>/cmd_vel` remains a fallback when no heartbeats are present.

## Contract layer — what gets validated

Before a step reaches ROS, the runner checks:

1. **Capability exists** — `capability` is in the registry from `ros2_list_capabilities`
2. **Binding exists** — the adapter knows how to map that capability to a tool (`drive_base` → `ros2_publish`, `find_object` → `ros2_find_object`, …)
3. **Template resolution** — `{{stepId.outputs.field}}` references a prior step that completed successfully
4. **Safety** — velocity publishes are clamped by `safety.maxLinearVelocity` / `maxAngularVelocity` in config (adapter-side, before ROS)
5. **Fleet** — `robot_id` resolves to a configured robot; `ros2_find_robots_for` filters by capability + kind + online before planning

Failed validation returns structured step errors — the agent sees *why* a step was rejected, not a silent no-op.

## End-to-end walkthrough (single robot)

```bash
# 1. Stack + MCP
agenticros up sim-amr
agenticros mcp setup

# 2. Skills for find / follow
npx agenticros skills install chrismatthieu/find
npx agenticros skills install chrismatthieu/followme
agenticros skills sync

# 3. In Claude Code / Codex / OpenClaw chat:
#    "List capabilities"           → ros2_list_capabilities
#    "Find a chair and drive toward it"  → run_mission({ goal: "..." })
#    "Cancel the mission"          → mission_cancel (if still running)
```

See also: [find-and-approach example](../examples/find-and-approach/README.md).

## Supported capabilities in missions today

Builtin bindings live in `@agenticros/core` (`buildMissionBindings`). Skill-declared capabilities are auto-bound to `ros2_<id>` (or `external:<id>` for `external_ros_node`).

| Capability | Underlying tool |
|---|---|
| `drive_base` | `ros2_publish` → `cmd_vel` |
| `take_snapshot` | `ros2_camera_snapshot` |
| `measure_depth` | `ros2_depth_distance` |
| `list_topics` | `ros2_list_topics` |
| `publish_topic` | `ros2_publish` (arbitrary topic) |
| `subscribe_once` | `ros2_subscribe_once` |
| `follow_person` | `ros2_follow_me_start` (skill / Gemini / MCP) |
| `find_object` | `ros2_find_object` (skill / Gemini / MCP) |
| `navigate_to` | external Nav2 action (`agenticros skills install chrismatthieu/navigate-to`) |
| `detect_humans` | external vision topic subscribe (`chrismatthieu/detect-humans`) |
| `start_slam` / `stop_slam` / `save_map` | external RTAB-Map services (`chrismatthieu/start-slam`) |
| `follow_person_ros` / `stop_follow_person_ros` | external `agenticros_follow_me` services (`chrismatthieu/follow-me-ros`) |

Skills you author can add new ids via `agenticros.capabilities[]` in `package.json` (or sibling `capabilities.json`); once registered, they appear in `ros2_list_capabilities` and are chainable in `run_mission` without editing three adapter binding tables. See [skills.md — Chaining your skill in missions](skills.md#chaining-your-skill-in-missions).

## Related docs

- [Skills](skills.md) — declare capabilities, install marketplace skills
- [Memory](memory.md) — mission transcripts and cross-agent recall
- [Strategy memo](strategy-ai-agents-plus-ros.md) — Phase 1 design and roadmap
- [MCP adapter README](../packages/agenticros-claude-code/README.md#tools) — full tool list
