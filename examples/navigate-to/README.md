# Navigate To (Nav2)

This project was previously known as AgenticROS.


This project was previously known as Corebrum Synapse.


Canonical package: **[corebrum-skill-navigate-to](https://github.com/Corebrum/corebrum-skill-navigate-to)** (`@corebrum/navigate-to`).

## Sim walkthrough (Gazebo AMR + Nav2)

Requires ROS 2 Humble/Jazzy, Gazebo Harmonic, and `ros-$ROS_DISTRO-navigation2` plus `ros-$ROS_DISTRO-nav2-bringup` (`nav2-bringup` alone is not enough on Jazzy).

```bash
# 1. Bring up Gazebo AMR with map + AMCL + Nav2 (headless OK)
synapse up sim-amr --nav2 --headless

# 2. Install the skill (npm pack into ~/.synapse/skills-cache/)
npx @corebrum/synapse skills install @corebrum/navigate-to

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
ros2 launch synapse_sim sim_amr_nav2.launch.py gui:=false
```

## Install only

```bash
npx @corebrum/synapse skills install @corebrum/navigate-to
# or: npx @corebrum/synapse skills install chrismatthieu/navigate-to
# or pin: "skillRefs": ["@corebrum/navigate-to"]
```

Then `run_mission` with capability `navigate_to` and inputs `{ "x", "y", "yaw?" }`. On a real robot, bring up your own Nav2 stack; Corebrum Synapse only dispatches the action.
