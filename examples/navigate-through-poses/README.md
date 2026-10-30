# Navigate Through Poses (Nav2)

This project was previously known as AgenticROS.


This project was previously known as Corebrum Synapse.


Canonical package: **[@corebrum/navigate-through-poses](https://www.npmjs.com/package/@corebrum/navigate-through-poses)** · [GitHub](https://github.com/Corebrum/corebrum-skill-navigate-through-poses).

## Sim walkthrough

Same Nav2 bringup as [navigate-to](../navigate-to/README.md):

```bash
synapse up sim-amr --nav2 --headless
npx @corebrum/synapse skills install @corebrum/navigate-through-poses
```

Example mission:

```json
{
  "steps": [
    {
      "capability": "navigate_through_poses",
      "inputs": {
        "poses": [
          { "x": 1.0, "y": 1.0 },
          { "x": 2.0, "y": 1.0 },
          { "x": 2.0, "y": -1.0 }
        ]
      }
    }
  ]
}
```

## Install only

```bash
npx @corebrum/synapse skills install @corebrum/navigate-through-poses
# or: chrismatthieu/navigate-through-poses
```

Then `run_mission` with capability `navigate_through_poses` and inputs `{ "poses": [{ "x", "y", "yaw?" }, ...] }`.
