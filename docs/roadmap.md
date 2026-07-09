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
| Capabilities, `run_mission`, NL planner, cancel, pause/resume | Shipped |
| Mission retries / backoff + mid-step cancel (interruptible) | Shipped |
| Fleet list / find-for / heartbeat online / `fleet.json` | Shipped |
| Dynamic mission bindings + Gemini find/follow | Shipped |
| External ROS-node skill loader | Shipped |
| Seed catalog — `navigate_to`, `detect_humans`, `start_slam` / stop / save, `follow_person_ros` (adjacent repos) | Shipped |
| `skillRefs` + `~/.agenticros/skills-cache/` (git + npm) | Shipped |
| Discoverable marketplace capabilities in `ros2_list_capabilities` | Shipped |
| Marketplace npm `@agenticros-skills/*` + CLI auto-restart | Shipped (true mid-session hot-reload still blocked on OpenClaw) |
| Skills marketplace (metadata + git/npm install) | Live at [skills.agenticros.com](https://skills.agenticros.com) |
| Cross-adapter memory (local / mem0) | Shipped, off by default |
| Safety (velocity clamps, OpenClaw `/estop`) | Baseline shipped |
| Published packages | `@agenticros/core` **0.8.0**, CLI `agenticros` **0.5.0** |
| Parallel mission steps + true hot-reload + paid licenses | Planned |
| Spatial memory | Planned |
| ACP / A2A multi-agent mesh | Planned |

**Highest-leverage gaps for advanced physical AI**

1. Seed catalog still thin on **MoveIt** / docking / richer Nav2 variants (detect / slam / follow-ros / navigate shipped).
2. Missions are sequential — **parallel** step groups still deferred (retries + mid-step cancel shipped).
3. Memory is flat facts, not spatial.
4. Safety is mostly velocity clamps — no workspace bounds or cmd_vel arbitration.
5. Sim has no nav stack; arm/MoveIt WIP — hard to CI embodied behaviors.
6. True mid-session OpenClaw tool injection (without gateway restart) still open.
7. Observability is logs/transcripts — no mission dashboard or fleet health UI.

Write-ups: [contract layer](blog/phase-1-complete.md) · [seed catalog & skillRefs](blog/seed-catalog-and-skillrefs.md).

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

### Shipped — contract layer + marketplace UX v2 + mission runner v2 (partial)

- **Contract:** capabilities, missions (pause/resume + cancel + retries +
  mid-step cancel for interruptible skills), fleet heartbeats /
  `fleet.json`, dynamic bindings, Gemini find/follow,
  `external_ros_node` dispatch.
- **Seeds (adjacent repos):** `@agenticros-skills/navigate-to`,
  `detect-humans`, `start-slam`, `follow-me-ros` (MoveIt pick remains an
  examples stub until sim-arm).
- **Marketplace UX v1+v2:** `skillRefs` → `~/.agenticros/skills-cache/`
  (git **and** npm pack), discoverable caps, CLI install prefers npm when
  advertised, auto-restarts OpenClaw gateway (`--no-restart` to skip).
  True mid-session tool injection still blocked on OpenClaw sync register.

See [missions.md](missions.md), [skills.md](skills.md),
[blog/phase-1-complete.md](blog/phase-1-complete.md), and
[blog/seed-catalog-and-skillrefs.md](blog/seed-catalog-and-skillrefs.md).

### Near term (0–3 months) — Harden + deepen the catalog

| # | Deliverable | Why |
|---|-------------|-----|
| 1 | **Deeper seed skills** — MoveIt pick (when sim-arm ready), more Nav2 variants, richer SLAM save/load, docking | Detect / slam / follow-ros / navigate shipped; catalog still thin for manipulation |
| 2 | **Mission parallel steps** — DAG / parallel groups where safe (`blocks_base` mutex) | Retries + mid-step cancel shipped; parallel still deferred |
| 3 | **Optional LLM planner** behind the same `compileGoalToMission` contract | Rule-based planner stays default; LLM expands coverage without changing the API |
| 4 | **Safety depth** — workspace/geofence checks, `blocks_base` cmd_vel mutex, MCP estop parity | Baseline for multi-agent / multi-skill contention |
| 5 | **Sim maturity** — Nav2 in Gazebo AMR, `/odom` bridge fix, headless CI, “mission CI” recipe | Prerequisite for reliable physical-AI development loops |
| 6 | **True OpenClaw hot-reload** — mid-session tool injection without gateway restart | npm + auto-restart shipped; needs OpenClaw upstream contract |
| 7 | **Observability baseline** — structured mission JSONL, `mission_status` tool, simple local view of recent missions / heartbeats | Debuggability for users and skill authors |
| 8 | **Doc / DX polish** — architecture drift, stronger `agenticros doctor`, keep published CLI free of `workspace:` deps | Trust and time-to-first-embodiment |

### Mid term (3–9 months) — Physical AI substrate

| # | Deliverable | Why |
|---|-------------|-----|
| 9 | **Broader seed catalog** — VSLAM/VIO, basic MoveIt pick/place, depth→stop, docking, battery-aware behaviors | Catalog compounds; marketplace launches non-empty for both audiences |
| 10 | **Spatial memory (OSS)** — schema `(content, pose, frame, time, confidence)`; local backend first; optional ReMEmbR adapter as a skill | Answers “where was the wrench?”; enables closest-robot selection |
| 11 | **Richer fleet IaC** — robots + skills + transports in `fleet.json`, richer discovery | Treat fleets like infrastructure (basic `fleet.json` already shipped) |
| 12 | **Cross-robot handoff missions** — A finds → B navigates / approaches | First real multi-robot physical AI demos |
| 13 | **Closed-loop templates** — sense → decide → act → verify; recovery skills (`replan`, `return_home`, `ask_human`) | Agents need failure modes, not only demos |
| 14 | **Memory attribution** — `agent_id` / adapter on writes | Multi-agent embodiment without confusion |
| 15 | **More adapters** — LangGraph / Cursor / Cline / OpenAI Agents SDK thin adapters | Network effect without fragmenting the skill contract |

### Longer term (9–18 months) — Multi-agent body

| # | Deliverable | Why |
|---|-------------|-----|
| 16 | **ACP / A2A adapters** (protocol-agnostic; adopt what peers speak) | Cross-vendor delegation without custom glue |
| 17 | **`run_mission` with `agent_id` per step** | Planner agent + specialist agents on one robot/fleet |
| 18 | **World-model hooks** — map + object graph APIs skills publish into | “What changed since yesterday?” over shared state |
| 19 | **Hardware bringup kits** — reference AMR + RealSense, Jetson/NemoClaw, arm golden demos | Reduce time-to-first-embodiment for new users |

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
| **0–3 months** | Free skillRefs auto-fetch live; soft-launch paid skill licenses + Stripe Connect once quality catalog exists |
| **3–6 months** | Fleet cloud registry + mission console (Mode C productization) |
| **6–12 months** | Hosted / spatial memory as enterprise wedge |
| **12+ months** | Private catalogs, certified OEMs, ACP/A2A “agent mesh” for enterprises |

---

## How the two roadmaps reinforce each other

```text
OSS contract (capabilities, missions, safety, seed skills)   ← shipped
        ↓ compounds
Marketplace UX v1 (skillRefs, discoverable)                  ← shipped
        ↓ compounds
Marketplace UX v2 (npm @agenticros-skills/* + auto-restart)  ← shipped
        ↓ needs ops
Fleet cloud + mission console
        ↓ needs continuity
Hosted / spatial memory + multi-agent mesh
```

| Theme | OSS focus | Paid focus |
|-------|-----------|------------|
| **Contract layer** (shipped) | Capabilities, missions, fleet, external ROS nodes | — |
| **Marketplace UX v1** (shipped) | `skillRefs`, skills-cache, discoverable caps | — |
| **Marketplace UX v2** (shipped) | npm `@agenticros-skills/*`, CLI auto-restart | — |
| **True hot-reload** | Mid-session OpenClaw tool injection | — |
| **Marketplace economy** | Client license hooks (open) | Paid skills + commissions |
| **Spatial memory** | Schema + local backend | Hosted spatial memory / first paid skill |
| **Multi-agent mesh** | ACP/A2A adapters | Enterprise agent-mesh / private fleets |

---

## If we only do five things next

1. **MoveIt / docking / richer Nav2** seeds (and finish marketplace submit for any remaining listings).
2. **Mission parallel steps** (retries + mid-step cancel already shipped).
3. **True OpenClaw hot-reload** (npm + auto-restart already shipped).
4. **Spatial memory** (OSS schema first; paid hosted later).
5. **Fleet mission console** as the first real SaaS surface on top of Mode C.

---

## Related docs

- [Strategy: AI Agents + ROS](strategy-ai-agents-plus-ros.md) — positioning, phases, non-goals, open questions
- [Blog: contract layer](blog/phase-1-complete.md) — capabilities, missions, fleet, external skills
- [Blog: seed catalog & skillRefs](blog/seed-catalog-and-skillrefs.md) — external seeds, auto-fetch, discoverable capabilities
- [Missions](missions.md) — capability chaining and fleet orchestration today
- [Skills](skills.md) — skill contract and marketplace install/publish
- [Memory](memory.md) — cross-adapter memory backends and recipes
- [Simulation](simulation.md) — Gazebo AMR / arm status and sharp edges
- [Architecture](architecture.md) — transports and deployment modes
- [CLI](cli.md) — `agenticros` commands including robots and skills
