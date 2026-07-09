# AgenticROS Documentation

AgenticROS connects AI agent platforms to ROS2 robots through a shared core, transport adapters, and platform-specific integrations. These docs cover setup, architecture, transport modes, operator workflows, skills, memory, simulation, and troubleshooting.

## Start here

- [Architecture](architecture.md) - system layers, deployment modes, transport abstraction, and data flow.
- [Robot setup](robot-setup.md) - robot-side prerequisites, launch steps, OpenClaw plugin setup, and quick checks.
- [Local VLM / Ollama](local-vlm.md) - run OpenClaw or Hermes with local vision models (no cloud API keys).
- [MCP client setup](mcp-setup.md) - unified `agenticros mcp setup` for Codex, Hermes, and Claude.
- [Codex CLI setup](codex-setup.md) - register the AgenticROS MCP server for OpenAI Codex (`agenticros codex setup`).
- [Hermes Agent setup](hermes-setup.md) - register the AgenticROS MCP server for Hermes (`agenticros hermes setup`).
- [CLI reference](cli.md) - `agenticros` commands (including `mcp setup` / `mcp doctor`, `codex`, `hermes`, `claude`), state locations, environment variables, and troubleshooting.
- [Simulation](simulation.md) - local simulation workflow, available simulated tools, sensor formats, and CI notes.

## Core features

- [Camera support](cameras.md) - supported ROS image message types and RealSense notes.
- [Teleop web app](teleop.md) - opening the teleop page, config, requirements, and HTTP API reference.
- [Memory](memory.md) - cross-adapter long-term memory, backends, recipes, and verification steps.
- [Skills](skills.md) - skill contracts, marketplace install flow, manual install, and publishing guidance.

## Transports and deployments

- [Zenoh setup](zenoh-agenticros.md) - Mode D setup with `zenohd`, remote API, bridge configuration, teleop, and troubleshooting.
- [NVIDIA NemoClaw](nemoclaw.md) - installing NemoClaw, adding ROS2, RealSense, and AgenticROS, plus daily operating commands.
- [OpenClaw releases and plugin routes](openclaw-releases-and-plugin-routes.md) - route behavior, release notes, auth logs, and plugin loading issues.

## Troubleshooting

- [Robot not receiving `cmd_vel`](robot-not-receiving-cmd-vel.md) - robot-side checks when commands publish but the robot does not move.
- [Zenoh troubleshooting](zenoh-agenticros.md#troubleshooting) - gateway logs, bridge issues, and router connectivity.
- [Robot setup troubleshooting](robot-setup.md#troubleshooting) - common setup and launch problems.

## Planning and strategy

- [Roadmap](roadmap.md) - open-source and paid-services roadmaps for advanced physical AI (near / mid / long term).
- [Strategy: AI Agents + ROS](strategy-ai-agents-plus-ros.md) - product direction, phases, marketplace plans, spatial memory, and cross-agent collaboration.

## Diagrams

- [AgenticROS architecture PNG](agenticros-architecture.png)
- [AgenticROS architecture SVG](agenticros-architecture.svg)
- [AgenticROS system flow PNG](agenticros-system-flow.png)
- [AgenticROS system flow SVG](agenticros-system-flow.svg)

## Repository context

The main packages are organized as:

- `packages/core` - transport interfaces, config schema, shared types, and transport factories.
- `packages/ros-camera` - shared camera snapshot encoding.
- `packages/agenticros` - OpenClaw plugin, config UI, tools, routes, and teleop.
- `packages/agenticros-claude-code` - MCP server used by Codex, Hermes, and other MCP clients.
- `packages/agenticros-gemini` - Gemini CLI adapter.
- `ros2_ws/src` - ROS2 messages, discovery, WebRTC agent, and robot-side mission nodes.

For build commands and contributor conventions, see the repository root instructions and package READMEs.
