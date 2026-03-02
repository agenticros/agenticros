# RosClaw to AgenticROS: Architectural Differences

This document summarizes the main architectural and structural differences between the **RosClaw** project and the **AgenticROS** project. AgenticROS is a complete rewrite of the ROSClaw project.  OpenClaw integration around a **core + adapters** design to support multiple AI agent platforms in the future.

---

## 1. Core vs. Adapter Split (Multi-Platform Ready)

| Aspect | RosClaw | AgenticROS |
|--------|---------|------------|
| **Structure** | Single OpenClaw plugin containing transport, config, and all OpenClaw-specific code in one tree. | **Core** (platform-agnostic) + **OpenClaw adapter** (and room for other adapters). |
| **Transport & config** | Live inside the plugin (`extensions/openclaw-plugin/src/transport/`, `config.ts`). | Live in **`packages/core`** (`@agenticros/core`). No OpenClaw imports in core. |
| **OpenClaw plugin** | Owns the full stack. | Thin **adapter**: implements OpenClaw plugin API, uses core for transport/config, registers tools/commands/routes that delegate to core. |

**AgenticROS layout:**

- **`packages/core`** — ROS2 transport (rosbridge, Zenoh, local, WebRTC), Zod config schema, shared types. Used by all adapters.
- **`packages/openclaw`** — OpenClaw plugin only; depends on `@agenticros/core`. Same feature set as RosClaw’s plugin, but with a clear separation.

---

## 2. Monorepo Layout

| Aspect | RosClaw | AgenticROS |
|--------|---------|------------|
| **Node packages** | `extensions/openclaw-plugin/`, optional `extensions/openclaw-canvas/`. Workspace under `extensions/`. | `packages/core` and `packages/openclaw` under `packages/`. |
| **npm scope** | `@rosclaw/` (e.g. `@rosclaw/openclaw-plugin`). | `@agenticros/` (e.g. `@agenticros/core`, `@agenticros/openclaw`). |
| **ROS2 workspace** | `ros2_ws/src/rosclaw_*`. | `ros2_ws/src/agenticros_*` (same structure, renamed packages and topics). |

---

## 3. Transport and Config Ownership

| Aspect | RosClaw | AgenticROS |
|--------|---------|------------|
| **Transport** | Implemented inside the plugin. | Implemented in **core**; adapter calls `createTransport()` from `@agenticros/core`. |
| **Config schema** | Zod schema in plugin `config.ts`. | Zod schema in **core**; adapter may re-export or extend. |
| **Config file** | Plugin reads/writes OpenClaw config (e.g. `plugins.entries.rosclaw`). | Adapter reads/writes `plugins.entries.agenticros`; core only defines the config shape. |
| **Topic helpers** | e.g. `toNamespacedTopic` in plugin. | In **core**; adapter imports from `@agenticros/core`. |

---

## 4. Plugin as Thin Adapter

In RosClaw, the plugin owned the full stack. In AgenticROS:

- The OpenClaw package **implements** the OpenClaw plugin contract (`id`, `name`, `register(api)`).
- It **uses** core for: config parsing, transport creation, topic namespacing, and any shared utilities.
- It **registers** tools, commands, hooks, and HTTP routes that call into core. No duplicate transport or config logic.

The same capabilities (transport modes, tools, Follow Me, teleop, config page, etc.) are preserved, with a clear boundary: **core = ROS2 + config; adapter = OpenClaw API**.

---

## Summary

For project layout and conventions, see the root [CLAUDE.md](../CLAUDE.md) and [README.md](../README.md) in the AgenticROS repository.
