# Navigate Through Poses (Nav2)

Canonical package: **[@agenticros/navigate-through-poses](https://www.npmjs.com/package/@agenticros/navigate-through-poses)** · [GitHub](https://github.com/agenticros/agenticros-skill-navigate-through-poses).

## Sim walkthrough

Same Nav2 bringup as [navigate-to](../navigate-to/README.md):

```bash
agenticros up sim-amr --nav2 --headless
npx agenticros skills install @agenticros/navigate-through-poses
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
npx agenticros skills install @agenticros/navigate-through-poses
# or: chrismatthieu/navigate-through-poses
```

Then `run_mission` with capability `navigate_through_poses` and inputs `{ "poses": [{ "x", "y", "yaw?" }, ...] }`.
