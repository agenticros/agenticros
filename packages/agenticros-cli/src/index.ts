#!/usr/bin/env node
/**
 * AgenticROS CLI - `agenticros`.
 *
 * Entry point: parses argv with commander and dispatches to a subcommand.
 * If no argv is provided (bare `agenticros`), opens the interactive menu.
 *
 * Published to npm as the unscoped package name `agenticros`. Inside the
 * monorepo the source dir is `packages/agenticros-cli/` (`pnpm --filter agenticros`).
 */

import { Command } from "commander";

import { upCommand } from "./commands/up.js";
import { downCommand } from "./commands/down.js";
import { initCommand } from "./commands/init.js";
import { doctorCommand } from "./commands/doctor.js";
import { statusCommand } from "./commands/status.js";
import { logsCommand } from "./commands/logs.js";
import { configCommand } from "./commands/config.js";
import { skillsCommand } from "./commands/skills.js";
import { runMenu } from "./menu.js";
import { err } from "./util/logger.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Read the runtime version from the published package.json so `--version`
 * never drifts from the npm tag. (Previously we hard-coded "0.1.0" here and
 * it lagged behind the package.json bump on each release.)
 */
function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // dist/index.js -> ../package.json
    const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")) as {
      version?: string;
    };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const VERSION = readVersion();

const program = new Command();

program
  .name("agenticros")
  .description(
    "AgenticROS - agentic AI for ROS-powered robots. Run with no arguments for an interactive menu.",
  )
  .version(VERSION, "-v, --version", "Print the agenticros CLI version")
  .showHelpAfterError("(use 'agenticros --help' for available subcommands)");

program
  .command("up [target]")
  .description(
    "Bring up a robot stack. target = real | sim-amr | sim-arm (default prompts).",
  )
  .option("--ros-distro <distro>", "ROS 2 distribution (humble, jazzy, ...)")
  .option("--namespace <ns>", "Robot namespace override")
  .option("--rviz", "Open RViz alongside the sim (sim targets only)", false)
  .option("--headless", "Run gz-sim with no GUI (auto-enabled on Jetson or when $DISPLAY is unset)")
  .option("--no-headless", "Force gz-sim GUI on (override Jetson auto-headless)")
  .option("--no-camera", "Skip starting the RealSense camera (real target only)")
  .option("--no-motors", "Skip starting the motor controller (real target only)")
  .action(async (target: string | undefined, opts) => {
    await upCommand({ target, ...opts });
  });

program
  .command("down")
  .description(
    "Stop AgenticROS processes (sim, camera, mcp, rosbridge). Leaves the OpenClaw gateway running by default.",
  )
  .option("--keep-camera", "Leave the RealSense camera running", false)
  .option("--stop-gateway", "Also stop the openclaw-gateway service (default: keep it running)", false)
  .action(async (opts) => {
    await downCommand(opts);
  });

program
  .command("init")
  .description(
    "First-time setup: workspace build, OpenClaw plugin install, robot config, OpenAI key. Idempotent.",
  )
  .option("--force", "Re-run every step even if it appears done", false)
  .option(
    "--install-dir <path>",
    "Where to place the AgenticROS source tree (npm-install mode). Default: ~/agenticros.",
  )
  .action(async (opts) => {
    await initCommand(opts);
  });

program
  .command("doctor")
  .description("Run health checks and print a green/yellow/red status table.")
  .option("--json", "Emit a JSON object instead of a human-readable table", false)
  .action(async (opts) => {
    const exitCode = await doctorCommand(opts);
    if (exitCode !== 0) process.exit(exitCode);
  });

program
  .command("status")
  .description(
    "Show which AgenticROS components are running (PIDs, topic count, namespace).",
  )
  .option("--json", "Emit a JSON object instead of a table", false)
  .action(async (opts) => {
    await statusCommand(opts);
  });

program
  .command("logs [target]")
  .description(
    "Tail logs. target = camera | mcp | gateway | sim (default: print available logs).",
  )
  .option("-f, --follow", "Tail the log (tail -F). Default prints last N lines and exits.", false)
  .option("-n, --lines <n>", "Number of lines from the end to start at", "200")
  .action(async (target: string | undefined, opts) => {
    await logsCommand({ target, ...opts });
  });

program
  .command("config [action] [keyValue]")
  .description(
    "Read or edit ~/.agenticros/config.json. action = show | get | set | edit | reset | use.",
  )
  .action(async (action: string | undefined, keyValue: string | undefined) => {
    await configCommand({ action, keyValue });
  });

// Shorter alias for the most common mode-switching workflow.
program
  .command("mode [target]")
  .description(
    "Switch ~/.agenticros/config.json between profiles. target = real | sim. Equivalent to `agenticros config use <target>`.",
  )
  .action(async (target: string | undefined) => {
    await configCommand({ action: "use", keyValue: target });
  });

program
  .command("skills [action] [arg]")
  .description(
    "Manage AgenticROS skills (OpenClaw plugin). action = list | discover | add <path|name> | remove <id|name> | sync.",
  )
  .action(async (action: string | undefined, arg: string | undefined) => {
    await skillsCommand({ action, arg });
  });

async function main(): Promise<void> {
  // Bare `agenticros` (no subcommand, no flags) opens the menu.
  if (process.argv.length <= 2) {
    try {
      await runMenu();
    } catch (e) {
      err(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
    return;
  }
  try {
    await program.parseAsync(process.argv);
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

await main();
