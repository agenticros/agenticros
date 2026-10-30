# MCP client setup (Codex, Hermes, Claude, Antigravity)

Corebrum Synapse ships one MCP server (`@corebrum/claude-code`) that registers with every MCP-capable client. Use **`synapse mcp setup`** to configure all hosts at once, or the per-client aliases (`codex`, `hermes`, `claude`, `agy`) when you only need one.

**Not covered here:** OpenClaw (plugin install via `synapse init`) and the Gemini API CLI (`synapse-gemini`, which needs `GEMINI_API_KEY`). Antigravity CLI (`agy`) is an MCP client and is covered here; it uses your Antigravity subscription instead of an API key.

## Quick setup

```bash
# Configure Codex, Hermes, Claude, and Antigravity in one step
synapse mcp setup

# Verify all MCP configs
synapse mcp doctor
synapse doctor
```

`synapse init` offers the same unified MCP step during first-time setup.

## What gets written

| Host | Global config | Project config (when run from a repo) |
|------|---------------|----------------------------------------|
| **Codex** | `~/.codex/config.toml` | `.codex/config.toml` |
| **Hermes** | `~/.hermes/config.yaml` | — |
| **Claude** | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) | `.mcp.json` |
| **Antigravity** | `~/.gemini/config/mcp_config.json` plus `~/.gemini/antigravity-cli/skills/synapse/SKILL.md` | `.agents/mcp_config.json` plus `.agents/skills/synapse/SKILL.md` |

Every entry uses an **absolute path** to the MCP server binary and leaves `SYNAPSE_ROBOT_NAMESPACE` empty so `synapse mode real|sim` drives the active robot namespace.

## Flags

### `synapse mcp setup`

| Flag | Effect |
|------|--------|
| (default) | All four hosts; project configs when run inside a Corebrum Synapse repo |
| `--codex` | Codex global config only |
| `--hermes` | Hermes global config only |
| `--claude` | Claude Desktop + project `.mcp.json` (when in a repo) |
| `--agy` | Antigravity global config only (add `--project` for `.agents/mcp_config.json`) |
| `--project` | Also write project-scoped Codex / Claude / Antigravity configs |
| `--desktop` | With `--claude`, Claude Desktop config only |

### `synapse mcp doctor`

| Flag | Effect |
|------|--------|
| (default) | Check all hosts |
| `--codex` / `--hermes` / `--claude` / `--agy` | Check one host only |
| `--json` | Machine-readable output |

## Per-client aliases

These delegate to the same logic as `mcp setup` / `mcp doctor`:

```bash
synapse codex setup [--project]
synapse codex doctor

synapse hermes setup
synapse hermes doctor

synapse claude setup [--desktop] [--project]
synapse claude doctor

synapse agy setup
synapse agy doctor
synapse agy run "<prompt>" [--yes] [--model <model>]
```

## After setup

| Client | Verify |
|--------|--------|
| Codex | `/mcp` in a Codex session |
| Hermes | `/reload-mcp` or `hermes mcp test synapse` |
| Claude Code | `claude` from the project directory (reads `.mcp.json`) |
| Claude Desktop | Restart the app fully (Cmd+Q on macOS) |
| Antigravity | `/mcp` in an `agy` session. Sign in once with interactive `agy` before `synapse agy run` |
| Grok and Claude Code on Omarchy | [Omarchy host](omarchy.md). Register with `grok mcp add` and `claude mcp add --scope user`. |

## Related docs

- [Codex CLI setup](codex-setup.md)
- [Hermes Agent setup](hermes-setup.md)
- [Antigravity CLI setup](agy-setup.md)
- [CLI reference](cli.md)
- [Claude Code MCP server README](../packages/synapse-claude-code/README.md)
- [Omarchy host (Grok and Claude Code)](omarchy.md)
