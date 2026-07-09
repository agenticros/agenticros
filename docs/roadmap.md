# AgenticROS Roadmap

> Dual roadmap for the open-source platform and monetizable services.
> Complements the positioning memo in
> [strategy-ai-agents-plus-ros.md](strategy-ai-agents-plus-ros.md).
> Strategy answers *why* and *what phases*; this doc answers *what to
> ship next* for advanced physical AI and for users/developers.

**Last updated:** 2026-07-09

---

## Positioning (one paragraph)

AgenticROS accelerates physical AI by giving AI agents a body: agents
(Grok, OpenClaw, Claude, Codex, Gemini, …) see through RealSense and
other sensors, act through ROS 2 (`cmd_vel`, actions, services), and
compose behavior via a **skills marketplace**, **mission chaining**, and
**cross-agent memory**. The open-source core is the agent↔ROS contract
layer. Paid services sit on discovery, fleet ops, hosted memory, and
premium skills — never on the real-time control path.

---

## Where we are today

| Area | Status |
|------|--------|
| Transports (local, Zenoh, rosbridge, WebRTC) | Shipped |
| Adapters (OpenClaw, MCP/Codex/Claude, Gemini) | Shipped |
| Core tools + camera/depth | Shipped |
| Capabilities, `run_mission`, NL planner, cancel | Phase 1 largely shipped |
| Fleet list / find-for / per-robot transport | Phase 1 largely shipped |
| Skills marketplace (metadata + git install) | Live at [skills.agenticros.com](https://skills.agenticros.com) |
| Cross-adapter memory (local / mem0) | Shipped, off by default |
| Safety (velocity clamps, OpenClaw `/estop`) | Baseline shipped |
| External ROS-node skill loader | Design only |
| Nav2 / MoveIt / SLAM first-class verbs | Not yet |
| Marketplace auto-fetch + paid licenses | Not yet |
| Spatial memory | Phase 3 (planned) |
| ACP / A2A multi-agent mesh | Phase 4 (planned) |

**Highest-leverage gaps for advanced physical AI**

1. No first-class Nav2 / MoveIt / SLAM verbs — agents fall back to raw topics/actions.
2. `external_ros_node` manifests are design-only — blocks the experienced ROS audience.
3. Missions are sequential; cancel only at step boundaries.
4. Memory is flat facts, not spatial.
5. Safety is mostly velocity clamps — no workspace bounds or cmd_vel arbitration.
6. Sim has no nav stack; arm/MoveIt WIP — hard to CI embodied behaviors.
7. Marketplace install is still clone + build.
8. Observability is logs/transcripts — no mission dashboard or fleet health UI.

---

## Guiding principles

**Open source**

- Transports, safety clamps, capability/mission contracts, basic memory,
  and seed skills stay free forever.
- Skills always execute **in-process** on the gateway/robot (no
  skill-as-a-service for control loops).
- Auto-fetch installs pinned versions; never auto-upgrades by default.

**Commercial**

- Monetize discovery, sync, fleet ops, premium skills, and hosted
  memory — not a tax on embodiment itself.
- Cloud is optional; edge-first deployments must keep working offline
  when the skills cache is warm.
- Paid skills get a review bar (manifest correctness, safety contracts);
  free skills publish instantly.

---

## Roadmap 1 — Open source

Goal: make AgenticROS the default **open contract + skill catalog** for
embodied agents.

### Near term (0–3 months) — Production-grade Phase 1

| # | Deliverable | Why |
|---|-------------|-----|
| 1 | **External ROS-node skill loader** (`implementation.kind: "external_ros_node"`) | Lets ROS developers wrap Nav2 / YOLO / RTAB-Map without a TypeScript rewrite |
| 2 | **Seed deterministic skills** — `navigate_to` (Nav2), `detect_humans` (YOLO/MediaPipe), `start_slam` (RTAB-Map) | Unlocks advanced physical AI verbs agents can plan against |
| 3 | **Mission runner v2** — parallel steps (where safe), retry/backoff, pause/resume, mid-step cancel for interruptible skills | Complex missions need recovery, not only happy-path sequences |
| 4 | **Optional LLM planner** behind the same `compileGoalToMission` contract | Rule-based planner stays default; LLM expands coverage without changing the API |
| 5 | **Safety depth** — workspace/geofence checks, `blocks_base` cmd_vel mutex, MCP estop parity | Baseline for multi-agent / multi-skill contention |
| 6 | **Sim maturity** — Nav2 in Gazebo AMR, `/odom` bridge fix, headless CI, “mission CI” recipe | Prerequisite for reliable physical-AI development loops |
| 7 | **Marketplace UX (Phase 2a)** — declarative `skills: [...]` auto-fetch into `~/.agenticros/skills-cache/`, `discoverable: true` in `ros2_list_capabilities`, hot-reload | Removes the clone/build cliff; agents can propose mid-conversation installs |
| 8 | **Observability baseline** — structured mission JSONL, `mission_status` tool, simple local view of recent missions / heartbeats | Debuggability for users and skill authors |
| 9 | **Doc / DX polish** — fix architecture “stub” drift, stale mission comments, stronger `agenticros doctor` | Trust and time-to-first-embodiment |

### Mid term (3–9 months) — Physical AI substrate

| # | Deliverable | Why |
|---|-------------|-----|
| 10 | **Broader seed catalog** — VSLAM/VIO, basic MoveIt pick/place, depth→stop, docking, battery-aware behaviors | Catalog compounds; marketplace launches non-empty for both audiences |
| 11 | **Spatial memory (OSS)** — schema `(content, pose, frame, time, confidence)`; local backend first; optional ReMEmbR adapter as a skill | Answers “where was the wrench?”; enables closest-robot selection |
| 12 | **Fleet as IaC** — first-class `fleet.json` (robots + skills + transports), richer discovery | Treat fleets like infrastructure |
| 13 | **Cross-robot handoff missions** — A finds → B navigates / approaches | First real multi-robot physical AI demos |
| 14 | **Closed-loop templates** — sense → decide → act → verify; recovery skills (`replan`, `return_home`, `ask_human`) | Agents need failure modes, not only demos |
| 15 | **Memory attribution** — `agent_id` / adapter on writes | Multi-agent embodiment without confusion |
| 16 | **More adapters** — LangGraph / Cursor / Cline / OpenAI Agents SDK thin adapters | Network effect without fragmenting the skill contract |

### Longer term (9–18 months) — Multi-agent body

| # | Deliverable | Why |
|---|-------------|-----|
| 17 | **ACP / A2A adapters** (protocol-agnostic; adopt what peers speak) | Cross-vendor delegation without custom glue |
| 18 | **`run_mission` with `agent_id` per step** | Planner agent + specialist agents on one robot/fleet |
| 19 | **World-model hooks** — map + object graph APIs skills publish into | “What changed since yesterday?” over shared state |
| 20 | **Hardware bringup kits** — reference AMR + RealSense, Jetson/NemoClaw, arm golden demos | Reduce time-to-first-embodiment for new users |

### OSS non-goals (unchanged from strategy)

- Do not build another DDS / robot OS / HAL — ROS won.
- Do not fork Nav2, MoveIt2, or rosbridge.
- Do not invent a proprietary inter-agent protocol.
- Do not require cloud for local Twist / safety loops.

---

## Roadmap 2 — Paid / monetizable services

Goal: revenue that funds the OSS core and creates a developer economy,
without making real-time control a SaaS round-trip.

### Tier A — Marketplace economy

| Product | Model | Notes |
|---------|--------|--------|
| **Paid skills** | One-time, per-robot-month, or per-robot-year; ~70/30 developer/platform | License check at load; Stripe Connect for payouts |
| **Verified / featured listings** | Listing fee or rev-share boost | Trust + SEO for Nav2 / warehouse / inventory skills |
| **Private org catalogs** | Org / seat subscription | Internal `@org/*` skills for enterprise fleets |
| **Skill CI / signing** | Per-publish or org plan | Signed manifests, SBOM, “works on these robots” badges |

**First paid skill candidates:** spatial memory, warehouse inventory
scan, docking, MoveIt pick templates, fleet analytics exporters.

**Kickoff trigger (from strategy):** ~10 free skills from ~3 outside
contributors before turning on paid listings — avoid monetizing an
empty market.

### Tier B — Cloud control plane (fleet SaaS)

| Product | Model | Notes |
|---------|--------|--------|
| **Fleet registry & remote ops** | Per-robot / month | Cloud discovery (extends Mode C WebRTC), online status, capability inventory, remote mission dispatch |
| **Mission console** | Included in fleet plan or add-on | Live timeline, cancel, replay, multi-agent attribution |
| **Hosted signaling / TURN** | Usage-based | Productize Mode C for NAT; keep data plane optional (edge-first) |
| **Config & skill rollout** | Fleet plan | Push `fleet.json` / skill versions to N robots; audit log |

Natural upsell once OSS fleet tools exist: “run a warehouse from
OpenClaw / Grok.”

### Tier C — Memory & intelligence

| Product | Model | Notes |
|---------|--------|--------|
| **Hosted semantic memory** | Per-robot or per-GB | Cross-site sync, backup, retention — local mem0/JSON stays free |
| **Spatial memory cloud** | Premium | Map-linked recall, multi-robot shared maps, ReMEmbR-class pipelines |
| **Embedder / VLM gateway** | Usage | Optional cloud embeddings/VLM when Ollama isn’t available |
| **Mission transcript vault** | Retention add-on | Compliance, debugging; customer-owned data |

### Tier D — Support, hardware, services

| Product | Model |
|---------|--------|
| **Support / SLA** | Annual for teams integrating AgenticROS |
| **Certified robot profiles** | Partner fee (“AgenticROS Ready” OEMs) |
| **Professional services** | Custom skill packs, plant integration |
| **Training / certification** | Skill-author courses |

### Commercial sequence

| Window | Focus |
|--------|--------|
| **0–3 months** | Marketplace auto-fetch still free; soft-launch paid skill licenses + Stripe Connect once quality catalog exists |
| **3–6 months** | Fleet cloud registry + mission console (Mode C productization) |
| **6–12 months** | Hosted / spatial memory as enterprise wedge |
| **12+ months** | Private catalogs, certified OEMs, ACP/A2A “agent mesh” for enterprises |

---

## How the two roadmaps reinforce each other

```text
OSS contract (capabilities, missions, safety, seed skills)
        ↓ compounds
Marketplace catalog (free + paid)
        ↓ needs ops
Fleet cloud + mission console
        ↓ needs continuity
Hosted / spatial memory + multi-agent mesh
```

| Strategy phase | OSS focus | Paid focus |
|----------------|-----------|------------|
| **Phase 1** (mostly done) | Harden missions, external ROS nodes, safety, sim | — |
| **Phase 2a** | Auto-fetch, discoverable skills | — |
| **Phase 2b** | Client license hooks (open) | Paid skills + commissions |
| **Phase 3** | Spatial memory schema + local backend | Hosted spatial memory / first paid skill |
| **Phase 4** | ACP/A2A adapters | Enterprise agent-mesh / private fleets |

---

## If we only do five things next

1. Ship **external ROS-node skills** + Nav2 / YOLO / SLAM seed catalog.
2. Finish **marketplace auto-fetch** + discoverable capabilities.
3. Mission runner **retries / parallel / resume**.
4. **Spatial memory** (OSS schema first; paid hosted later).
5. **Fleet mission console** as the first real SaaS surface on top of Mode C.

---

## Related docs

- [Strategy: AI Agents + ROS](strategy-ai-agents-plus-ros.md) — positioning, phases, non-goals, open questions
- [Missions](missions.md) — capability chaining and fleet orchestration today
- [Skills](skills.md) — skill contract and marketplace install/publish
- [Memory](memory.md) — cross-adapter memory backends and recipes
- [Simulation](simulation.md) — Gazebo AMR / arm status and sharp edges
- [Architecture](architecture.md) — transports and deployment modes
- [CLI](cli.md) — `agenticros` commands including robots and skills
