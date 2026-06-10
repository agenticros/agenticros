/**
 * Bridge from the CLI to the AgenticROS MCP server's `ros2_discover_robots` tool.
 *
 * Rather than re-implement live-topic discovery in the CLI (which would
 * force `@agenticros/core` and its transport deps into the published
 * `agenticros` tarball), we spawn the existing MCP server binary
 * (`packages/agenticros-claude-code/dist/index.js`) and JSON-RPC the
 * `ros2_discover_robots` tool — the exact code path Claude Code uses.
 * This keeps the CLI light AND ensures the CLI sees the same robots
 * the agent sees.
 *
 * Resilience: the spawn-and-rpc dance is wrapped in an overall timeout
 * so a hung Zenoh router or a malformed reply can't lock up the CLI.
 * The stderr stream is drained silently — the MCP server emits a
 * connection banner that isn't useful for the CLI consumer.
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { getCliPaths } from "./paths.js";

const DISCOVER_TIMEOUT_MS = 15_000;
const INIT_TIMEOUT_MS = 8_000;

export interface DetectedRobot {
  id: string;
  cmdVelTopic: string;
  topicCount: number;
  configuredRobotId: string | null;
}

export interface ConfiguredRobotSummary {
  id: string;
  name: string;
  namespace: string;
  cameraTopic: string;
  source: "config" | "legacy";
}

export interface DiscoveryResult {
  total_topics: number;
  detected: DetectedRobot[];
  configured_online: ConfiguredRobotSummary[];
  configured_offline: ConfiguredRobotSummary[];
  unknown_detected: DetectedRobot[];
}

/**
 * Resolve the path to the AgenticROS MCP server entrypoint, mirroring
 * the same lookup the rest of the CLI uses. Returns undefined when the
 * dist hasn't been built yet (so the caller can surface an actionable
 * error rather than a cryptic spawn failure).
 */
export function findMcpEntry(): string | undefined {
  const { mcpDistDir } = getCliPaths();
  const entry = join(mcpDistDir, "index.js");
  return existsSync(entry) ? entry : undefined;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

/** Minimal stdio JSON-RPC client over a child process. */
class StdioRpc {
  private buffer = "";
  private nextId = 1;
  private pending = new Map<number, (msg: JsonRpcResponse) => void>();

  constructor(private readonly proc: ChildProcessWithoutNullStreams) {
    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk: string) => this.onChunk(chunk));
    proc.stderr.setEncoding("utf8");
    proc.stderr.on("data", () => {});
  }

  private onChunk(chunk: string): void {
    this.buffer += chunk;
    let idx: number;
    while ((idx = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line) as JsonRpcResponse;
        if (typeof msg.id === "number" && this.pending.has(msg.id)) {
          this.pending.get(msg.id)!(msg);
          this.pending.delete(msg.id);
        }
      } catch {
        /* ignore non-JSON noise — MCP server occasionally writes diagnostic banners to stdout */
      }
    }
  }

  rpc<T extends Record<string, unknown>>(
    method: string,
    params: T,
    timeoutMs: number,
  ): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`JSON-RPC '${method}' timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);
      this.pending.set(id, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      this.proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  notify(method: string, params: Record<string, unknown> = {}): void {
    this.proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }
}

/**
 * Run `ros2_discover_robots` against the MCP server and return the
 * parsed `DiscoveryResult`.
 *
 * Throws with an actionable message when:
 *   - the MCP server binary can't be found (suggests `pnpm build`)
 *   - the initialize handshake times out (suggests Zenoh / config issues)
 *   - the tool reports `isError: true` (surfaces the inner error)
 *
 * Always cleans up the child process — no orphan node processes after
 * a failed call.
 */
export async function discoverViaMcp(): Promise<DiscoveryResult> {
  const entry = findMcpEntry();
  if (!entry) {
    throw new Error(
      "AgenticROS MCP server isn't built. Run `pnpm --filter @agenticros/claude-code build` (or `agenticros init`).",
    );
  }

  // Forward AGENTICROS_* env so the MCP server picks up the same robot
  // namespace + config path the CLI sees.
  const proc = spawn("node", [entry], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  try {
    const client = new StdioRpc(proc);

    await client.rpc(
      "initialize",
      {
        protocolVersion: "2025-03-26",
        clientInfo: { name: "agenticros-cli", version: "1.0" },
        capabilities: {},
      },
      INIT_TIMEOUT_MS,
    );
    client.notify("notifications/initialized");

    const callResp = await client.rpc(
      "tools/call",
      { name: "ros2_discover_robots", arguments: {} },
      DISCOVER_TIMEOUT_MS,
    );

    if (callResp.error) {
      throw new Error(`MCP server returned error: ${callResp.error.message}`);
    }
    const result = callResp.result as
      | { content?: Array<{ type: string; text?: string }>; isError?: boolean }
      | undefined;
    if (!result) {
      throw new Error("MCP server returned no result for ros2_discover_robots.");
    }
    const text = result.content?.[0]?.text ?? "";
    if (result.isError) {
      throw new Error(`ros2_discover_robots failed: ${text}`);
    }
    const parsed = safeParse(text);
    if (!parsed) {
      throw new Error(`Unable to parse ros2_discover_robots response: ${text.slice(0, 200)}`);
    }
    return parsed;
  } finally {
    proc.kill();
  }
}

function safeParse(text: string): DiscoveryResult | null {
  try {
    const obj = JSON.parse(text) as Record<string, unknown>;
    return {
      total_topics: Number(obj["total_topics"] ?? 0),
      detected: (obj["detected"] as DetectedRobot[]) ?? [],
      configured_online: (obj["configured_online"] as ConfiguredRobotSummary[]) ?? [],
      configured_offline: (obj["configured_offline"] as ConfiguredRobotSummary[]) ?? [],
      unknown_detected: (obj["unknown_detected"] as DetectedRobot[]) ?? [],
    };
  } catch {
    return null;
  }
}
