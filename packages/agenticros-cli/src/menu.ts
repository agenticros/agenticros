/**
 * Interactive top-level menu for `agenticros` (invoked with no subcommand).
 *
 * Behavior:
 * - Looping: the menu redisplays after every non-launch action (doctor, config,
 *   skills, etc.) so the user keeps a stable home base. Only the real-robot and
 *   simulation launches hand off the terminal to a long-running process and
 *   therefore terminate the menu.
 * - Every sub-prompt offers an explicit "Back to main menu" option so users
 *   never get trapped on a path they accidentally entered (notably the sim
 *   robot picker, which previously had no escape hatch).
 * - Adaptive: when doctor reports a red check (workspace not built, no API key,
 *   etc.) the first option becomes "First-time setup" so brand-new users land
 *   naturally on `agenticros init`. Otherwise we lead with "Launch with real
 *   robot".
 */

import { input, select } from "@inquirer/prompts";

import { upCommand } from "./commands/up.js";
import { downCommand } from "./commands/down.js";
import { initCommand } from "./commands/init.js";
import { doctorCommand, hasRedChecks } from "./commands/doctor.js";
import { statusCommand } from "./commands/status.js";
import { logsCommand } from "./commands/logs.js";
import { configCommand } from "./commands/config.js";
import { eyesCommand } from "./commands/eyes.js";
import { openInBrowser, webCommand } from "./commands/web.js";
import { createSkillCommand } from "./commands/create-skill.js";
import { publishSkillCommand } from "./commands/publish-skill.js";
import { skillsCommand } from "./commands/skills.js";
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
import { CLOUD_REST, getApiToken } from "./util/robot-cloud-config.js";
import { header, info, isTty, dim, ok } from "./util/logger.js";
import { readState, formatAge } from "./util/state.js";
import { listSkills } from "./util/skills.js";

interface MenuChoice {
  name: string;
  value: string;
  description?: string;
}

/** Sentinel used by sub-prompts to ask the main loop to redraw without acting. */
const BACK = "__back__" as const;

export async function runMenu(): Promise<void> {
  if (!isTty) {
    info(
      "Interactive menu requires a TTY. Use a subcommand (e.g. `agenticros up real`) or `agenticros --help`.",
    );
    return;
  }

  header("AgenticROS - agentic AI for ROS-powered robots");

  while (true) {
    const shouldExit = await runMenuOnce();
    if (shouldExit) return;
  }
}

/**
 * Render the main menu once and dispatch the chosen action.
 * @returns true if the menu should exit (the action either launched a
 * long-running process or the user asked to quit).
 */
async function runMenuOnce(): Promise<boolean> {
  const state = readState();
  if (state.lastMode) {
    const age = formatAge(state.lastUpAt);
    dim(`Last mode: ${state.lastMode}${age ? ` (${age})` : ""}`);
  }

  const setupNeeded = await hasRedChecks();

  const skillsListing = safeListSkills();
  const skillsSuffix = formatSkillsSuffix(skillsListing);

  const baseChoices: MenuChoice[] = [
    { name: "Launch with real robot", value: "real" },
    { name: "Launch with simulation", value: "sim" },
    { name: "Robot hardware (connect, motors, camera, realsense)", value: "hardware" },
    { name: "Start robot eyes (local display)", value: "eyes" },
    { name: "First-time setup (workspace + OpenClaw + Cloud login)", value: "init" },
    { name: `Manage skills${skillsSuffix}`, value: "skills" },
    { name: "Stop everything", value: "down" },
    { name: "Doctor (health check)", value: "doctor" },
    { name: "Configure (API keys, namespace, transport)", value: "config" },
    { name: "OpenClaw web dashboard (config + teleop)", value: "web" },
    { name: "AgenticROS Cloud (login, register, account)", value: "account" },
    { name: "Open AgenticROS Cloud in browser", value: "cloud" },
    { name: "Tail logs", value: "logs" },
    { name: "Show status", value: "status" },
    { name: "Quit", value: "quit" },
  ];

  const choices: MenuChoice[] = setupNeeded
    ? [
        baseChoices.find((c) => c.value === "init")!,
        ...baseChoices.filter((c) => c.value !== "init"),
      ]
    : baseChoices;

  const choice = await select<string>({
    message: "What would you like to do?",
    choices,
    default: setupNeeded
      ? "init"
      : state.lastMode === "sim-amr" || state.lastMode === "sim-arm"
        ? "sim"
        : "real",
  });

  switch (choice) {
    case "real":
      await upCommand({ target: "real" });
      // Hands control to the foreground launcher; menu is done.
      return true;
    case "sim": {
      const launched = await runSimFlow();
      // launched === true ⇒ upCommand has taken over; otherwise back to main.
      return launched;
    }
    case "hardware":
      await hardwareSubmenu();
      return false;
    case "eyes":
      await eyesCommand({});
      return false;
    case "init":
      await initCommand({});
      return false;
    case "down":
      await downCommand({});
      return false;
    case "doctor":
      await doctorCommand({});
      return false;
    case "config":
      await configCommand({ action: "show" });
      return false;
    case "web":
      await webCommand({});
      return false;
    case "account":
      await accountSubmenu();
      return false;
    case "cloud":
      info("AgenticROS Cloud:");
      ok(`  ${CLOUD_REST}`);
      openInBrowser(CLOUD_REST);
      return false;
    case "skills":
      await skillsSubmenu();
      return false;
    case "logs":
      await logsCommand({ target: undefined });
      return false;
    case "status":
      await statusCommand({});
      return false;
    case "quit":
    default:
      return true;
  }
}

/**
 * Simulation launch flow. Two prompts (which robot, then RViz?) — both expose
 * "Back to main menu" so the user can bail out at any step without launching.
 * @returns true if a simulation was launched (caller should exit the menu),
 * false if the user backed out.
 */
async function runSimFlow(): Promise<boolean> {
  const target = await select<"sim-amr" | "sim-arm" | typeof BACK>({
    message: "Which simulated robot?",
    choices: [
      { name: "2-wheel AMR (camera + depth + LiDAR)", value: "sim-amr" },
      {
        name: "6-DOF arm (UR5e-shaped, per-joint position control)",
        value: "sim-arm",
      },
      { name: "Back to main menu", value: BACK },
    ],
    default: "sim-amr",
  });
  if (target === BACK) return false;

  const rvizChoice = await select<"yes" | "no" | typeof BACK>({
    message: "Show RViz?",
    choices: [
      { name: "No", value: "no" },
      { name: "Yes", value: "yes" },
      { name: "Back to main menu", value: BACK },
    ],
    default: "no",
  });
  if (rvizChoice === BACK) return false;

  await upCommand({ target, rviz: rvizChoice === "yes" });
  return true;
}

/**
 * On-robot hardware submenu (cloud connect, motors, cameras).
 */
async function hardwareSubmenu(): Promise<void> {
  while (true) {
    const action = await select<string>({
      message: "Robot hardware:",
      choices: [
        { name: "Connect to cloud (cloud.agenticros.com)", value: "connect" },
        { name: "Disconnect from cloud", value: "disconnect" },
        { name: "Start motors", value: "start-motors" },
        { name: "Stop motors", value: "stop-motors" },
        { name: "Start RealSense", value: "start-realsense" },
        { name: "Stop RealSense", value: "stop-realsense" },
        { name: "Start 2D camera", value: "start-camera" },
        { name: "Stop 2D camera", value: "stop-camera" },
        { name: "Show robot ID", value: "id" },
        { name: "Advanced: set API token / robot ID manually", value: "set" },
        { name: "Back to main menu", value: BACK },
      ],
      default: "connect",
    });
    if (action === BACK) return;
    try {
      switch (action) {
        case "connect":
          await connectCommand({});
          break;
        case "disconnect":
          await disconnectCommand();
          break;
        case "start-motors":
          await startServiceCommand("motors", {});
          break;
        case "stop-motors":
          await stopServiceCommand("motors");
          break;
        case "start-realsense":
          await startServiceCommand("realsense", {});
          break;
        case "stop-realsense":
          await stopServiceCommand("realsense");
          break;
        case "start-camera":
          await startServiceCommand("camera", {});
          break;
        case "stop-camera":
          await stopServiceCommand("camera");
          break;
        case "id":
          await idCommand();
          break;
        case "set": {
          const token = await input({
            message: "API token from cloud.agenticros.com (empty to skip):",
            validate: () => true,
          });
          const id = await input({
            message: "Robot ID (empty to skip):",
            validate: () => true,
          });
          await setCommand({
            token: token.trim() || undefined,
            id: id.trim() || undefined,
          });
          break;
        }
        default:
          break;
      }
    } catch (e) {
      info(e instanceof Error ? e.message : String(e));
    }
  }
}

/**
 * Cloud account submenu: login / register / whoami / logout, plus manual token set.
 */
async function accountSubmenu(): Promise<void> {
  while (true) {
    const loggedIn = Boolean(getApiToken());
    const action = await select<string>({
      message: "AgenticROS Cloud:",
      choices: [
        {
          name: loggedIn
            ? "Log in again (device code + GitHub)"
            : "Log in (device code + GitHub)",
          value: "login",
        },
        { name: "Register this robot", value: "register" },
        { name: "Who am I?", value: "whoami" },
        { name: "Log out (clear API token)", value: "logout" },
        { name: "Advanced: set API token / robot ID manually", value: "set" },
        { name: "Open cloud portal in browser", value: "open" },
        { name: "Back to main menu", value: BACK },
      ],
      default: loggedIn ? "register" : "login",
    });
    if (action === BACK) return;
    try {
      switch (action) {
        case "login":
          await loginCommand({});
          break;
        case "register":
          await registerCommand({});
          break;
        case "whoami":
          await whoamiCommand();
          break;
        case "logout":
          await logoutCommand();
          break;
        case "set": {
          const token = await input({
            message: "API token from cloud.agenticros.com (empty to skip):",
            validate: () => true,
          });
          const id = await input({
            message: "Robot ID (empty to skip):",
            validate: () => true,
          });
          await setCommand({
            token: token.trim() || undefined,
            id: id.trim() || undefined,
          });
          break;
        }
        case "open":
          openInBrowser(CLOUD_REST);
          break;
        default:
          break;
      }
    } catch (e) {
      info(e instanceof Error ? e.message : String(e));
    }
  }
}

/**
 * Skills sub-menu. Loops until the user picks "Back to main menu" so the user
 * can run several skill actions (list, then discover, then sync, …) without
 * round-tripping through the top-level menu each time.
 */
async function skillsSubmenu(): Promise<void> {
  while (true) {
    const listing = safeListSkills();
    const hasAvailable = listing && listing.available.length > 0;
    const hasRegistered = listing && listing.registered.length > 0;
    const action = await select<string>({
      message: "Skills:",
      choices: [
        { name: "Create a new skill", value: "create" },
        { name: "Publish skill (from skill directory)", value: "publish" },
        { name: "List registered + available", value: "list" },
        { name: "Search marketplace (skills.agenticros.com)", value: "search" },
        { name: "Install from marketplace (owner/skill)", value: "install" },
        {
          name: hasAvailable
            ? `Discover & register local clones (${listing!.available.length} found)`
            : "Discover & register local clones",
          value: "discover",
        },
        { name: "Add a skill by path or package name", value: "add" },
        { name: "Remove a skill", value: "remove" },
        { name: "Sync OpenClaw contracts.tools allowlist", value: "sync" },
        { name: "Back to main menu", value: BACK },
      ],
      default: hasRegistered ? "list" : "search",
    });
    if (action === BACK) return;
    if (action === "search") {
      const q = await input({
        message: "Search terms (empty = browse most popular):",
        validate: () => true,
      });
      await skillsCommand({ action: "search", arg: q.trim() });
      continue;
    }
    if (action === "create") {
      const slug = await input({
        message: "Skill slug (e.g. hello-world, follow-me):",
        validate: (v) => v.trim().length > 0 || "Required",
      });
      const template = await select<string>({
        message: "Template:",
        choices: [
          { name: "Hello World (tutorial, local dev)", value: "hello" },
          { name: "Robot action (cmd_vel wave)", value: "robot" },
          { name: "Camera capture", value: "camera" },
          { name: "Depth / RealSense", value: "depth" },
        ],
        default: "hello",
      });
      await createSkillCommand({ slug: slug.trim(), template });
      continue;
    }
    if (action === "publish") {
      await publishSkillCommand({});
      continue;
    }
    if (action === "install") {
      const slug = await input({
        message: "Marketplace ref to install (e.g. chrismatthieu/followme):",
        validate: (v) => v.trim().length > 0 || "Required",
      });
      await skillsCommand({ action: "install", arg: slug.trim() });
      continue;
    }
    await skillsCommand({ action });
  }
}

/** Read skills without throwing; the menu must keep working even if the config is broken. */
function safeListSkills(): ReturnType<typeof listSkills> | undefined {
  try {
    return listSkills();
  } catch {
    return undefined;
  }
}

/** Inline summary attached to the "Manage skills" menu label. */
function formatSkillsSuffix(listing: ReturnType<typeof listSkills> | undefined): string {
  if (!listing) return "";
  const parts: string[] = [];
  if (listing.registered.length > 0) {
    parts.push(`${listing.registered.length} registered`);
  }
  if (listing.available.length > 0) {
    parts.push(`${listing.available.length} available`);
  }
  if (listing.brokenPaths.length > 0) {
    parts.push(`${listing.brokenPaths.length} broken`);
  }
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}
