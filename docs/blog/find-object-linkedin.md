# Teaching a robot to find things, two ways at once

I added a new skill to AgenticROS this week called **Find Object**, and it gave me an excuse to do something I've been meaning to ship for a while: publish the same robot capability as both a Claude Code MCP tool and a standalone OpenClaw skill plugin, from one piece of detection code.

The chat experience is what you'd expect. I say "find the bottle." The robot rotates in place, watches its camera feed, and stops the moment YOLO sees a bottle. The agent then tells me which way to look — left, right, or dead center — and how confident it was. No prompt engineering, no demo scaffolding. Just a tool call.

## What Find Object actually does

Find Object is a one-shot visual search. You hand it a target name and it does this:

1. Start rotating the robot in place (clockwise by default), respecting the safety-clamped max angular velocity.
2. Every ~500ms, subscribe-once to the camera topic, decode the frame, and run YOLOv8n on it.
3. If any detection of the requested class beats `min_confidence` (default 0.5), stop the robot and return the bounding box, confidence, and the horizontal offset of the object from image center, normalized to [-1, +1].
4. If the timeout elapses without a hit, stop the robot and return `found: false`.

The target can be any of the 80 COCO classes — `bottle`, `cup`, `vase`, `chair`, `cell phone`, `laptop`, `couch`, `book`, the usual suspects — plus a small alias table so `phone`, `tv`/`television`, `sofa`, `plant`, and `bike` all just work.

That `horizontalOffset` is the part I care about most. It's the bridge to the next skill. Once Find Object stops the robot with a known offset, a follow-up `approach_object` or `track_object` skill has everything it needs to close the loop with depth and `cmd_vel`. Find Object isn't trying to be a full perception stack — it's the cheap, deterministic first step.

## Two distributions, one piece of code

This is the part I think is more interesting than the YOLO wrapper.

Find Object ships in two places. The first is a built-in MCP tool inside the **Claude Code adapter**, exposed as `ros2_find_object`. The MCP server runs over stdio, so the same tool lights up across Claude Code in the terminal, the Claude desktop app on macOS, and Claude Dispatch on iPhone when paired to the Mac. The agent just sees one more `ros2_*` tool next to `ros2_publish`, `ros2_camera_snapshot`, and friends.

The second is a standalone npm-style **OpenClaw skill plugin** called `agenticros-skill-find`, living in its own repo. It exports a single `registerSkill(api, config, context)` function — the AgenticROS skill contract — and the OpenClaw gateway picks it up at boot through its skill loader. There's no fork, no patch to the core plugin: you add one line to your config and the gateway loads the skill alongside everything else.

Both versions call the same `findObject(config, transport, opts)` function under the hood, written against `@agenticros/core`. That means it doesn't care whether the transport underneath is Zenoh, rosbridge, WebRTC, or local DDS — the namespacing, the `cmd_vel` resolution, the `Twist` publish all go through one interface. Build it once, get it on every agent surface AgenticROS supports.

## Under the hood

I deliberately kept the implementation inside the gateway / MCP process. There is **no extra ROS2 node** for this skill. Detection runs in-process with `onnxruntime-node` on CPU and `sharp` for image preprocessing. On first call, the skill pulls `yolov8n.onnx` (about 6 MB) from a public Ultralytics mirror into `~/.agenticros/models/`, then reuses the cache forever. You can override the path or URL with `AGENTICROS_YOLOV8_MODEL` and `AGENTICROS_YOLOV8_URL` env vars if you're working offline or behind a proxy.

The control loop is small and boring, which is exactly what I want for a safety-relevant skill. Every tick republishes the rotation twist (some robots time out their cmd_vel if you stop talking), snapshots a frame, runs inference, and exits the loop the moment NMS produces a detection. A `finally` block guarantees a zero-velocity stop publish on success, on timeout, and on any thrown error. Angular velocity is clamped to `safety.maxAngularVelocity` before it ever reaches the wire.

## Show me

Here's the chat. Just the words:

```text
You: find the bottle
Robot: Found bottle after 4.2s rotating clockwise. Confidence 87%,
       horizontal offset 0.12 (right of center). Robot stopped.
```

Here's the MCP tool call the agent actually makes:

```json
{
  "tool": "ros2_find_object",
  "arguments": {
    "target": "bottle",
    "angular_speed": 0.3,
    "timeout_seconds": 30,
    "min_confidence": 0.5
  }
}
```

And here's the entire OpenClaw config change to enable the skill on the gateway side:

```json
{
  "skillPackages": ["agenticros-skill-find"],
  "skills": {
    "find": {
      "defaultAngularSpeed": 0.3,
      "defaultTimeoutSeconds": 30,
      "defaultMinConfidence": 0.5
    }
  }
}
```

Restart the gateway and `find_object` shows up next to the rest of your tools.

## Why I built it this way

The skill contract — `registerSkill(api, config, context)` plus an `agenticrosSkill: true` flag in `package.json` — is the part of AgenticROS I'm most invested in long-term. It means anyone can ship a new robot capability as a separate repo or npm package, without touching the core, the adapters, or each other's skills. Find Object is now the second reference for that pattern after Follow Me, and it's deliberately smaller and more self-contained so it's a cleaner template to copy.

The two-distribution story matters for the same reason. If a skill is good enough, you want it everywhere your agent already lives. MCP gets you Claude's surfaces. The OpenClaw skill loader gets you the gateway, any LLM the gateway is wired to, and eventually the Gemini adapter once it speaks the same contract.

## What's next

Next on the list: multi-class search ("find a cup or a bottle"), depth fusion with `ros2_depth_distance` so the result carries a distance estimate, and a `go_to_object` skill that uses the horizontal offset and depth to close the gap. After that, swappable detectors so you can drop in your own ONNX without forking the skill.

If you want to try Find Object, the AgenticROS repo is at [github.com/agenticros/agenticros](https://github.com/agenticros/agenticros) and the skill package is at [github.com/agenticros/agenticros-skill-find](https://github.com/agenticros/agenticros-skill-find). Issues and PRs welcome — especially if you point a robot at it and break it in an interesting way.

## Code references

For anyone reading from LinkedIn who wants to dig in:

- MCP tool registration: `packages/agenticros-claude-code/src/tools.ts` (`ros2_find_object`)
- MCP implementation: `packages/agenticros-claude-code/src/find-object/find-object.ts`
- OpenClaw skill loader: `packages/agenticros/src/skill-loader.ts`
- Skill package: `agenticros-skill-find/src/find-object.ts`, `agenticros-skill-find/src/detector.ts`
- Skill contract docs: `docs/skills.md`
