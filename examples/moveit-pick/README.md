# MoveIt Pick

This project was previously known as AgenticROS.


This project was previously known as Corebrum Synapse.


Canonical package: **[@corebrum/moveit-pick](https://www.npmjs.com/package/@corebrum/moveit-pick)** · [GitHub](https://github.com/Corebrum/corebrum-skill-moveit-pick).

```bash
npx @corebrum/synapse skills install @corebrum/moveit-pick
# or: chrismatthieu/moveit-pick
```

Then `run_mission` with capability `pick_object` and an explicit MoveGroup `goal` matching your MoveIt setup.

On sim: `synapse up sim-arm --moveit --headless` then `node scripts/test-moveit-sim.mjs`. On a real arm, bring up your own MoveIt stack. See the skill README.
