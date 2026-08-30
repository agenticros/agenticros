# Robotic Arm Control Demo

Control a robotic arm through natural language commands via messaging apps.

## Status

**Planned** — pick/place, gripper, and camera-guided manipulation.

Named-pose MoveIt on the sim arm is already shipped:

```bash
agenticros up sim-arm --moveit --headless
npx agenticros skills install @agenticros/moveit-pick
node scripts/test-moveit-sim.mjs
```

See [docs/simulation.md](../../docs/simulation.md) and [MoveIt pick](../moveit-pick/README.md).

## Planned Features

- Pick and place operations via natural language
- Gripper open/close commands
- Camera-guided manipulation
