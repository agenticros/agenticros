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
import { eyesCommand } from "./commands/eyes.js";
import { webCommand } from "./commands/web.js";
import { skillsCommand } from "./commands/skills.js";
import { createSkillCommand } from "./commands/create-skill.js";
import { publishSkillCommand } from "./commands/publish-skill.js";
import { skillsDevCommand } from "./commands/skills-dev.js";
import { robotsCommand } from "./commands/robots.js";
import { claudeDoctorCommand, claudeSetupCommand } from "./commands/claude.js";
import { codexDoctorCommand, codexSetupCommand } from "./commands/codex.js";
import { hermesDoctorCommand, hermesSetupCommand } from "./commands/hermes.js";
import { mcpDoctorCliCommand, mcpSetupCliCommand } from "./commands/mcp.js";
import { runMenu } from "./menu.js";
import {
  connectCommand,
  disconnectCommand,
  idCommand,
  setCommand,
  startServiceCommand,
  stopServiceCommand,
} from "./commands/robot-hw.js";
import {
  loginCommand,
  logoutCommand,
  whoamiCommand,
} from "./commands/cloud-auth.js";
import { registerCommand } from "./commands/register.js";
import { remoteCommand } from "./commands/remote.js";
import { gatewayCommand } from "./commands/gateway.js";
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
  .option("--nav2", "sim-amr only: also launch Nav2 (map + AMCL + navigation)", false)
  .option("--no-camera", "Skip starting the RealSense camera (real target only)")
  .option("--no-motors", "Skip starting the motor controller (real target only)")
  .option("--eyes", "Also start robot eyes on the local display (tablets / face screens)", false)
  .option("--eyes-no-teleop", "With --eyes: gaze only (do not publish WASD cmd_vel)", false)
  .option("--eyes-no-browser", "With --eyes: serve UI but do not open a kiosk browser", false)
  .option("--eyes-no-sound", "With --eyes: mute R2D2 idle/excited chirps", false)
  .option(
    "--eyes-no-person-gaze",
    "With --eyes: skip idle person-follow gaze even if YOLO is already installed",
    false,
  )
  .action(async (target: string | undefined, opts) => {
    await upCommand({
      target,
      ...opts,
      eyesNoTeleop: opts.eyesNoTeleop === true,
      eyesNoBrowser: opts.eyesNoBrowser === true,
      eyesNoSound: opts.eyesNoSound === true,
      eyesNoPersonGaze: opts.eyesNoPersonGaze === true,
    });
  });

program
  .command("eyes")
  .description(
    "Start fullscreen robot eyes on a local display (cmd_vel gaze, optional idle person-follow if YOLO is already installed, WASD teleop, R2D2 sounds). See docs/eyes.md.",
  )
  // Commander maps `--no-browser` / `--no-teleop` / `--no-sound` / `--no-person-gaze`
  // to `browser|teleop|sound|personGaze: false`.
  .option("--no-browser", "Serve the UI but do not open a kiosk browser")
  .option("--no-teleop", "Gaze only — do not publish WASD cmd_vel")
  .option("--no-sound", "Mute R2D2 idle/excited chirps")
  .option(
    "--no-person-gaze",
    "Skip idle person-follow gaze even if YOLO is already installed",
  )
  .option("--port <n>", "HTTP / WebSocket port (default 8765)")
  .option("--topic <path>", "Override cmd_vel topic (default from ~/.agenticros/config.json)")
  .action(async (opts: {
    browser?: boolean;
    teleop?: boolean;
    sound?: boolean;
    personGaze?: boolean;
    port?: string;
    topic?: string;
  }) => {
    await eyesCommand({
      noBrowser: opts.browser === false,
      noTeleop: opts.teleop === false,
      noSound: opts.sound === false,
      noPersonGaze: opts.personGaze === false,
      port: opts.port,
      topic: opts.topic,
    });
  });

program
  .command("web")
  .description(
    "Open the OpenClaw web dashboard (AgenticROS config + teleop) in a browser.",
  )
  .option("--no-open", "Print the URL(s) without launching a browser")
  .action(async (opts: { open?: boolean }) => {
    await webCommand({ open: opts.open });
  });

program
  .command("down")
  .description(
    "Stop AgenticROS processes (sim, camera, mcp, rosbridge, eyes). Leaves the OpenClaw gateway running by default.",
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
  .option("--live", "Probe the live ROS graph and verify hardware-profile bindings", false)
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
  .command("connect")
  .description(
    "Connect the robot to AgenticROS cloud (default wss://cloud.agenticros.com).",
  )
  .option("-s, --server <host>", "Override signaling server (ws:// or host:port)")
  .action(async (opts: { server?: string }) => {
    await connectCommand({ server: opts.server });
  });

program
  .command("disconnect")
  .description("Disconnect the robot from cloud/edge (stops comms.js).")
  .action(async () => {
    await disconnectCommand();
  });

program
  .command("login")
  .description(
    "Log in to AgenticROS Cloud via browser (device code + GitHub). Saves API token like `set --token`.",
  )
  .option("--no-open", "Print the URL without launching a browser")
  .action(async (opts: { open?: boolean }) => {
    await loginCommand({ noOpen: opts.open === false });
  });

program
  .command("logout")
  .description("Clear the stored AgenticROS Cloud API token (keeps ROBOT ID).")
  .action(async () => {
    await logoutCommand();
  });

program
  .command("whoami")
  .description("Show AgenticROS Cloud login status and robot registration.")
  .action(async () => {
    await whoamiCommand();
  });

program
  .command("remote")
  .description(
    "Run a preset CLI action on an online AgenticROS Cloud robot (motors, cameras, skills, gateway).",
  )
  .argument(
    "[action]",
    "list | start_motors | stop_motors | start_realsense | stop_realsense | start_camera | stop_camera | status | skills_list | skills_sync | skills_remove | gateway_restart",
  )
  .option("--robot <id>", "Target robot UUID (default: prompt, or sole/local robot)")
  .option("--skill <id>", "Skill id for skills_remove (e.g. followme)")
  .option("--json", "Emit JSON instead of human-readable output", false)
  .action(
    async (
      action: string | undefined,
      opts: { robot?: string; skill?: string; json?: boolean },
    ) => {
      await remoteCommand({
        action,
        robot: opts.robot,
        skill: opts.skill,
        json: opts.json,
      });
    },
  );

program
  .command("gateway [action]")
  .description("OpenClaw gateway helpers. Action: restart.")
  .option("--json", "Emit JSON instead of human-readable output", false)
  .action(async (action: string | undefined, opts: { json?: boolean }) => {
    await gatewayCommand({ action, json: opts.json });
  });

program
  .command("register")
  .description(
    "Register this robot on AgenticROS Cloud (wizard: name, camera, compute). Uses the local ROBOT ID.",
  )
  .option("--name <name>", "Robot display name")
  .option("--camera <camera>", "Camera model (e.g. None, 2D, D435i)")
  .option("--compute <compute>", "Compute platform (e.g. Raspberry Pi)")
  .option("--type <type>", "Robot type (AMR, AGV, Arm, Drone, Humanoid)")
  .option("--defaults", "Skip advanced prompts (type/wheels/namespace)", false)
  .option("-y, --yes", "Non-interactive where possible (no login prompt)", false)
  .action(
    async (opts: {
      name?: string;
      camera?: string;
      compute?: string;
      type?: string;
      defaults?: boolean;
      yes?: boolean;
    }) => {
      await registerCommand(opts);
    },
  );

program
  .command("id")
  .description("Print this robot's cloud ROBOT ID (creates one if missing).")
  .action(async () => {
    await idCommand();
  });

program
  .command("set")
  .description(
    "Save cloud credentials manually. Prefer `agenticros login` when possible.",
  )
  .option("--token <token>", "Developer API token")
  .option("--id <robotId>", "Robot ID")
  .action(async (opts: { token?: string; id?: string }) => {
    await setCommand(opts);
  });

program
  .command("start <target>")
  .description(
    "Start an on-robot service. target = motors | realsense | camera",
  )
  .option(
    "-b, --backend <name>",
    "motors only: rpi | firmata | jetson (jetson is opt-in; never auto-selected)",
  )
  .option(
    "-p, --pins [list]",
    "motors: pin list; realsense: -p with no value enables pointcloud",
  )
  .option("-e, --encoderpins <list>", "motors (firmata): encoder pins")
  .option("-d, --device <path>", "motors firmata device or camera /dev/videoN")
  .option("-r, --resolution <WxH>", "camera resolution (e.g. 672x672)")
  .option("-f, --fps <n>", "camera FPS")
  .option("--pointcloud", "realsense: enable pointcloud", false)
  .option(
    "--full",
    "realsense: stock rs_launch.py defaults (higher res; slower WebRTC)",
    false,
  )
  .option(
    "--model <name>",
    "realsense: camera model from cloud (e.g. D421); default teleop profile otherwise",
  )
  .action(
    async (
      target: string,
      opts: {
        backend?: string;
        pins?: string | boolean;
        encoderpins?: string;
        device?: string;
        resolution?: string;
        fps?: string;
        pointcloud?: boolean;
        full?: boolean;
        model?: string;
      },
    ) => {
      // `agenticros start realsense -p` → pointcloud (boolean -p with no value)
      const pointcloud =
        opts.pointcloud === true ||
        (target.toLowerCase() === "realsense" && opts.pins === true);
      const pins = typeof opts.pins === "string" ? opts.pins : undefined;
      await startServiceCommand(target, {
        backend: opts.backend,
        pins,
        encoderpins: opts.encoderpins,
        device: opts.device,
        resolution: opts.resolution,
        fps: opts.fps,
        pointcloud,
        full: opts.full === true,
        model: opts.model,
      });
    },
  );

program
  .command("stop <target>")
  .description(
    "Stop an on-robot service. target = motors | realsense | camera",
  )
  .action(async (target: string) => {
    await stopServiceCommand(target);
  });

// robotics-style aliases: `agenticros motors start` / `agenticros camera stop`
for (const service of ["motors", "realsense", "camera"] as const) {
  const svc = program.command(service).description(`Alias for start/stop ${service}`);
  svc
    .command("start")
    .option("-b, --backend <name>", "rpi | firmata | jetson")
    .option("-p, --pins [list]", "pin list or realsense -p for pointcloud")
    .option("-e, --encoderpins <list>", "encoder pins")
    .option("-d, --device <path>", "device path")
    .option("-r, --resolution <WxH>", "camera resolution")
    .option("-f, --fps <n>", "camera FPS")
    .option("--pointcloud", "realsense pointcloud", false)
    .option("--full", "realsense: stock high-res launch", false)
    .option("--model <name>", "realsense: camera model (e.g. D421)")
    .action(
      async (opts: {
        backend?: string;
        pins?: string | boolean;
        encoderpins?: string;
        device?: string;
        resolution?: string;
        fps?: string;
        pointcloud?: boolean;
        full?: boolean;
        model?: string;
      }) => {
        const pointcloud =
          opts.pointcloud === true ||
          (service === "realsense" && opts.pins === true);
        const pins = typeof opts.pins === "string" ? opts.pins : undefined;
        await startServiceCommand(service, {
          backend: opts.backend,
          pins,
          encoderpins: opts.encoderpins,
          device: opts.device,
          resolution: opts.resolution,
          fps: opts.fps,
          pointcloud,
          full: opts.full === true,
          model: opts.model,
        });
      },
    );
  svc.command("stop").action(async () => {
    await stopServiceCommand(service);
  });
}

program
  .command("logs [target]")
  .description(
    "Tail logs. target = camera | mcp | gateway | sim | eyes (default: print available logs).",
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
  .command("create-skill <slug>")
  .description("Scaffold a new AgenticROS skill in ./agenticros-skill-<slug>/")
  .option("--template <name>", "Template: hello | robot | camera | depth (default: hello)")
  .action(async (slug: string, opts: { template?: string }) => {
    await createSkillCommand({ slug, template: opts.template });
  });

program
  .command("publish")
  .description("Validate, push, and publish the skill in the current directory to skills.agenticros.com")
  .option("--graduate", "Publish a customized tutorial skill to the public catalog", false)
  .option("-y, --yes", "Skip interactive prompts", false)
  .action(async (opts: { graduate?: boolean; yes?: boolean }) => {
    await publishSkillCommand({ graduate: opts.graduate, yes: opts.yes });
  });

program
  .command("skills [action] [arg]")
  .description(
    "Manage AgenticROS skills. create | dev | publish | search | install <owner/skill> | list | discover | add | remove | sync.",
  )
  .option("--template <name>", "With `skills create`: hello | robot | camera | depth")
  .option("--graduate", "With `skills publish`: graduate a tutorial skill", false)
  .option("--invoke <tool>", "With `skills dev`: run a tool handler")
  .option("--live", "With `skills dev`: allow live transport", false)
  .option("--no-restart", "Skip automatic OpenClaw gateway restart after install/sync", false)
  .option("-y, --yes", "Non-interactive; skip confirm prompts (install/remove)", false)
  .option("--json", "With `skills list`: emit JSON", false)
  .action(async (action: string | undefined, arg: string | undefined, opts) => {
    const act = (action ?? "list").toLowerCase();
    if (act === "create") {
      await createSkillCommand({ slug: arg ?? "", template: opts.template });
      return;
    }
    if (act === "dev") {
      await skillsDevCommand({ invoke: opts.invoke, live: opts.live });
      return;
    }
    if (act === "publish") {
      await publishSkillCommand({ graduate: opts.graduate, yes: opts.yes === true });
      return;
    }
    await skillsCommand({
      action,
      arg,
      noRestart: opts.restart === false,
      yes: opts.yes === true,
      json: opts.json === true,
    });
  });

const mcpCmd = program
  .command("mcp")
  .description("Configure all MCP clients (Codex, Hermes, Claude) for AgenticROS.");

mcpCmd
  .command("setup")
  .description(
    "Register agenticros MCP in Codex, Hermes, and Claude configs (default: all hosts).",
  )
  .option("--all", "Configure all hosts (default)", true)
  .option("--codex", "Configure Codex only (~/.codex/config.toml)", false)
  .option("--hermes", "Configure Hermes only (~/.hermes/config.yaml)", false)
  .option("--claude", "Configure Claude only (desktop + project .mcp.json)", false)
  .option("--project", "Also write project-scoped configs (.codex/config.toml, .mcp.json)", false)
  .option("--desktop", "Claude Desktop config only (with --claude)", false)
  .action(async (opts: {
    all?: boolean;
    codex?: boolean;
    hermes?: boolean;
    claude?: boolean;
    project?: boolean;
    desktop?: boolean;
  }) => {
    const hostFlags = opts.codex || opts.hermes || opts.claude;
    await mcpSetupCliCommand({
      all: hostFlags ? false : opts.all,
      codex: opts.codex,
      hermes: opts.hermes,
      claude: opts.claude,
      project: opts.project,
      desktop: opts.desktop,
    });
  });

mcpCmd
  .command("doctor")
  .description("Validate MCP configs for Codex, Hermes, and Claude.")
  .option("--json", "Emit JSON instead of a table", false)
  .option("--codex", "Check Codex only", false)
  .option("--hermes", "Check Hermes only", false)
  .option("--claude", "Check Claude only", false)
  .action(async (opts: {
    json?: boolean;
    codex?: boolean;
    hermes?: boolean;
    claude?: boolean;
  }) => {
    const exitCode = await mcpDoctorCliCommand(opts);
    if (exitCode !== 0) process.exit(exitCode);
  });

const claudeCmd = program
  .command("claude")
  .description("Configure Claude Code / Claude Desktop to use the AgenticROS MCP server.");

claudeCmd
  .command("setup")
  .description("Register agenticros MCP in Claude Desktop and/or project .mcp.json.")
  .option("--desktop", "Claude Desktop claude_desktop_config.json only", false)
  .option("--project", "Project .mcp.json only (repo root)", false)
  .action(async (opts: { desktop?: boolean; project?: boolean }) => {
    await claudeSetupCommand(opts);
  });

claudeCmd
  .command("doctor")
  .description("Validate Claude MCP config (desktop + project .mcp.json).")
  .option("--json", "Emit JSON instead of a table", false)
  .action(async (opts: { json?: boolean }) => {
    const exitCode = await claudeDoctorCommand(opts);
    if (exitCode !== 0) process.exit(exitCode);
  });

const codexCmd = program
  .command("codex")
  .description("Configure OpenAI Codex CLI to use the AgenticROS MCP server.");

codexCmd
  .command("setup")
  .description("Register agenticros MCP in ~/.codex/config.toml (or project .codex/config.toml).")
  .option("--project", "Write .codex/config.toml in the current repo root instead of global config", false)
  .action(async (opts: { project?: boolean }) => {
    await codexSetupCommand({ scope: opts.project ? "project" : "global" });
  });

codexCmd
  .command("doctor")
  .description("Validate Codex MCP config (path, namespace policy, MCP binary).")
  .option("--json", "Emit JSON instead of a table", false)
  .action(async (opts: { json?: boolean }) => {
    const exitCode = await codexDoctorCommand(opts);
    if (exitCode !== 0) process.exit(exitCode);
  });

const hermesCmd = program
  .command("hermes")
  .description("Configure Hermes Agent to use the AgenticROS MCP server.");

hermesCmd
  .command("setup")
  .description("Register agenticros MCP in ~/.hermes/config.yaml.")
  .action(async () => {
    await hermesSetupCommand();
  });

hermesCmd
  .command("doctor")
  .description("Validate Hermes MCP config (path, namespace policy, MCP binary).")
  .option("--json", "Emit JSON instead of a table", false)
  .action(async (opts: { json?: boolean }) => {
    const exitCode = await hermesDoctorCommand(opts);
    if (exitCode !== 0) process.exit(exitCode);
  });

program
  .command("robots [action] [arg] [extra]")
  .description(
    "Manage the multi-robot fleet (~/.agenticros/config.json). action = list | discover | add [id] | remove <id> | set-default <id> | set-transport <id> [shorthand] | clear-transport <id> | profile show [id] | profile infer [id].",
  )
  .option("--name <name>", "Display name for the robot (used by add)")
  .option("--namespace <ns>", "ROS2 namespace for the robot (used by add)")
  .option("--camera <topic>", "Default camera topic for the robot (used by add)")
  .option("--default", "Mark this robot as the default (used by add)", false)
  .option(
    "--kind <kind>",
    "Robot kind for fleet filtering (amr | arm | drone | rover). Used by ros2_find_robots_for. Defaults to 'amr' when unset.",
  )
  .option(
    "--sensors <list>",
    "Comma-separated sensor tags. Recognized: has_realsense, has_lidar, has_arm. Prefix with '!' to set false. Example: --sensors=has_realsense,has_lidar,!has_arm",
  )
  .option(
    "--capabilities <list>",
    "Comma-separated capability allowlist (e.g. drive_base,follow_person). Overrides the gateway-wide registry for ros2_find_robots_for on this robot. Pass an empty value (--capabilities='') to clear.",
  )
  .option(
    "--features <list>",
    "Comma-separated hardware features for robots[i].profile (e.g. base,camera,depth). Used by add.",
  )
  .option(
    "--binding <pair>",
    "Repeatable profile binding key=/topic (e.g. --binding camera.rgb=/cam/compressed). Used by add.",
    (val: string, acc: string[]) => [...acc, val],
    [] as string[],
  )
  .option("--apply", "Write the inferred profile (used by `robots profile infer`)", false)
  .option(
    "--transport <shorthand>",
    "Per-robot transport override. Examples: zenoh, zenoh:ws://farm:10000, rosbridge:ws://10.0.0.5:9090, local:1, webrtc:wss://sig.example/signal",
  )
  .option(
    "--transport-json <json>",
    'Full per-robot transport override as JSON (for fields the shorthand doesn\'t cover). Example: \'{"mode":"webrtc","webrtc":{"signalingUrl":"wss://sig.example/signal"}}\'',
  )
  .action(async (action: string | undefined, arg: string | undefined, extra: string | undefined, opts) => {
    await robotsCommand({
      action,
      arg,
      extra,
      name: opts.name,
      namespace: opts.namespace,
      camera: opts.camera,
      default: opts.default === true ? true : undefined,
      kind: opts.kind,
      sensors: opts.sensors,
      capabilities: opts.capabilities,
      features: opts.features,
      bindings: Array.isArray(opts.binding) && opts.binding.length > 0 ? opts.binding : undefined,
      apply: opts.apply === true,
      transport: opts.transport,
      transportJson: opts.transportJson,
    });
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
