# @agenticros/core

Platform-agnostic ROS2 transport, types, and config schema. This package is the **single dependency** every AgenticROS adapter and skill imports.

It contains:

- The `RosTransport` interface every transport implementation satisfies.
- Four implementations: **Zenoh** (binary CDR), **Rosbridge** (WebSocket JSON), **WebRTC** (Mode C, cloud/remote), and **Local DDS** via `rclnodejs`.
- A Zod config schema (`AgenticROSConfig`) shared across all adapters.
- Topic-namespace utilities, capability registry, and a small long-term memory layer (`mem0` or local file backend).

You don't normally use it directly — you use one of the adapters that depends on it:

- [`agenticros`](https://github.com/agenticros/agenticros) — OpenClaw plugin
- [`@agenticros/claude-code`](https://github.com/agenticros/agenticros) — MCP server for Claude Code / Codex CLI / Claude Desktop
- [`@agenticros/gemini`](https://github.com/agenticros/agenticros) — Gemini CLI adapter

…or you build a **skill** for one of them.

## Building a skill

A skill is an npm package that registers tools the AI agent can call on your robot.

**Quick start** — scaffold, dev locally, publish:

```bash
npx agenticros create-skill my-skill
cd agenticros-skill-my-skill && npm install && npm run dev
npx agenticros publish
```

Or start from scratch with `@agenticros/core`:

```bash
npm install --save @agenticros/core
```

Your `package.json` declares an `agenticros` block:

```jsonc
{
  "name": "agenticros-skill-myskill",
  "main": "dist/index.js",
  "repository": {
    "type": "git",
    "url": "https://github.com/you/agenticros-skill-myskill.git"
  },
  "agenticros": {
    "id": "myskill",
    "displayName": "My Skill",
    "description": "What this skill does in one sentence.",
    "categories": ["navigation"],
    "screenshots": ["docs/screenshot.png"],
    "capabilities": [
      {
        "id": "do_thing",
        "verb": "do",
        "description": "Do the thing.",
        "inputs": { "thing": "string" }
      }
    ]
  },
  "dependencies": {
    "@agenticros/core": "^0.5.0"
  }
}
```

Your entry exports a `registerSkill` function:

```ts
import type { RegisterSkill } from "@agenticros/core";

export const registerSkill: RegisterSkill = (api, _config, _context) => {
  api.registerTool({
    name: "do_thing",
    label: "Do thing",
    description: "Do the thing on the robot.",
    parameters: /* @sinclair/typebox schema */,
    async execute(_callId, params) {
      // ...do the thing
      return { ok: true };
    },
  });
};
```

Publish to the marketplace with `npx agenticros publish`, or submit via **[skills.agenticros.com/submit](https://skills.agenticros.com/submit)**. Published skills use namespaced refs `owner/skill-id` (your GitHub login + `agenticros.id`):

```bash
npx agenticros skills install your-handle/myskill
```

See the [skills contract & guide](https://github.com/agenticros/agenticros/blob/main/docs/skills.md) for the full reference.

## License

Apache-2.0
