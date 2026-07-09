# Strategy: AI Agents + ROS

> Forward-looking memo. Captures positioning, audiences, the moat, and the
> four-phase roadmap. Not a spec — actual engineering work for each phase
> is tracked in separate plans. For sequenced OSS + commercial deliverables,
> see [roadmap.md](roadmap.md).

## 1. TL;DR

AgenticROS is the agent-platform layer for ROS robots: named capabilities,
chained-skill missions, multi-robot fleet discovery, cross-agent shared
memory, and a multi-adapter architecture (OpenClaw, NemoClaw, Claude Code /
Desktop / Dispatch, Gemini, and future targets like LangGraph, OpenAI,
Cursor, Cline). It is engineered for two audiences: **AI-first new
developers** who want to ship a robotics demo in 30 minutes, and
**experienced ROS developers** who want their existing rclcpp / rclpy / Nav2
/ MoveIt nodes exposed to LLMs without a rewrite.

The platform-level moat is multi-adapter and cross-agent memory; the
go-to-market moat is **first-to-market with the catalog of named,
AI-callable ROS skills** — AI-driven (`follow_robot`), deterministic
(VSLAM, VIO, human detection, Nav2), and hybrid (deterministic perception
→ LLM reasoning) — all reachable through the same manifest.

Roadmap, four phases:

- **Phase 1** adds capability manifests to skills, lets AI agents chain
  skills into missions, and lets a single agent reason about multiple
  robots in the room (and pick the right one for the job).
- **Phase 2** turns the skill ecosystem into a real marketplace at
  `skills.agenticros.com` — open-source first, with an app-store
  commission model layered on top once usage justifies it.
- **Phase 3** promotes memory to spatial memory (likely
  [ReMEmbR](https://nvidia-ai-iot.github.io/remembr/)-backed) and ships
  it as a marketplace skill.
- **Phase 4** opens the platform to cross-vendor multi-agent
  collaboration via an inter-agent protocol (ACP / A2A).

## 2. Positioning — what AgenticROS is, who it's for, and why it wins

### What AgenticROS is

The current tagline — *"agentic AI for ROS-powered robots"* /
*"bridges frontier reasoning models with cameras, depth sensors, motors,
and `cmd_vel`"* — accurately names the layer.

Multi-adapter is the technical foundation: OpenClaw, NemoClaw, Claude
(Code / Desktop / Dispatch), Gemini, and future LangGraph / OpenAI /
Cursor / Cline adapters. The same skill runs everywhere; the same memory
persists across agents.

The brand stays. The tagline already describes what we do.

### The skill spectrum

A skill is a named, declarable capability — but its implementation can
sit anywhere on the spectrum, and the platform doesn't care which:

- **AI-driven** — LLM-in-the-loop perception or planning. Today's
  `follow_robot` uses a VLM to disambiguate the target person;
  `find_object` uses a VLM to identify and localize objects.
- **Deterministic** — classical algorithms with no LLM in the control
  loop:
  - **VSLAM** (RTAB-Map, ORB-SLAM3)
  - **VIO** (OpenVINS, VINS-Mono)
  - **Human detection** (YOLO, MediaPipe)
  - **Object tracking**, sensor fusion
  - **Nav2** navigation
  - **MoveIt2** manipulation

  The agent invokes a high-level verb (`start_slam`, `detect_humans`,
  `navigate_to`); the skill runs a deterministic pipeline and streams
  structured state back.
- **Hybrid** — deterministic perception piped into LLM reasoning. A
  SLAM skill maintains the map; an agent asks *"did the wrench move
  since yesterday?"* and the LLM reasons over the map state plus
  spatial memory (Phase 3).

AgenticROS does not require an LLM in any particular skill's hot path.
The platform's job is to make every kind of skill **discoverable by
name**, **chainable into missions**, and **shareable across agents and
robots** — regardless of whether the skill's brain is a transformer or
a Kalman filter.

### Who it's for

Two distinct audiences, both first-class:

- **New robotics developers** (AI-first, less ROS expertise). Drop a
  skill into config, talk to the robot through Claude / Gemini /
  OpenClaw, ship a demo in 30 minutes. Never write a launch file. The
  MCP tool surface (`ros2_publish`, `ros2_camera_snapshot`,
  `run_mission`) keeps the conceptual surface tiny.
- **Experienced ROS developers** (rclcpp / rclpy / Nav2 / MoveIt).
  Keep your existing node. Add a capability manifest that describes
  what it exposes — no port to TypeScript, no rewrite of your control
  loop. Phase 1's manifest format works for both **in-process Node.js
  skills** (the current `agenticros-skill-*` shape) **and descriptors
  that wrap external ROS nodes**. Pick whichever fits. An LLM can now
  invoke your stack by name; your stack didn't have to change.

### Why we win — the moat

Multi-adapter and cross-agent memory are the *technical floor*. The
actual *go-to-market moat* is **first-to-market with the catalog of
named, AI-callable ROS skills**. Every published skill makes the
platform more valuable for the next user, harder to displace, and a
more compelling target for partners. The "ROS robot that follows you /
picks up the cup / maps the warehouse / detects a human / runs Nav2 /
runs MoveIt" verbs become AgenticROS skills before anyone else has
them, then the catalog compounds. Phase 2's marketplace is the surface
area; Phase 1's capability manifests are the substrate; the seed
catalog is what gets us to escape velocity.

## 3. Where we sit today

Concrete inventory of what already supports the platform-layer thesis:

- 9 MCP tools in
  [packages/agenticros-claude-code/src/tools.ts](../packages/agenticros-claude-code/src/tools.ts)
  (`ros2_list_topics`, `ros2_publish`, `ros2_subscribe_once`,
  `ros2_service_call`, `ros2_action_goal`, `ros2_param_get`/`set`,
  `ros2_camera_snapshot`, `ros2_depth_distance`).
- Three production adapters sharing one `@agenticros/core` transport:
  the OpenClaw plugin ([packages/agenticros](../packages/agenticros)),
  the Claude Code MCP server
  ([packages/agenticros-claude-code](../packages/agenticros-claude-code)),
  and the Gemini CLI
  ([packages/agenticros-gemini](../packages/agenticros-gemini)).
- A working skill system with two reference skills
  (`agenticros-skill-followme`, `agenticros-skill-find`). The
  named-capability model already works in production.
- Synchronous skill loader at
  [packages/agenticros/src/skill-loader.ts](../packages/agenticros/src/skill-loader.ts)
  — OpenClaw `register()` snapshot semantics already solved.
- Shared cross-adapter memory (mem0 + local JSON backends), described
  in [docs/memory.md](memory.md). Facts taught to one agent become
  visible to every other agent talking to the same robot.
- Four transports abstracted in
  [packages/core/src/transport/factory.ts](../packages/core/src/transport/factory.ts):
  local DDS via rclnodejs, Zenoh CDR, rosbridge, WebRTC. Each works
  without changes to skills.
- CLI bootstrap: `npx agenticros` runs a looping menu with doctor
  health checks, simulation launchers (Gazebo + RViz, 6-DOF arm), and
  real-robot launchers.
- Capability discovery node already exists at
  [ros2_ws/src/agenticros_discovery](../ros2_ws/src/agenticros_discovery)
  — the seed for the multi-robot fleet advertisement in Phase 1.

## 4. Phase 1: Capability registry + skill chaining + multi-robot fleet discovery

> **Status (2026-07):** Phase 1 is **complete** for the contract layer —
> capabilities, missions (incl. pause/resume), fleet heartbeats +
> `fleet.json`, dynamic bindings, Gemini find/follow parity, and
> `external_ros_node` dispatch with a `navigate_to` seed skill. See
> [roadmap.md](roadmap.md) and [blog/phase-1-complete.md](blog/phase-1-complete.md).

The single goal: an agent that has never seen any of our robots can
ask *"what robots are here, what can each one do, and can they do X
then Y?"* and get a structured answer it can plan against — without us
writing per-robot or per-mission code. Four sub-deliverables.

### (a) Capability schema on skills

Each `agenticros-skill-*` package (or external ROS node descriptor)
declares its capabilities — either in `package.json` under
`agenticrosSkill`, or in a sibling `capabilities.json`:

```jsonc
{
  "agenticrosSkill": true,
  "capabilities": [
    {
      "id": "follow_person",
      "verb": "follow",
      "preconditions": ["depthTopic available", "person detected"],
      "inputs":  { "target": { "type": "person | object", "optional": true } },
      "outputs": { "lost_target": "bool", "stopped_at": "Pose?" },
      "interruptible": true,
      "blocks_base": true
    }
  ]
}
```

Optional, additive: skills without the manifest still work, they just
don't participate in chained-mission planning or
`ros2_list_capabilities`.

**Design note — manifests cover both in-process Node.js skills and
external ROS-node descriptors.** Today's two reference skills
(`agenticros-skill-followme`, `agenticros-skill-find`) are TypeScript
packages loaded in-process by the AgenticROS gateway. That's the right
shape for AI-driven and hybrid skills authored from scratch. For
experienced ROS developers with existing C++ or Python nodes (Nav2
stacks, MoveIt setups, YOLO pipelines, RTAB-Map deployments), the same
`agenticrosSkill` manifest can be a descriptor that wraps the external
node:

```jsonc
{
  "id": "navigate_to",
  "verb": "navigate",
  "implementation": {
    "kind": "external_ros_node",
    "package": "nav2_bringup",
    "launch": "navigation_launch.py",
    "action": "/navigate_to_pose",
    "msg_type": "nav2_msgs/action/NavigateToPose"
  }
}
```

The capability appears in `ros2_list_capabilities` identically; the
skill author keeps their stack and their language. For in-process
skills, `implementation.kind: "in_process"` is the default and the
manifest stays minimal.

**Design note — schema is ACP/A2A-compatible.** The capability schema
deliberately mirrors the shape of inter-agent protocol "agent cards"
(ACP, A2A): `id`, human-readable name, verb, typed inputs/outputs,
preconditions. The same manifest a skill ships today will be readable
as an agent capability when we adopt an inter-agent protocol in
Phase 4 — no rewrite required.

### (b) MCP tool `ros2_list_capabilities`

Surfaces the union of all registered skill capabilities plus the
robot's intrinsic verbs (cmd_vel, camera, depth, list_topics) in one
structured response. Agents use this for high-level planning instead
of dumping topic lists into the LLM context. Added to
[packages/agenticros-claude-code/src/tools.ts](../packages/agenticros-claude-code/src/tools.ts)
and mirrored in OpenClaw and Gemini per the multi-adapter pattern.

Once Phase 2a's auto-fetch ships, the response also includes a
`discoverable: true` flag for marketplace skills not yet installed —
letting the agent propose mid-conversation installs (*"I don't see an
inventory_scan skill; want me to add
`@agenticros/inventory-scan`?"*) instead of giving up.

### (c) Skill chaining for missions

A new MCP tool `run_mission` accepts either:

- a **declarative plan** (array of `{ capability, args }` steps), or
- a **natural-language goal** that a local planner expands using the
  capability registry as context.

The mission runner sequences skill invocations, propagates outputs to
the next step's inputs, supports cancel/pause, and emits per-step
transcripts to shared memory so a second agent can resume mid-mission.
Concrete first example: *"find the red ball and follow whoever picks
it up"* chains `find_object(red ball) →
follow_robot(person, anchor=red ball pose)` with no per-mission code.

```text
run_mission({mission?, goal?, robot_id?})                [Phase 1.c+1.f+1.g, shipped]
  → pass EITHER an explicit `mission.steps[]` (precise) OR a
    natural-language `goal` (compiled by the local planner against the
    capability registry). Returns mission_id (for mission_cancel) AND,
    when a goal was provided, the compiled plan + candidate matches so
    the agent can see what the planner did. When config.memory.enabled
    is true, every step is also written to memory under namespace
    `mission:<id>`.

mission_cancel({mission_id, reason?})                    [Phase 1.f, shipped]
  → flips the cancellation token; the runner stops at the next step
    boundary, marks remaining steps as "cancelled". Idempotent; safe
    on unknown ids.
```

Phase 1.f (mission cancel + per-step transcripts to shared memory) is
implemented end-to-end across all three adapters. `runMission` accepts
a `MissionCancellationToken` and a `MissionTranscriptSink`; the
in-process `MissionRegistry` lets `mission_cancel` find the live token
by id; `createMemoryTranscriptSink(memory, missionId)` persists every
step's `MissionTranscriptEntry` under `mission:<id>` so a second agent
can `memory_recall({ namespace: "mission:<id>" })` and inspect what's
been run so far. Live-probed against the MCP server stdio surface.

Phase 1.g (natural-language → step-graph compilation) ships
`compileGoalToMission(goal, capabilities)` in `@agenticros/core` and
extends `run_mission` to accept `goal` alongside `mission`. The
compiler is rule-based + deterministic — no LLM dependency, so the
runtime has no hard requirement on Ollama and the planner's output is
testable / replayable. Today it recognises:

- **find / locate / look for / where is `<object>`** → `find_object`
- **take a picture / snapshot / what do you see** → `take_snapshot`
- **measure depth / how far** → `measure_depth`
- **follow me / follow the person** → `follow_person`
- **drive forward / backward [at N m/s] / turn left / turn right / stop** → `drive_base`
- **list topics** → `list_topics`
- **find `<object>` and drive toward it** → 2-step `find_object → drive_base`
  with `angular_z` wired to `{{find.outputs.horizontal_offset}}` so
  the robot actually steers via the detection (the canonical 1.c demo)

The planner ONLY emits capabilities present in the registry — it
never fabricates calls to skills the runtime doesn't have. On a
failed compile, the response includes the recognised-verbs summary
plus the runtime's capability list so the agent can self-correct
without an extra round-trip. An LLM-backed planner is intended to
live behind the same `compileGoalToMission` contract — Phase 2+
work. Live-probed against the MCP server stdio surface.

### (d) Multi-robot fleet discovery

Two new MCP tools and one ROS-side advertisement:

```text
ros2_list_robots()                                       [Phase 1.d, shipped]
  → every reachable robot with id, name, kind (AMR / arm / drone),
    namespace, online, capabilities[], optionally battery + location

ros2_find_robots_for({capability, kind?, online?})       [Phase 1.e, shipped]
  → ranked list filtered to robots that can perform the requested verb

run_mission({robot_id, plan})                            [Phase 1.d, shipped]
  → robot_id now required; defaults to the sole robot when only one
    is found
```

Phase 1.e (capability-aware fleet filter) is implemented on the TS side
across all three adapters (Claude Code, OpenClaw, Gemini). The CLI
`agenticros robots` family accepts `--kind`, `--sensors=has_realsense,!has_arm`,
and `--capabilities=…` so the metadata behind `ros2_find_robots_for`
is set per robot without hand-editing JSON. The matching ROS-side
heartbeat (point (d) below — `<ns>/agenticros/robot_info` published at
1 Hz with the same kind/sensors/capabilities shape) is the next sub-step.

ROS side: `agenticros_discovery` (already at
[ros2_ws/src/agenticros_discovery](../ros2_ws/src/agenticros_discovery))
publishes a heartbeat on `<namespace>/agenticros/robot_info`
containing id, human-readable name, kind, namespace, capability list,
robot capabilities (`has_realsense`, `has_lidar`, `has_arm`), and a
timestamp. The heartbeat fields are deliberately a superset of an
ACP/A2A agent card so a robot can register itself as an agent in a
cross-vendor multi-agent network when Phase 4 lands — same data,
different transport. Single-robot deployments are unaffected:
`list_robots` returns one entry, `run_mission` defaults to it.

Discovery mechanism — hybrid for Phase 1:

- **Static fleet config** (`~/.agenticros/fleet.json`) — wins if
  present. Manual but deterministic; works across any network.
- **ROS2-graph fallback** — query the ROS graph for
  `agenticros_discovery` nodes when no fleet config is set. Zero
  config, works on LAN.
- **Cloud / mesh registry** — Phase 2 topic, naturally co-located
  with `skills.agenticros.com`.

The agent's mental model shifts from *"Drive the robot forward"* →
`ros2_publish(/cmd_vel, …)` to *"Have an AMR with RealSense find the
red ball"* → `ros2_list_robots()` → pick → `run_mission(robot_id,
[{capability: "find_object", args: {target: "red ball"}}])`. Same
capability registry, multi-robot-aware.

**What's deliberately deferred past Phase 1**:

- Cross-robot coordination (robot A hands an object to robot B) —
  Phase 3+.
- Spatial selection (*"the closest robot"*) — needs spatial memory,
  Phase 3.
- Resource arbitration (two agents fighting over the same robot) —
  operational policy, post-Phase 1 once real usage shows the pattern.

## 5. Phase 2: Skills marketplace at `skills.agenticros.com`

Once skills carry capability manifests (Phase 1), a real marketplace
becomes the natural next surface. Split into two milestones so
monetization risk doesn't gate the open-source launch.

### Phase 2a — Free open-source marketplace (launch)

The mental model: today users **clone** a skill from GitHub,
**install** dependencies, and **wire** it into the OpenClaw config by
hand. Phase 2a replaces that entire dance with one config line. The
marketplace is the discovery surface; declarative auto-fetch is the
install mechanism.

**Declarative skill references + auto-fetch (the headline UX shift).**
Users list skills in `~/.agenticros/config.json` (or a shared
`fleet.json` for multi-robot deployments):

```jsonc
{
  "skills": [
    "@agenticros/follow-me@^1.2.0",
    "@agenticros/find-object@^0.3.0"
  ]
}
```

On gateway / MCP server / Gemini CLI startup: read `skills`, check
`~/.agenticros/skills-cache/<scope>/<name>/<version>/`, and if absent,
fetch via the marketplace (which resolves through npm under the hood
— re-using npm's CDN, integrity checks, and versioning). Extract to
cache, load the capability manifest, register tools. **No git clone,
no manual `pnpm install`, no hand-edited skillPackages array.** Skills
still execute in-process on the robot/gateway — auto-fetch is about
installation, not execution locality (real-time control loops can't
tolerate network round-trips per tick).

**Website.** Dedicated subdomain `skills.agenticros.com` (separate
from the main marketing site). Index of every published skill,
searchable by verb / tag / robot type / agent platform / capability.
Each skill listing shows: capability manifest from Phase 1, supported
transports, robot requirements (RealSense? LiDAR? arm?), agent
compatibility (OpenClaw / Claude / Gemini), implementation kind
(in-process Node.js vs external ROS node), README, examples, and a
one-line config snippet to copy into `skills: [...]`. The marketplace
surfaces skills along **two axes**: by verb (follow, find, navigate,
manipulate, map, detect) and by technique (AI-driven, deterministic —
VSLAM/VIO/perception/Nav2/MoveIt — or hybrid). Both new robotics
developers and experienced ROS developers can find skills that match
their world.

**Submission.** `agenticros skills publish` packages the local skill
directory, validates the capability manifest schema, signs the
metadata, publishes to npm under `@agenticros/*`, and registers
metadata with the marketplace. Authentication via the developer's npm
or GitHub account so we don't run another identity system.

**Distribution.** Skills remain npm packages under
`@agenticros/*` scope. The marketplace is a *metadata +
discovery* layer on top of npm, not a separate package host. (This
keeps day-1 infra small and lets skill authors keep familiar publish
flows.)

**CLI as convenience layer, not the primary mechanism.** `agenticros
skills search <query>` lists results from the marketplace API;
`agenticros skills add <name>` appends the skill reference to the
config and pre-warms the cache so the first launch is instant. Power
users editing `config.json` directly is equally supported. The CLI is
not required.

**Mid-mission installs.** Once Phase 1.b's `ros2_list_capabilities`
exposes `discoverable: true` entries (marketplace skills not yet
installed), agents can propose installs mid-conversation: user
confirms → CLI or OpenClaw config UI appends to `skills` → gateway
hot-reloads → next tool call works.

**Fleet rollouts.** A shared `fleet.json` is a complete declaration of
"this fleet runs these skills." Check it into git, treat it like
infrastructure-as-code. Updating 50 robots becomes a one-line config
change plus restart, not 50 SSH sessions.

### Phase 2b — Paid skills + developer commissions (follow-on)

**Paid listings.** Developers can mark a skill as paid at submission
time and set a price (one-time, per-robot-month, per-robot-year).
License keys are delivered via the developer account and declared
alongside the skill reference using the same declarative pattern from
Phase 2a:

```jsonc
{
  "skills": [
    "@agenticros/follow-me@^1.2.0",
    { "id": "@enterprise/inventory-scan@2.1.0", "license": "ent_..." }
  ]
}
```

License verification happens at skill load (gateway calls the
marketplace before extracting the cached tarball). No new install verb
required.

**App-store commission model.** 70/30 default split (developer /
platform) following the App Store, VS Code Marketplace, and OpenClaw
Hub precedent. Pricing tiers and rev-share are launch decisions for
Phase 2b, **not** Phase 2a.

**Quality bar.** Paid skills get a review pass (capability manifest
correct, no broken safety contracts, no `cmd_vel` publishes outside
declared verbs). Free skills are publishable instantly; paid skills
wait for review.

**Payouts.** Pick a payment processor (Stripe Connect is the obvious
choice) and a payout cadence at launch. Not engineered in Phase 2a.

### What Phase 2 buys AgenticROS strategically

- **Network effect** — every published skill makes the platform more
  valuable for the next user.
- **Visible developer economy** — the moment the first paid skill
  ships and earns, AgenticROS stops being "an open-source library"
  and starts being "a robotics platform with a developer ecosystem."
- **Discovery surface** — `skills.agenticros.com` is a marketing site
  that ranks for "ROS robot follow person", "ROS warehouse inventory
  robot", etc. Each skill listing is an SEO entry point we don't have
  today.

## 6. Phase 3: Spatial memory

Today's memory in [docs/memory.md](memory.md) is flat key/value.
Phase 3 promotes it to `(content, position, frame, time, confidence)`
rows so an agent can answer *"where was the wrench last seen?"* with
location + time + confidence. Two backend options to evaluate
side-by-side:

- **Local backend** — extend the existing mem0 / JSON store with
  spatial columns, query via embeddings + bounding boxes.
  Self-hosted, no external dependency.
- **NVIDIA ReMEmbR backend** — adapter onto
  [ReMEmbR (ICRA 2025)](https://nvidia-ai-iot.github.io/remembr/),
  which pairs a VILA video captioner with a position-aware vector DB
  and was demoed on Nova Carter. Natural fit on Jetson; aligns with
  NVIDIA conversations.

Packaging: ship spatial memory as a **marketplace skill**
(`@agenticros/spatial-memory`) selecting either backend per
config. Likely candidate to be the *first paid skill* on
`skills.agenticros.com` — it's a feature with clear enterprise value
(warehouse, inventory, maintenance use cases), and it doesn't gate the
open-source platform. Free/paid split decided at Phase 3 kickoff.

## 7. Phase 4: Cross-agent collaboration via an inter-agent protocol (ACP / A2A)

Phases 1-3 give one agent the ability to reason about a fleet, chain
skills into missions, and remember things spatially. Phase 4 opens the
same platform to **multiple cooperating agents from different
vendors** — a planner agent from one platform, a manipulation
specialist from another, a navigation specialist from a third —
sharing the same robots, the same memory, and the same mission state.

### Protocol landscape

- **MCP (Anthropic)** is agent ↔ **tools**. This is what AgenticROS
  already speaks via the Claude Code adapter.
- **ACP (IBM BeeAI / Linux Foundation AGNTCY)** is agent ↔ **agent**,
  REST-based, agent-manifest / capability-card model.
- **A2A (Google)** is also agent ↔ agent, JSON-RPC, capability cards,
  with broad vendor adoption.

ACP and A2A are converging on the same shape: an agent advertises a
"card" (id, capabilities, inputs, auth) and exposes endpoints for
delegation. AgenticROS will be **protocol-agnostic and adopt whichever
wins** — likely both via thin adapters once production usage clarifies
which one peers actually speak. We are deliberately not picking a
winner today.

### What Phase 4 unlocks

- **Cross-vendor delegation** — OpenClaw's planner agent delegates a
  "pick up object" sub-mission to a Claude Code agent specialized for
  manipulation, with neither side needing custom integration code for
  the other. Phase 1's `run_mission` is extended to accept `agent_id`
  per step.
- **Multi-agent missions** — for a single mission, multiple agents
  drive multiple robots cooperatively. A nav agent moves an AMR while
  a manipulator agent runs the arm; both coordinate via memory and
  mission state.
- **Attributed shared memory** — the existing mem0/local store
  becomes the *persistence* layer; ACP/A2A becomes the *communication*
  layer. Memory entries carry the agent identity that wrote them, so
  a downstream agent can ask *"what did the perception agent observe
  at 09:15?"* with full provenance.
- **Robot-as-agent** — each `agenticros_discovery` heartbeat (Phase
  1.d) gains an ACP/A2A endpoint, so external agents can discover
  robots in the network the same way they discover any other agent.

### Concrete deliverables when Phase 4 lands

- One ACP-or-A2A adapter as a new package
  (`@agenticros/inter-agent-acp` / `-a2a`), same shape as today's
  transport adapters in
  [packages/core/src/transport](../packages/core/src/transport).
- Extend `run_mission` to accept `{ agent_id, robot_id, plan }` per
  step. Local execution still works when `agent_id` is omitted.
- Memory entries gain an `agent` attribution field. Migration is
  purely additive.
- One reference scenario in the docs: OpenClaw plans, Claude Code
  executes, Gemini reflects — three vendors, one robot, one mission.

### Why not sooner

- The protocols are <12 months old in production; picking the wrong
  one or implementing too early means rework.
- Multi-agent orchestration is a deep problem; introducing it before
  single-agent-multi-robot fleet discovery (Phase 1) has shipped
  would split focus.
- The Phase 1 design note above means Phase 4 adoption is
  **additive, not a refactor** — the capability and heartbeat schemas
  are already ACP-compatible.

### What stays out of Phase 4

- Agent-to-agent payment / billing — different layer; not our domain.
- Trust / identity verification of remote agents — handled by the
  protocol layer once it standardizes; we'll consume it, not build
  it.

## 8. What we deliberately won't do

- Don't build another DDS, middleware, robot OS, or HAL — ROS won.
- Don't fork ROS, Nav2, MoveIt2, or rosbridge.
- Don't rebrand. The tagline already names what we are.
- Don't dilute the flagship OpenClaw adapter while expanding
  multi-agent.
- Don't try to win the spatial-memory research race against NVIDIA —
  partner / integrate via the ReMEmbR adapter.
- Don't invent our own inter-agent protocol. We will adopt ACP, A2A,
  or whatever the industry consolidates on — not compete with it.
- Don't pick a Phase 4 protocol winner in this memo. ACP and A2A are
  still settling; the right move today is keeping Phase 1's schemas
  compatible with both.
- Don't auto-update skills by default. Phase 2a auto-fetches
  *missing* skills at the version pinned in config; it never upgrades
  a working skill behind the user's back. Auto-update is opt-in per
  skill, and fleet operators should treat skill versions like
  infrastructure pins.
- Don't run marketplace skills remotely / "skill-as-a-service" for
  control-path skills. Real-time control on a robot can't tolerate
  per-tick network round-trips. Skills always execute in-process with
  the AgenticROS gateway.

## 9. The one concrete first move (Phase 1, week 1)

Ship a minimal `ros2_list_capabilities` MCP tool that reads the
capability manifests of our two existing skills (`follow_robot`,
`find_object`) plus the intrinsic robot verbs. Publish to npm with
the next CLI version. Write a short blog post:
*"AgenticROS Phase 1: Capabilities + Missions — AI Agents that finally
understand what your robot can do."*

### Seed catalog plan (concurrent with Phase 1 development)

To make the moat real, line up a small seed catalog of skills
spanning the spectrum so the marketplace launches non-empty and
signals to both audiences that AgenticROS welcomes their world:

- **AI-driven** (already shipped): `follow_robot`, `find_object`.
- **Deterministic — perception**: human detection skill wrapping a
  YOLO or MediaPipe pipeline (external ROS-node descriptor, no
  rewrite of the existing pipeline).
- **Deterministic — localization**: VSLAM skill wrapping RTAB-Map or
  ORB-SLAM3 (external descriptor).
- **Deterministic — odometry**: VIO skill wrapping OpenVINS or
  VINS-Mono (external descriptor).
- **Hybrid**: spatial-memory query skill (Phase 3 backend), which
  reads SLAM state plus the mem0 store and answers spatial questions
  via LLM reasoning.

The first two AI-driven skills exist today; the deterministic ones
are concrete next-skill candidates that an experienced ROS developer
can ship via the external-descriptor path with minimal
AgenticROS-specific code. Reversible if the framing misses; cheap to
author. Sets the foundation for sub-deliverables (b)-(d) in Phase 1
and primes Phase 2's marketplace launch.

## Open questions (surfaced, not answered)

### Phase 1 (decide at kickoff)

- **Capability schema location** — `package.json` `agenticrosSkill`
  block vs separate `capabilities.json`.
- **Mission runner — JS or DSL?** Start with JSON + LLM-generated
  plans; real DSL waits until we see usage.
- **Per-skill safety policies in capabilities** — `blocks_base`,
  `interruptible` in capability schema, or in a separate safety
  contract?
- **Fleet config schema** — single file (`~/.agenticros/fleet.json`)
  listing all robots with namespace + transport, or per-robot files
  in `~/.agenticros/fleet/*.json`?
- **Robot identity uniqueness** — UUID like today's `robotbb86...`,
  or human-assigned `kitchen-bot-1`? Recommendation: keep UUID as
  `id`, let users set a separate `name` field for display.
- **Heartbeat cadence** — how often does `agenticros_discovery`
  publish `robot_info`? Recommendation: 1 Hz with 5 s staleness
  window.

### Phase 2 (decide at marketplace kickoff)

- **Registry backend** — small Postgres + REST API behind
  `skills.agenticros.com`, or static GitHub-Pages-style JSON index?
  Static is simpler and fully open; dynamic is required once we add
  paid skills.
- **Identity** — npm-account based, GitHub OAuth, or new account
  system? Recommendation: reuse one of the first two to avoid running
  an identity service.
- **Marketplace governance** — single org-owned vs community /
  foundation? Defer until volume warrants.
- **Paid-skill kickoff trigger** — at what point in Phase 2 do we add
  monetization? Suggest: after the marketplace has ~10 free skills
  published by ~3 outside contributors. Avoids monetizing an empty
  market.
- **Commission split** — 70/30 (developer/platform) per App-Store
  precedent, but worth benchmarking against VS Code Marketplace +
  OpenClaw Hub at launch time.
- **Cache strategy** — `~/.agenticros/skills-cache/` eviction policy:
  LRU, never-evict, or per-version retention count? And: does the
  gateway boot in offline mode if the cache is warm but the
  marketplace is unreachable? Recommendation: never-evict by default
  + boot offline if all referenced skills are cached, since robotics
  deployments often run on intermittent networks.
- **Registry vs npm** — proxy fetches through `skills.agenticros.com`
  (telemetry, license enforcement, abuse handling) or fetch directly
  from npm (simpler, no marketplace dependency at runtime)?
  Recommendation: proxy for paid skills (needed for license check),
  direct npm for free skills.

### Phase 3

- **ReMEmbR integration depth** — vendored adapter, network call, or
  sidecar?
- **Local vs ReMEmbR backend default** — which one ships first?

### Phase 4

- **ACP vs A2A vs both** — which inter-agent protocol(s) do we adopt
  first, and when? Trigger condition: pick once a partner concretely
  asks for cross-vendor delegation, or once one protocol clearly
  leads adoption among the agents we already support.
- **Agent identity / auth model** — bearer tokens, mTLS,
  OAuth-flavored, or whatever the chosen protocol mandates?
- **Memory attribution schema** — extend the existing mem0 / local
  store with an `agent` field, or version memory entries with a
  richer provenance block (agent id + protocol + signed timestamp)?
- **`run_mission` API shape with `agent_id`** — every step carries
  its own `agent_id`, or one agent owns the whole mission with
  delegation as a separate primitive?
