#!/usr/bin/env node
/**
 * AgenticROS Gemini CLI — chat with your ROS2 robot using Google Gemini.
 *
 * Usage:
 *   GEMINI_API_KEY=xxx agenticros-gemini "What do you see?"
 *   GEMINI_API_KEY=xxx agenticros-gemini   # read message from stdin
 *
 * Config: AGENTICROS_CONFIG_PATH or ~/.agenticros/config.json (same as other adapters).
 */

import { loadConfig } from "./config.js";
import { connect, disconnect } from "./transport.js";
import { chatWithRobot } from "./chat.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let userMessage: string;
  if (args.length >= 1 && args[0].trim().length > 0) {
    userMessage = args.join(" ").trim();
  } else {
    userMessage = await readStdin();
  }
  if (!userMessage) {
    process.stderr.write("Usage: agenticros-gemini \"<message>\" or pipe message via stdin.\n");
    process.stderr.write("Set GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment.\n");
    process.exit(1);
  }

  const config = loadConfig();
  await connect(config);

  try {
    const response = await chatWithRobot(userMessage, config);
    process.stdout.write(response + "\n");
  } finally {
    await disconnect();
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string | Buffer) => chunks.push(Buffer.from(chunk)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8").trim()));
  });
}

main().catch((err) => {
  process.stderr.write(String(err instanceof Error ? err.message : err) + "\n");
  process.exit(1);
});
