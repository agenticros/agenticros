# Find and Approach — mission chaining demo

A minimal **single-robot** walkthrough for AgenticROS mission orchestration: install the Find Object skill, confirm capabilities, then run a two-step *find → approach* mission via natural language or a declarative plan.

## What you will see

1. `ros2_list_capabilities` includes `find_object` and `drive_base`
2. `run_mission({ goal: "find a chair and drive toward it" })` compiles to two steps
3. Step 1 rotates until YOLOv8 detects `chair`; step 2 drives forward while steering from `{{find.outputs.horizontal_offset}}`

No custom mission code — the contract layer chains existing skills.

## Prerequisites

- Node.js ≥ 20
- AgenticROS CLI: `npx agenticros`
- Sim stack (easiest): `agenticros up sim-amr`
- An MCP client: `agenticros mcp setup` (Claude Code, Codex, Hermes) **or** OpenClaw with the plugin

## Steps

### 1. Start the sim

```bash
agenticros up sim-amr
agenticros mcp setup    # skip if you only use OpenClaw chat
```

### 2. Install the Find Object skill (OpenClaw plugin path)

```bash
npx agenticros skills install chrismatthieu/find
agenticros skills sync
systemctl --user restart openclaw-gateway.service   # OpenClaw only
```

On **Claude Code / Codex / Hermes**, `ros2_find_object` is already built into the MCP server — you can skip the skill install for MCP-only workflows.

### 3. Confirm capabilities

Ask your agent:

> List robot capabilities.

Expected verbs include at least: `drive_base`, `take_snapshot`, `find_object`.

### 4. Run via natural language

> Find a chair and drive toward it.

The agent should call `run_mission` with `goal: "find a chair and drive toward it"`. The response includes `mission_id`, per-step results, and the compiled plan.

### 5. Run via declarative plan (optional)

If your client lets you pass raw tool JSON:

```json
{
  "mission": {
    "name": "find chair and approach",
    "steps": [
      { "id": "find", "capability": "find_object", "inputs": { "target": "chair" } },
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

### 6. Cancel (optional)

While the mission is running:

```json
{ "mission_id": "<id from run_mission>" }
```

Call `mission_cancel`. Remaining steps are marked `cancelled`.

## Fleet variant

To target a named robot in a multi-robot config:

```bash
agenticros robots add sim-amr --namespace=<your-sim-namespace> --kind=amr
```

Then:

```json
{ "goal": "find a chair and drive toward it", "robot_id": "sim-amr" }
```

Or ask: *"Using warehouse-amr, find a bottle and drive toward it."*

## Troubleshooting

| Symptom | Fix |
|---|---|
| `find_object` not in capabilities | Install the Find skill; restart gateway / MCP |
| Planner error on goal | Check `ros2_list_capabilities`; install missing skill |
| Robot does not move on approach step | Sim must be running; check `cmd_vel` / namespace in config |
| OpenClaw tool missing | Run `agenticros skills sync`; check `contracts.tools` in plugin manifest |

Full guide: [docs/missions.md](../../docs/missions.md).
