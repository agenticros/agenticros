import type { AgenticROSConfig } from "@agenticros/core";

/**
 * Optional in-plugin image describer.
 *
 * Why this exists:
 *
 *   * The OpenClaw runtime filters image content blocks out of tool results
 *     before passing them to text-only chat models (see
 *     `provider-stream-EGXtbhbQ.js:309` — `model.input.includes("image") ?
 *     blocks : blocks.filter(b => b.type !== "image")`).
 *   * `agents.defaults.imageModel` configures the *explicit* `image` tool
 *     the agent can call, but does **not** install an automatic
 *     tool-result-to-caption hook. So when the primary model is text-only
 *     (e.g. Ollama qwen2.5:7b for tool-calling on Jetson), it never sees
 *     the camera frame and tends to hallucinate a generic description.
 *
 * The describer calls a vision-capable OpenAI-compatible endpoint
 * directly from the plugin and the `ros2_camera_snapshot` tool then
 * embeds the description text into its tool result. This bypasses
 * OpenClaw's image filtering entirely.
 *
 * # Networking
 *
 * Inside NemoClaw the gateway runs with ``NODE_USE_ENV_PROXY=1`` and
 * ``HTTP_PROXY=http://10.200.0.1:3128``. Node 22's built-in undici
 * ``fetch`` reads those automatically and routes all outbound HTTP(S)
 * through the OPA-managed proxy. We therefore use ``fetch`` and don't
 * implement any of our own proxy logic — past attempts to manually build
 * CONNECT tunnels or absolute-form URLs ended up double-proxied (the OPA
 * proxy saw ``host:3128`` instead of the real upstream port) or hit
 * "FORWARD denied" because Ollama on the host isn't reachable on its raw
 * port from the docker bridge — only the auth proxy on
 * ``host.openshell.internal:11435`` is. See the
 * ``agenticros-describer.policy.yaml`` / ``local-inference`` preset for
 * the corresponding policy.
 *
 * # Bearer token
 *
 * The auth proxy on port 11435 requires ``Authorization: Bearer <token>``
 * (24-byte hex token written by nemoclaw to
 * ``~/.nemoclaw/ollama-proxy-token`` on the host). Inside the sandbox the
 * gateway does NOT receive this token in its environment by default. We
 * accept it via the plugin config field ``describer.apiKey`` — set it in
 * ``~/.openclaw/openclaw.json`` under ``plugins.entries.agenticros.config``.
 */

export interface DescribeImageOptions {
  config: AgenticROSConfig;
  /** Base64-encoded image (no data: prefix). */
  base64: string;
  /** MIME type, e.g. "image/jpeg" or "image/png". */
  mimeType: string;
  /** Optional override prompt; otherwise the one from config is used. */
  prompt?: string;
  /** Optional logger for diagnostics. */
  logger?: { info(msg: string): void; warn(msg: string): void; error(msg: string): void };
}

export interface DescribeImageResult {
  description: string;
  model: string;
  latencyMs: number;
}

/**
 * Call the configured vision model with the image and return its text caption.
 *
 * Throws on network/HTTP failure so callers can decide whether to surface the
 * error or silently fall back to "no description".
 */
export async function describeImage(opts: DescribeImageOptions): Promise<DescribeImageResult> {
  const cfg = opts.config.describer;
  if (!cfg.enabled) {
    throw new Error("describer disabled in config");
  }
  const url = cfg.url;
  const model = cfg.model;
  const prompt = (opts.prompt ?? cfg.prompt).trim();
  const maxTokens = cfg.maxTokens;
  const timeoutMs = cfg.timeoutMs;
  const apiKey = (cfg.apiKey ?? "").trim();

  const dataUrl = `data:${opts.mimeType};base64,${opts.base64}`;

  const body = JSON.stringify({
    model,
    stream: false,
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "AgenticROS-Describer/1.0",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`describer HTTP ${res.status} from ${url}: ${text.slice(0, 300)}`);
  }
  let data: { choices?: Array<{ message?: { content?: string } }>; model?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`describer response was not JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw new Error(`describer returned empty content (HTTP ${res.status})`);
  }
  return {
    description: content,
    model: data.model ?? model,
    latencyMs: Date.now() - start,
  };
}

/**
 * Convenience: try to describe; on failure, log and return null.
 * The caller (ros2_camera_snapshot) uses this to keep the tool result
 * usable even when the describer endpoint is misconfigured or down.
 */
export async function describeImageBestEffort(
  opts: DescribeImageOptions,
): Promise<DescribeImageResult | null> {
  if (!opts.config.describer.enabled) return null;
  try {
    return await describeImage(opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    opts.logger?.warn(`ros2_camera_snapshot: describer failed: ${msg}`);
    return null;
  }
}
