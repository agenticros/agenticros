# AgenticROS Skills

Skills are optional packages that add tools and behaviors to the AgenticROS plugin. They are loaded at gateway start from **skillPackages** (npm package names) and **skillPaths** (directories to scan). Each skill reads its config from **config.skills.\<skillId\>** and registers tools (and optionally commands) with the plugin.

## Skill contract

- **Package**: `package.json` must have **`"agenticrosSkill": true`** and a **`main`** entry (e.g. `dist/index.js`) that exports **`registerSkill(api, config, context)`**.
- **Config**: Skill-specific options live under **`config.skills.<skillId>`** (e.g. `config.skills.followme`). The skill validates and defaults its own slice.
- **Context**: The plugin passes a **context** object with:
  - **`context.getTransport()`** — Active ROS2 transport (throws if not connected).
  - **`context.getDepthDistance(transport, topic, timeoutMs?)`** — Sample a depth topic and return median distance (meters). Optional; use when the skill needs depth.
  - **`context.getDepthSectors(transport, topic, timeoutMs?)`** — Sample left/center/right thirds of a depth image; returns `{ left_m, center_m, right_m, valid }` for turn direction (e.g. Follow Me).
  - **`context.logger`** — Plugin logger (info, warn, error).
- **Registration**: Inside `registerSkill`, call **`api.registerTool(tool)`** (and optionally commands). The plugin provides the same **api** it uses for its own tools.

Types for **SkillContext**, **RegisterSkill**, and **DepthSampleResult** are exported from the AgenticROS OpenClaw plugin (`@agenticros/agenticros`) for use by skill packages.

## Installing skills

1. **Via package name**  
   In the OpenClaw config file (e.g. `~/.openclaw/openclaw.json`), under **`plugins.entries.agenticros.config`**, set:
   - **`skillPackages`**: `["agenticros-skill-followme", ...]`
   Install the package in the same environment as the gateway (e.g. `pnpm add agenticros-skill-followme` in the gateway app, or ensure the package is on Node’s resolution path).

2. **Via directory**  
   Install or clone the skill into a directory, then set:
   - **`skillPaths`**: `["/path/to/skills"]`
   The plugin scans each path for a `package.json` with **`"agenticrosSkill": true`** and loads the **main** entry. Run `pnpm install` and `pnpm build` in that directory so the entry exists.

3. **Restart the gateway** after changing `skillPackages` or `skillPaths` so the plugin loads the skills.

4. **Configure the skill** under **`config.skills.<skillId>`** (e.g. `config.skills.followme`). See the skill’s README for its options.

## Testing skills (e.g. Follow Me)

The core repo does not install or bundle any skills. To test a skill like **agenticros-skill-followme** without adding it to the core repo:

1. **Use a directory outside this repo**  
   Clone or build the skill in a separate directory (e.g. a sibling `../agenticros-skill-followme` or a dedicated `~/agenticros-skills/`). In OpenClaw config, set **skillPaths** to that directory (e.g. `["/path/to/agenticros-skill-followme"]`). The core repo's `.gitignore` ignores `skills/` and `/agenticros-skill-*/` so that any local skill folder you add inside the repo is not committed.

2. **Smoke test (no robot)**  
   - Build the skill (`pnpm install && pnpm build` in the skill repo).  
   - Point **skillPaths** at the skill directory, set transport to a dummy mode if needed, restart the gateway.  
   - Check gateway logs for `AgenticROS: loaded skills: followme`.  
   - In the web chat, confirm the agent knows about the skill (e.g. "what follow me tools do you have?") and that **follow_robot** (e.g. status) and **ollama_status** are callable.

3. **With ROS2 + Zenoh**  
   - Start the Zenoh router and connect the plugin (transport.mode **zenoh**, zenoh.routerEndpoint set).  
   - Ensure the robot's depth and cmd_vel topics are configured in **config.skills.followme** (and teleop/robot namespace).  
   - From chat: "follow me" / "start following", then "stop following".  
   - Verify cmd_vel is published while following and that the robot responds (or that you see expected tool calls in logs).

4. **With Ollama (optional)**  
   - If using VLM: run Ollama, pull the configured model, set **config.skills.followme.useOllama** and related options.  
   - Use **follow_me_see** (or ask the agent "what do you see for follow me?") to confirm the skill gets camera frames and Ollama responses.

## Reference skill: agenticros-skill-followme

The **Follow Me** behavior is implemented as a standalone skill: [agenticros-skill-followme](https://github.com/your-org/agenticros-skill-followme) (replace with your repo URL).

- **What it does**: Depth-based (and optional Ollama/VLM) person following; publishes `cmd_vel` to keep the user at a target distance. Tools: **follow_robot** (start/stop/status), **follow_me_see** (what the tracker sees when Ollama is on), **ollama_status**.
- **Install**: Add **`agenticros-skill-followme`** to **skillPackages** (or install into a path in **skillPaths**), set **config.skills.followme** as needed, restart the gateway.
- **Run from chat**: User says “follow me”, “start following”, “stop following”; the agent uses **follow_robot** with the appropriate action.
- **Template**: The skill’s README explains project structure and how to use the repo as a template for new skills.

## Creating a third-party skill

1. **Package layout**  
   - `package.json`: **`"agenticrosSkill": true`**, **`main`** pointing to your built entry (e.g. `dist/index.js`).  
   - Entry module exports **`registerSkill(api, config, context)`**.

2. **Config**  
   - Read options from **`config.skills.<skillId>`** (e.g. `config.skills.myskill`). Validate and default in your code (e.g. with a small helper or Zod).

3. **Context**  
   - Use **`context.getTransport()`** for ROS2 (subscribe/publish).  
   - Use **`context.getDepthDistance(transport, topic, timeoutMs?)`** when you need depth (e.g. RealSense).  
   - Use **`context.logger`** for logging.

4. **Registration**  
   - Call **`api.registerTool({ name, label, description, parameters, execute })`** for each tool. Optionally register commands or use hooks if the plugin exposes them.

5. **Build and distribute**  
   - Run `pnpm build` (or equivalent) so the **main** file exists.  
   - Publish to npm or distribute the package so users can add it to **skillPackages** or **skillPaths**.

For a full reference implementation and README template, see **[agenticros-skill-followme](https://github.com/your-org/agenticros-skill-followme)**.
