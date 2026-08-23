# Fleet hive (optional)

Fleet hive is an **optional paid layer** so robots in the same organization can share what they see and remember. It is **off by default**. If you never turn it on, AgenticROS is unchanged: the same tools, no extra processes, no extra network calls.

Hive is **not** a replacement for this robot’s memory. Use `memory_*` for “remember this for **this** robot.” Use `hive_*` for “tell the **fleet**.”

Corebrum is a **separate proprietary product**. AgenticROS and ARC talk to it over HTTP only. You do not need Corebrum source, an npm/pip SDK, or a git submodule to build, test, or run AgenticROS.

---

## Owner path (start here)

Three actions only:

1. **Turn hive on.**
2. **Pick what the fleet should watch** (named recipes).
3. **See status in plain language** (“Fleet memory on. Detecting objects on warehouse-01.”).

You never write YAML, Python, Zenoh keys, or identity IDs. The CLI and agents fill those in from your ARC robot id and organization.

### How to turn it on

| Who | How |
|---|---|
| ARC (Teams / managed hosting) | Organization page: **Enable fleet hive**. Default recipes start for online robots that have a camera. |
| OpenClaw config UI | **Share with my fleet** (plus recipe checkboxes). Advanced URL is collapsed. |
| CLI | `agenticros hive on`, then `agenticros hive recipes`. |
| Chat | “Turn on fleet memory” / “Watch every camera for people” → `hive_enable` / `hive_set_recipe`. |

`agenticros hive on` writes `hive.enabled` in `~/.agenticros/config.json` and fills:

- URL → `http://127.0.0.1:6502` (or the ARC-hosted endpoint when your org uses managed hive)
- Identity → this robot’s ARC UUID
- Hive → this robot’s organization (or a local default named after the fleet)

If nothing is listening on that URL, doctor says **“Corebrum is not running.”** Robot memory and driving still work. Self-host: install from [corebrum.com](https://corebrum.com), then run `corebrum daemon` and `corebrum web`. Hive memory may also need `corebrum auth login` / `corebrum license sync` on that host. Teams orgs can skip local install — ARC hosts it.

### Recipes (the only compute UI)

Named recipes. YAML never lives in this repo and never appears in the UI.


| Id | Owner label | Watches | Writes | Never |
|---|---|---|---|---|
| `detect` | Detect objects on cameras | Camera (`camera.rgb`) | Detections + hive facts | Driving (`cmd_vel`) |
| `describe` | Describe what robots see | Camera (rate-limited) | Captions in hive | Actuation |
| `health` | Fleet health notes | `robot_info` / battery | Hive health | Actuation |

A robot without a camera hides or disables `detect` / `describe` (“needs a camera”).

Chat examples:

- “Remember this for *this* robot” → `memory_remember`
- “Remember this for *the fleet*” / “what did the other robot see?” → `hive_remember` / `hive_recall`
- “Watch for chairs” → `hive_set_recipe({ id: "detect", on: true })`, then existing find-object / missions

### Status language

Owners see sentences, not worker counts:

- “Fleet memory on. 2 robots sharing.”
- “Detecting objects on warehouse-01.”
- “Fleet memory is not available yet.”
- “Fleet memory needs a hive plan.”

`agenticros hive doctor` is for support: reachable / not reachable / needs a hive plan. It never asks you to start a sidecar or mention other product names.

Local dashboard (operators who installed the binary): [http://127.0.0.1:6502](http://127.0.0.1:6502) — an escape hatch, not required.

---

## This robot vs the fleet

| | This robot | The fleet |
|---|---|---|
| Tools | `memory_remember` / `memory_recall` / `memory_forget` / `memory_status` | `hive_remember` / `hive_recall` / `hive_forget` / `hive_status` |
| Store | AgenticROS `local` or `mem0` on this host | Hive memory on Corebrum (`:6502`) |
| Scope | One robot (default namespace) | Every robot joined to the org hive |
| Default | Off | Off |

Hive is **not** a `memory.backend`. Do not set `memory.backend` to hive. Per-robot memory stays independent.

When hive is off, adapters **do not register** `hive_*` tools and do not call `:6502`.

---

## Implementer notes

The rest of this page is for maintainers. Owners can stop above.

### Product split

- **ARC** is system of record for robot UUIDs, profiles, and orgs.
- **AgenticROS** owns actuation (`cmd_vel`, joints, Nav2, skills, safety) and per-robot memory.
- **Corebrum** (optional) owns hive memory, hive/fleet compute, and stream-reactive perception. One binary; identity/memory/hive/licensing are in-process. HTTP is **`http://127.0.0.1:6502/api/*`** only (`corebrum web`). Self-host still runs two processes from that binary: `corebrum daemon` + `corebrum web`.

Closed product: no submodule, no `npm`/`pip` `corebrum` SDK, no vendored YAML from a private tree. CI mocks HTTP and must not start Corebrum.

### Identity join

| AgenticROS / ARC | Corebrum |
|---|---|
| ARC robot UUID (`ROBOT_ID`) | `POST /api/identity` with explicit `key_id` |
| ARC `orgId` (or `hive.hiveId` / fleet name) | Hive name; stored `hive_id` after create |
| `packages/core/src/robot-profile.ts` | Read-only camera / namespace bindings |

Profiles stay on ARC / AgenticROS. Corebrum must not become a second profile store.

### Event envelope

Streams and hive writes use `agenticros.event.v1`:

```json
{
  "schema": "agenticros.event.v1",
  "robot_id": "<ARC uuid>",
  "kind": "detection | caption | health | mission | note",
  "topic": "...",
  "payload": {},
  "ts": 0
}
```

**Allow:** subscribe to camera, odom, `agenticros/robot_info`, detections, mission JSONL; publish detections, captions, hive memory, events.

**Deny (client-enforced):** `POST /api/publish` or stream outputs to `cmd_vel`, joints, gripper, or Nav2 goals. Corebrum publish is unclamped — AgenticROS never calls `/api/publish`.

### Public HTTP contract (`:6502` `/api/*` only)

Base URL default: `http://127.0.0.1:6502`. No port 6510. No `/api/v1/*`. No Cortex/sidecar routes.

**Identity and hive memory**

| Method | Path | Role |
|---|---|---|
| `POST` | `/api/identity` | Create identity (`key_id` optional; AgenticROS sends ARC uuid) |
| `GET` | `/api/identity` | List identities |
| `GET` | `/api/hives?key_id=` | List hives for a member |
| `POST` | `/api/hives?key_id=` | Create hive `{ name, description? }` → `{ hive_id, ... }` |
| `GET` | `/api/hives/{hive_id}` | Hive details |
| `PUT` | `/api/hives/{hive_id}/members/{key_id}` | Join robot as member |
| `GET` | `/api/hives/{hive_id}/memory?key_id=` | List hive facts |
| `PUT` | `/api/hives/{hive_id}/memory/{key}?key_id=` | Store a fact `{ value, memory_type? }` |
| `GET` | `/api/hives/{hive_id}/memory/{key}?key_id=` | Read one fact |
| `DELETE` | `/api/hives/{hive_id}/memory/{key}?key_id=` | Delete a fact |

**Compute (recipes use these; agents never submit raw YAML)**

| Method | Path | Role |
|---|---|---|
| `POST` | `/api/submit` | Start a hosted recipe template (`file:` HTTPS URL + interpolated input) |
| `GET` | `/api/status/{id}` | Task status |
| `GET` | `/api/results/{id}` | Task results |
| `POST` | `/api/cancel/{id}` | Cancel a task |
| `GET` | `/api/streams` | Running streams |
| `GET` | `/api/compute-capacity` | Reachability / capacity (ARC status proxy) |

**Optional later (same owner UX):** `GET`/`POST` `/api/recipes/{id}` (not `/v1/`). AgenticROS tries this first, then falls back to `/api/submit`.

**Do not call:** `/api/publish` (actuation), `/api/v1/*`, `/api/cortex/status`, `/api/v1/integration/*`, REST auth/license sync (use `corebrum auth login` / `license sync` on the Corebrum host).

Errors mapped for owners:

| HTTP / network | Owner sentence |
|---|---|
| Connection refused / timeout | Corebrum is not running. |
| 403 / license / feature denied | Fleet memory needs a hive plan. |
| Other 4xx/5xx | Fleet memory is not available yet. |

### Config

Sibling of `memory`, default off:

```json
{
  "hive": {
    "enabled": false,
    "url": "http://127.0.0.1:6502",
    "identityId": "<ARC robot uuid>",
    "hiveId": "<created hive id>",
    "recipes": {
      "detect": false,
      "describe": false,
      "health": false
    }
  }
}
```

`createHiveClient(config)` returns `null` when `enabled` is false. No production dependency is loaded.

### Tools (only when enabled)

`hive_remember`, `hive_recall`, `hive_forget`, `hive_status`, `hive_enable`, `hive_set_recipe`.

Do not expose `hive_submit` of arbitrary task files. Do not register Corebrum MCP robot verbs next to `ros2_*`. Do not dual-write hive facts into per-robot `memory_*`.

### What we will not do

- Require Corebrum to build, test, or run AgenticROS / ARC
- Ask owners for URLs, `key_id`s, or YAML
- Vendor or CI-clone the private Corebrum git tree
- Replace `local` / `mem0` or share robot memory by overwriting `memory.namespace`
- Publish Twist / joints from hive workers
