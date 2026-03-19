# AgenticROS Gemini adapter

CLI that uses **Google Gemini** to chat with your ROS2 robot. Same tool set as the Claude Code adapter (list topics, publish, subscribe, services, actions, params, camera snapshot, depth distance). No MCP — Gemini function calling is used directly.

## Prerequisites

- Node.js 20+
- ROS2 transport available (Zenoh router, rosbridge, or local DDS)
- **Gemini API key** ([Google AI Studio](https://aistudio.google.com/apikey))

## Config

Same as other adapters (Claude Code, OpenClaw):

1. **`AGENTICROS_CONFIG_PATH`** — path to a JSON file
2. **`~/.agenticros/config.json`**
3. **OpenClaw config** — if the above are missing, uses `OPENCLAW_CONFIG` or `~/.openclaw/openclaw.json` → `plugins.entries.agenticros.config`

Example `~/.agenticros/config.json`:

```json
{
  "transport": { "mode": "zenoh" },
  "zenoh": { "routerEndpoint": "ws://localhost:10000" },
  "robot": {
    "name": "MyRobot",
    "namespace": "",
    "cameraTopic": "/camera/camera/color/image_raw/compressed"
  }
}
```

## Build

From the repo root:

```bash
pnpm install
pnpm build
```

Or only this package: `pnpm --filter @agenticros/core build && pnpm --filter @agenticros/gemini build`.

**Important:** Run `pnpm build` with nothing after it on the same line. If you paste extra words (e.g. from a comment like “if you haven’t already”), pnpm passes them to `tsc` and the build fails.

### Quick API test (no ROS)

After building, with a **real** key from [Google AI Studio](https://aistudio.google.com/apikey):

```bash
cd packages/agenticros-gemini
export GEMINI_API_KEY="your-key-here"
pnpm run smoke-api
```

You should see `Gemini: OK` (or similar). If you see `API_KEY_INVALID`, the key is wrong, revoked, or still the placeholder `YOUR_NEW_KEY_HERE`.

### HTTP 429 / “quota exceeded” / `RESOURCE_EXHAUSTED`

Your key is valid, but Google’s **free-tier limits** for that model are used up (or set to 0 for the project). This is **not** an AgenticROS bug.

- Wait and retry (errors often include a suggested delay, e.g. ~12s).
- Try another model: `export GEMINI_MODEL=gemini-2.5-flash` or `gemini-2.0-flash` (defaults may change; see [models](https://ai.google.dev/gemini-api/docs/models)).
- Check usage and limits: [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [AI Studio](https://aistudio.google.com/), and enable billing if you need higher quotas.

The main CLI also respects **`GEMINI_MODEL`** (same as the smoke script after rebuild).

## Usage

Set **`GEMINI_API_KEY`** (or **`GOOGLE_API_KEY`**) and run the CLI:

```bash
export GEMINI_API_KEY=your_key_here
pnpm --filter @agenticros/gemini exec agenticros-gemini "What do you see?"
```

Or with a message from stdin:

```bash
echo "List ROS2 topics" | GEMINI_API_KEY=xxx node packages/agenticros-gemini/dist/index.js
```

From the package directory after building:

```bash
cd packages/agenticros-gemini
GEMINI_API_KEY=xxx node dist/index.js "Move the robot forward 0.2 m/s for 2 seconds then stop."
```

## Tools

The same ROS2 tools as the OpenClaw and Claude Code adapters:

| Tool | Description |
|------|-------------|
| `ros2_list_topics` | List topics and types |
| `ros2_publish` | Publish to a topic (e.g. cmd_vel) |
| `ros2_subscribe_once` | Get next message from a topic |
| `ros2_service_call` | Call a ROS2 service |
| `ros2_action_goal` | Send goal to an action server |
| `ros2_param_get` / `ros2_param_set` | Get/set node parameters |
| `ros2_camera_snapshot` | One frame from camera topic (image returned to model) |
| `ros2_depth_distance` | Distance in meters from depth camera |

Safety limits from config (max linear/angular velocity) are applied before `ros2_publish`.

## Zenoh / transport

The CLI connects to ROS2 via the same core transport as the other adapters. For Zenoh:

1. Start **zenohd** with the remote-api plugin (e.g. port 10000): see `scripts/zenohd-agenticros.json5` or [docs/zenoh-agenticros.md](../../docs/zenoh-agenticros.md).
2. Set `zenoh.routerEndpoint` in config (e.g. `ws://localhost:10000`).
3. Run the Gemini CLI; it will connect at startup and use the tools in a loop until the model returns a final text answer.

If the transport is not connected (e.g. zenohd not running), tool calls will fail with a clear error.
