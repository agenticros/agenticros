# Navigate To (Nav2)

Canonical package: **[agenticros-skill-navigate-to](https://github.com/agenticros/agenticros-skill-navigate-to)** (`@agenticros/navigate-to`).

## Sim walkthrough (Gazebo AMR + Nav2)

Requires ROS 2 Humble/Jazzy, Gazebo Harmonic, and `ros-$ROS_DISTRO-nav2-bringup`.

```bash
# 1. Bring up Gazebo AMR with map + AMCL + Nav2 (headless OK)
agenticros up sim-amr --nav2 --headless

# 2. Install the skill (npm pack into ~/.agenticros/skills-cache/)
npx agenticros skills install @agenticros/navigate-to

# 3. From an MCP client (Claude / Codex) or OpenClaw:
#    run_mission with capability navigate_to
```

Example mission inputs (clear of the person cylinder at `(2.5, 0)`):

```json
{
  "steps": [
    { "capability": "navigate_to", "inputs": { "x": 2.0, "y": 1.0, "yaw": 0.0 } }
  ]
}
```

Smoke script (sim + Nav2 + skill already running):

```bash
node scripts/test-navigate-sim.mjs
```

Direct launch without the CLI:

```bash
ros2 launch agenticros_sim sim_amr_nav2.launch.py gui:=false
```

## Install only

```bash
npx agenticros skills install @agenticros/navigate-to
# or: npx agenticros skills install chrismatthieu/navigate-to
# or pin: "skillRefs": ["@agenticros/navigate-to"]
```

Then `run_mission` with capability `navigate_to` and inputs `{ "x", "y", "yaw?" }`. On a real robot, bring up your own Nav2 stack; AgenticROS only dispatches the action.
