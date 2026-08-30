# MoveIt Pick

Canonical package: **[@agenticros/moveit-pick](https://www.npmjs.com/package/@agenticros/moveit-pick)** · [GitHub](https://github.com/agenticros/agenticros-skill-moveit-pick).

```bash
npx agenticros skills install @agenticros/moveit-pick
# or: chrismatthieu/moveit-pick
```

Then `run_mission` with capability `pick_object` and an explicit MoveGroup `goal` matching your MoveIt setup.

On sim: `agenticros up sim-arm --moveit --headless` then `node scripts/test-moveit-sim.mjs`. On a real arm, bring up your own MoveIt stack. See the skill README.
