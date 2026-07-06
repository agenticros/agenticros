# MCP client setup (Codex, Hermes, Claude)

AgenticROS ships one MCP server (`@agenticros/claude-code`) that registers with every MCP-capable client. Use **`agenticros mcp setup`** to configure all hosts at once, or the per-client aliases (`codex`, `hermes`, `claude`) when you only need one.

**Not covered here:** OpenClaw (plugin install via `agenticros init`) and Gemini (function calling, not MCP).

## Quick setup

```bash
# Configure Codex, Hermes, and Claude in one step
agenticros mcp setup

# Verify all MCP configs
agenticros mcp doctor
agenticros doctor
```

`agenticros init` offers the same unified MCP step during first-time setup.

## What gets written

| Host | Global config | Project config (when run from a repo) |
|------|---------------|----------------------------------------|
| **Codex** | `~/.codex/config.toml` | `.codex/config.toml` |
| **Hermes** | `~/.hermes/config.yaml` | — |
| **Claude** | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) | `.mcp.json` |

Every entry uses an **absolute path** to the MCP server binary and leaves `AGENTICROS_ROBOT_NAMESPACE` empty so `agenticros mode real|sim` drives the active robot namespace.

## Flags

### `agenticros mcp setup`

| Flag | Effect |
|------|--------|
| (default) | All three hosts; project configs when run inside an AgenticROS repo |
| `--codex` | Codex global config only |
| `--hermes` | Hermes global config only |
| `--claude` | Claude Desktop + project `.mcp.json` (when in a repo) |
| `--project` | Also write project-scoped Codex / Claude configs |
| `--desktop` | With `--claude`, Claude Desktop config only |

### `agenticros mcp doctor`

| Flag | Effect |
|------|--------|
| (default) | Check all hosts |
| `--codex` / `--hermes` / `--claude` | Check one host only |
| `--json` | Machine-readable output |

## Per-client aliases

These delegate to the same logic as `mcp setup` / `mcp doctor`:

```bash
agenticros codex setup [--project]
agenticros codex doctor

agenticros hermes setup
agenticros hermes doctor

agenticros claude setup [--desktop] [--project]
agenticros claude doctor
```

## After setup

| Client | Verify |
|--------|--------|
| Codex | `/mcp` in a Codex session |
| Hermes | `/reload-mcp` or `hermes mcp test agenticros` |
| Claude Code | `claude` from the project directory (reads `.mcp.json`) |
| Claude Desktop | Restart the app fully (Cmd+Q on macOS) |

## Related docs

- [Codex CLI setup](codex-setup.md)
- [Hermes Agent setup](hermes-setup.md)
- [CLI reference](cli.md)
- [Claude Code MCP server README](../packages/agenticros-claude-code/README.md)
