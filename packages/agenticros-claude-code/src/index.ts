#!/usr/bin/env node
/**
 * AgenticROS MCP server for Claude Code CLI.
 * Run with: node dist/index.js
 * Register with Claude Code: claude mcp add --transport stdio agenticros -- node /path/to/dist/index.js
 *
 * We redirect console.log/info to stderr so stdout is reserved for MCP JSON-RPC; any dependency
 * (e.g. zenoh-ts) that logs to stdout would otherwise corrupt the protocol.
 */
import { format } from "util";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { loadConfig } from "./config.js";
import { connect, disconnect } from "./transport.js";
import { TOOLS, handleToolCall } from "./tools.js";

let config: AgenticROSConfig | null = null;
let transportConnected = false;

async function ensureConnected(): Promise<void> {
  if (transportConnected) return;
  if (!config) {
    config = loadConfig();
  }
  await connect(config);
  transportConnected = true;
}

function main(): void {
  // Avoid crash on EPIPE when client (e.g. Claude Code) disconnects
  process.stdout.on("error", (err: NodeJS.ErrnoException) => {
    if (err?.code !== "EPIPE") throw err;
  });
  process.stderr.on("error", (err: NodeJS.ErrnoException) => {
    if (err?.code !== "EPIPE") throw err;
  });
  // Keep stdout clean for MCP; send all log/info to stderr
  const stderrWrite = (args: unknown[]) => {
    process.stderr.write(format(...args) + "\n");
  };
  console.log = (...args: unknown[]) => stderrWrite(args);
  console.info = (...args: unknown[]) => stderrWrite(args);

  const server = new Server(
    {
      name: "agenticros",
      version: "0.0.1",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      // Reload config from disk each time so edits to ~/.agenticros/config.json take effect without restarting Claude Code
      config = loadConfig();
      const ns = (config.robot?.namespace ?? "").trim();
      process.stderr.write(
        `[AgenticROS] Config: robot.namespace=${ns ? `"${ns}"` : '""'} → ${ns ? `/${ns}/cmd_vel` : "/cmd_vel"}\n`,
      );
      await ensureConnected();
      const result = await handleToolCall(name, args ?? {}, config);
      return {
        content: result.content,
        isError: result.isError,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Tool error: ${message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();

  async function run(): Promise<void> {
    await server.connect(transport);
  }

  function shutdown(): void {
    disconnect()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  run().catch((err) => {
    console.error("AgenticROS MCP server error:", err);
    process.exit(1);
  });
}

main();
