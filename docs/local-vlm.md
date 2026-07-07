# Local VLM inference (Ollama)

Run AgenticROS **without cloud LLM API keys** by pointing your agent platform at **Ollama** on the same machine (or LAN). AgenticROS handles ROS 2 tools, safety clamps, and skills; **OpenClaw** (or Hermes) chooses which model reasons and calls those tools.

```
You → OpenClaw / Hermes (Ollama qwen3-vl) → AgenticROS plugin → ROS 2 → Robot
```

No OpenAI, Anthropic, or Google key is required for the **robot control loop** when inference stays on Ollama.

## Choose your path

| Goal | Platform | Setup |
|------|----------|--------|
| Web chat, teleop, WhatsApp/Telegram, skills | **OpenClaw** | [OpenClaw + Ollama](#openclaw--ollama-recommended) |
| Terminal agent, any Ollama model | **Hermes Agent** | [Hermes + Ollama](#hermes--ollama) |
| Sandboxed Jetson / NemoClaw stack | **NVIDIA NemoClaw** | [docs/nemoclaw.md](nemoclaw.md) (detailed Ollama recipes) |
| Claude / Codex / Gemini | Cloud models | Optional — use this doc only for memory embeddings or Follow Me VLM |

`agenticros init` asks for an OpenAI key — **you can skip it** when using local Ollama with OpenClaw or Hermes.

## Model recommendations

| Model | Role | Notes |
|-------|------|--------|
| **`qwen3-vl:8b-instruct`** | Primary chat + tools + vision | **Recommended** for OpenClaw. One model for driving, missions, and *"what do you see?"* |
| **`qwen3-vl:2b`** | Primary or Follow Me VLM | Lighter; good on constrained hardware. Weaker tool-calling than 8B |
| **`qwen3-vl:2b-instruct`** | Primary (if available) | Prefer `-instruct` over bare `qwen3-vl` tags |
| **`nomic-embed-text`** | Memory embeddings only | Small; used when `memory.backend: mem0` |
| **`qwen2.5vl:7b`** | Describer / Follow Me only | OK as a vision sidecar; avoid as primary for tool calling |

**Avoid bare `qwen3-vl:8b` (no `-instruct`).** On Ollama it is a “thinking” build that can burn the token budget on hidden reasoning and return empty `tool_calls`. Use the **`-instruct`** variant for agentic tool use.

**Avoid text-only primaries** (`llama3.1:8b`, `qwen2.5:7b`) if you want the agent to describe camera frames. OpenClaw filters images out for text-only models unless you enable the [in-plugin describer](#text-only-primary--enable-the-describer).

## Prerequisites

```bash
# Install Ollama: https://ollama.com
ollama pull qwen3-vl:8b-instruct   # recommended
# or: ollama pull qwen3-vl:2b      # smaller hardware

ollama serve                       # usually already running as a service
curl -s http://localhost:11434/api/tags | head   # sanity check
```

AgenticROS stack (robot or sim):

```bash
npx agenticros init    # skip OpenAI key when prompted
agenticros up sim-amr  # or: agenticros up real
```

## OpenClaw + Ollama (recommended)

### 1. Install the AgenticROS plugin

`agenticros init` runs `scripts/setup_gateway_plugin.sh` and registers the plugin. Config UI:

`http://127.0.0.1:18789/plugins/agenticros/`

For loopback dev without gateway token auth:

```bash
node scripts/setup-openclaw-local.cjs
# restart: openclaw gateway
```

### 2. Point OpenClaw at Ollama

Configure OpenClaw so the **primary inference model** is your Ollama VLM (e.g. `qwen3-vl:8b-instruct` or `qwen3-vl:2b`). How you do this depends on your OpenClaw install:

- **NemoClaw:** `nemoclaw inference set --provider ollama-local --model qwen3-vl:8b-instruct --sandbox <name> --no-verify` — full recipe in [nemoclaw.md](nemoclaw.md).
- **Vanilla OpenClaw:** during `openclaw onboard`, choose local/Ollama inference, or set `agents.defaults.model.primary` to your model id in `~/.openclaw/openclaw.json`. The gateway must reach `http://localhost:11434` (or your LAN Ollama host).

### 3. Verify multimodal + tools

```bash
openclaw models list | grep qwen3-vl
```

The **Input** column must include **`text+image`** (not `text` alone). If it shows text-only, OpenClaw will strip camera bytes from tool results and the model will hallucinate scene descriptions.

Patch the model catalog (root config **and** per-agent override if present):

```bash
MODEL="qwen3-vl:8b-instruct"   # or qwen3-vl:2b

for f in ~/.openclaw/openclaw.json ~/.openclaw/agents/main/agent/models.json; do
  [ -f "$f" ] || continue
  jq --arg m "$MODEL" '
    ((.models.providers.inference.models // .providers.inference.models)[]
      | select(.id == $m) | .input) = ["text", "image"]
  ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done

openclaw models list | grep qwen3-vl   # Input should read text+image
```

### 4. Optional tuning

**Slow first reply after idle** — large tool catalogs + cold Ollama load can exceed the default LLM timeout. Bump idle timeout in `~/.openclaw/openclaw.json`:

```bash
jq '.agents.defaults.llm.idleTimeoutSeconds = 480' \
  ~/.openclaw/openclaw.json > /tmp/oc.json && mv /tmp/oc.json ~/.openclaw/openclaw.json
```

**Disable the describer** when the primary model is already multimodal (avoids a second Ollama call per snapshot):

```json
"plugins": {
  "entries": {
    "agenticros": {
      "config": {
        "describer": { "enabled": false }
      }
    }
  }
}
```

Or use the config UI at `/plugins/agenticros/` → save → restart gateway.

### 5. Smoke test

In OpenClaw web chat:

1. *"List ROS topics"* → should invoke `ros2_list_topics`
2. *"Use ros2_camera_snapshot and describe what you see in detail"* → should call the tool and describe the **actual** frame

Gateway log should **not** contain `tool image omitted: model does not support images`.

## Text-only primary → enable the describer

If you keep a **text-only** Ollama model as primary (e.g. for faster tool calling on Jetson), enable AgenticROS’s in-plugin describer so `ros2_camera_snapshot` embeds a text caption (OpenClaw filters raw images for text-only models):

```json
"describer": {
  "enabled": true,
  "url": "http://localhost:11434/v1/chat/completions",
  "model": "qwen3-vl:2b"
}
```

Set via `~/.openclaw/openclaw.json` → `plugins.entries.agenticros.config.describer` or the AgenticROS config UI.

## Follow Me skill (Ollama VLM steering)

The Follow Me skill can call Ollama directly for person tracking (independent of the chat LLM):

In the config UI (**Follow Me** section) or `plugins.entries.agenticros.config.skills.followme`:

```json
"skills": {
  "followme": {
    "useOllama": true,
    "ollamaUrl": "http://localhost:11434",
    "vlmModel": "qwen3-vl:2b",
    "cameraTopic": "/camera/image_raw/compressed"
  }
}
```

Install the skill: `agenticros skills install chrismatthieu/followme` (see [skills.md](skills.md)).

## Hermes + Ollama

Hermes is model-agnostic — point it at Ollama, register AgenticROS MCP, and chat from the terminal:

```bash
agenticros hermes setup
agenticros hermes doctor
```

In `~/.hermes/config.yaml`, set the LLM provider to Ollama and your model (exact keys depend on your Hermes version), for example:

```yaml
llm:
  provider: ollama
  model: qwen3-vl:8b-instruct
```

Reload MCP in Hermes (`/reload-mcp`), then: *"List ROS topics"* or *"What do you see?"*

Full MCP wiring: [hermes-setup.md](hermes-setup.md).

## Fully local memory (optional)

Semantic memory can use Ollama for embeddings — no cloud key:

```bash
ollama pull nomic-embed-text
```

```json
{
  "memory": {
    "enabled": true,
    "backend": "mem0"
  }
}
```

The mem0 backend auto-detects Ollama at `http://localhost:11434` before falling back to `OPENAI_API_KEY`. See [memory.md](memory.md).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Agent answers without calling `ros2_*` tools | Model too small or wrong family for structured tool calls | Try `qwen3-vl:8b-instruct`; check gateway logs for tool-call errors |
| Generic scene description (wrong objects) | Text-only primary or `input` missing `image` | Patch model catalog (`text+image`); or enable [describer](#text-only-primary--enable-the-describer) |
| Log: `tool image omitted: model does not support images` | Model catalog says text-only | [Verify multimodal](#3-verify-multimodal--tools) |
| `LLM request timed out` on first message | Cold Ollama + large prompt | Pre-warm with `ollama run <model> hi`; bump `idleTimeoutSeconds` |
| `finish_reason: length`, empty `tool_calls` | Thinking-model variant (`qwen3-vl:8b` without `-instruct`) | Switch to `qwen3-vl:8b-instruct` or `qwen3-vl:2b-instruct` |
| OpenAI rate limit in webchat | Still on cloud provider | Switch OpenClaw inference to Ollama (see [robot-setup.md](robot-setup.md#rate-limited-in-webchat-openai)) |
| Follow Me doesn’t steer | `useOllama` off or wrong camera topic | Config UI → Follow Me; set `cameraTopic` to your compressed image topic |

## Related docs

- [nemoclaw.md](nemoclaw.md) — NemoClaw sandbox, policy, and Jetson-tuned Ollama setup
- [robot-setup.md](robot-setup.md) — robot + gateway deployment modes
- [memory.md](memory.md) — local embeddings with Ollama
- [skills.md](skills.md) — Follow Me and other skills
- [hermes-setup.md](hermes-setup.md) — Hermes MCP + any LLM provider
