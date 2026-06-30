# AgenticROS Skills

Skills are optional packages that add tools and behaviors to the AgenticROS plugin. They're loaded at gateway start from **`skillPackages`** (npm package names) and **`skillPaths`** (directories). Each skill reads its config from **`config.skills.<skillId>`** and registers tools with the plugin.

A central marketplace at **[skills.agenticros.com](https://skills.agenticros.com)** lists every published skill and supplies the install descriptors the CLI uses. Each skill has a **namespaced ref** `owner/skill-id` (your GitHub login + `agenticros.id`), e.g. `chrismatthieu/followme`. Legacy flat slugs still resolve for older listings. The marketplace stores **metadata only** — every skill's source code lives in its own GitHub repository.

## Quick install — from the marketplace

```bash
# Search the marketplace.
npx agenticros skills search follow

# One-step install: clones the GitHub repo into a sibling of your
# agenticros checkout, runs `pnpm install && pnpm build`, registers it
# with your OpenClaw config, and syncs the contracts.tools allowlist.
npx agenticros skills install chrismatthieu/followme

# Restart your gateway to load the new skill.
systemctl --user restart openclaw-gateway.service
```

Run `agenticros skills` for the full subcommand list (create · dev · publish · search · install · list · discover · add · remove · sync).

## Create and publish a skill (CLI)

### Quick start (hello world)

```bash
npx agenticros create-skill my-first-skill
cd agenticros-skill-my-first-skill
npm install
npm run dev          # → Skill loaded: my-first-skill
```

The default `hello` template is for **local learning** (`agenticros.tutorial: true`). It stays off the public browse catalog unless you customize and publish with `--graduate`.

### Progressive templates

```bash
npx agenticros create-skill wave-hand --template robot
npx agenticros create-skill describe-scene --template camera
npx agenticros create-skill measure-distance --template depth
```

### Publish to the marketplace

```bash
cd agenticros-skill-wave-hand
npx agenticros publish
```

Requires `gh auth login -s public_repo` (or `GH_TOKEN`). The CLI validates `package.json`, builds, pushes to GitHub, and submits to [skills.agenticros.com](https://skills.agenticros.com).

Published skills use **namespaced URLs**: `https://skills.agenticros.com/<github-handle>/<skill-id>` (e.g. `chrismatthieu/wave-hand`). Install with:

```bash
npx agenticros skills install chrismatthieu/wave-hand
```

Maintainer profile: `https://skills.agenticros.com/chrismatthieu`

### Web submit (alternative)

1. Sign in at **[skills.agenticros.com/login](https://skills.agenticros.com/login)** with GitHub.
2. Open **Submit a skill** and paste your repo URL.
3. Re-sync from the skill edit page after pushing updates.

See [`agenticros-skill-followme`](https://github.com/agenticros/agenticros-skill-followme) on the marketplace at [chrismatthieu/followme](https://skills.agenticros.com/chrismatthieu/followme) as a working reference.

## Skill contract

Every skill is an npm package whose `package.json` declares a single `agenticros` block:

```jsonc
{
  "name": "agenticros-skill-followme",
  "version": "0.2.0",
  "main": "dist/index.js",
  "repository": {
    "type": "git",
    "url": "https://github.com/agenticros/agenticros-skill-followme.git"
  },
  "homepage": "https://github.com/agenticros/agenticros-skill-followme#readme",
  "bugs": "https://github.com/agenticros/agenticros-skill-followme/issues",
  "keywords": ["agenticros", "follow", "vision"],
  "agenticros": {
    "id": "followme",
    "displayName": "Follow Me",
    "description": "Depth-based person following with optional Ollama / VLM, turn-to-follow, and search-when-lost behaviors.",
    "categories": ["navigation", "human-interaction"],
    "screenshots": ["docs/screenshot.png"],
    "demoVideoUrl": "https://youtu.be/...",
    "capabilities": [
      {
        "id": "follow_person",
        "verb": "follow",
        "description": "Follow a person walking in front of the robot.",
        "interruptible": true,
        "blocks_base": true
      }
    ]
  },
  "dependencies": {
    "@agenticros/core": "^0.5.0"
  }
}
```

### `agenticros` block fields

| Field | Required | Description |
|---|---|---|
| `id` | yes | Kebab-case slug (e.g. `followme`, `find-object`). The source of truth for the skill id — used by the loader, the CLI, the marketplace, and `config.skills.<id>`. |
| `displayName` | recommended | Human-readable title shown in the marketplace and CLI listings. |
| `description` | recommended | One-sentence summary (also surfaces in marketplace cards). |
| `categories` | optional | List of marketplace facets (e.g. `navigation`, `vision`, `manipulation`, `human-interaction`, `search`, `audio`, `communication`, `telemetry`). |
| `screenshots` | recommended | Array of repo-relative paths to PNG/JPG previews shown on the marketplace listing. |
| `demoVideoUrl` | optional | Link to a hosted demo video. |
| `tutorial` | optional | When `true`, the skill is a learning scaffold. Tutorial listings stay **unlisted** on the public browse catalog unless the author publishes with `agenticros publish --graduate` after customizing the source. |
| `capabilities` | recommended | Capability registry entries used by the planner. See *Capabilities* below. |

### Code

The skill's `main` entry must export `registerSkill(api, config, context)`:

```ts
import type { RegisterSkill, SkillContext } from "@agenticros/agenticros";

export const registerSkill: RegisterSkill = (api, config, context) => {
  const opts = (config.skills?.followme as { speed?: number }) ?? {};

  api.registerTool({
    name: "follow_person",
    label: "Follow person",
    description: "Follow a person walking in front of the robot.",
    parameters: /* @sinclair/typebox schema */,
    async execute(_callId, _params) {
      const t = context.getTransport();
      // ... use t.publish(...), context.getDepthSectors(...), etc.
      return { ok: true };
    },
  });
};
```

The plugin passes:

- **`api`** — the OpenClaw plugin API (same one the plugin's own tools use).
- **`config`** — the parsed `AgenticROSConfig`. Skill-specific options live under `config.skills.<id>`.
- **`context`**:
  - **`context.getTransport()`** — active ROS2 transport (throws if not connected).
  - **`context.getDepthDistance(transport, topic, timeoutMs?)`** — median depth at the image center.
  - **`context.getDepthSectors(transport, topic, timeoutMs?)`** — left/center/right depth thirds.
  - **`context.logger`** — plugin logger.

Types for `SkillContext`, `RegisterSkill`, and `DepthSampleResult` are exported from `@agenticros/agenticros` for use by skill packages.

### Capabilities

The `agenticros.capabilities[]` array tells the **planner** what verbs the skill exposes — independent of how those verbs map to MCP tool names. Each entry:

```jsonc
{
  "id": "follow_person",           // unique within the skill
  "verb": "follow",                // verb the planner reasons about
  "description": "Follow a person walking in front of the robot.",
  "inputs": { "target": "string" },
  "outputs": { "ok": "boolean" },
  "interruptible": true,           // can be stopped mid-execution
  "blocks_base": true              // takes exclusive control of cmd_vel
}
```

`@agenticros/core`'s `listAllCapabilities(config)` merges the 6 built-in robot verbs (`drive_base`, `take_snapshot`, …) with every skill's declared capabilities, tagging each with its source.

## How loading works

1. The OpenClaw config file (e.g. `~/.openclaw/openclaw.json`) sets `plugins.entries.agenticros.config.skillPackages` and / or `skillPaths`.
2. At gateway start, the plugin's `register(api)` runs synchronously:
   - For each `skillPackages` entry, it resolves the npm name, reads the package's `package.json` to find `agenticros.id`, and `require()`s the `main` entry inline.
   - For each `skillPaths` directory, it does the same starting from `<dir>/package.json`.
   - Any skill whose `package.json` doesn't declare a valid `agenticros` block is rejected with a warning.
3. The skill's `registerSkill(api, config, context)` runs inline, registering its tools before OpenClaw snapshots the plugin's tool list.
4. `sync-skill-tools.mjs` (run by the CLI on every add/install/remove) merges the registered tool names into the plugin manifest's `contracts.tools` allowlist so OpenClaw 2026+ will actually expose them to the chat agent.

> **No back-compat with the old `agenticrosSkill: true` boolean.** The single `agenticros` block is now the only manifest form the loader recognizes.

## Manual install (without the marketplace)

If your skill isn't published, you can still register a local clone with the CLI:

```bash
# Clone and build the skill anywhere on disk (a sibling of the agenticros
# repo is the conventional location).
git clone https://github.com/you/agenticros-skill-yours ../agenticros-skill-yours
cd ../agenticros-skill-yours && pnpm install && pnpm build && cd -

# Register it (resolves bare ids against discovered clones).
agenticros skills add yours
agenticros skills sync
systemctl --user restart openclaw-gateway.service
```

Or paste the OpenClaw config by hand:

```jsonc
{
  "plugins": {
    "entries": {
      "agenticros": {
        "config": {
          "skillPaths": ["/abs/path/to/agenticros-skill-yours"],
          "skills": {
            "yours": { "speed": 0.3 }
          }
        }
      }
    }
  }
}
```
