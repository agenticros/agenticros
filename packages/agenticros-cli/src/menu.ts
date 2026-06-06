/**
 * Interactive top-level menu for `agenticros` (invoked with no subcommand).
 *
 * Adaptive: when doctor reports a red check (workspace not built, no API key,
 * etc.) the first option becomes "First-time setup" so brand-new users land
 * naturally on `agenticros init`. Otherwise we lead with "Launch with real robot".
 */

import { select, confirm } from "@inquirer/prompts";

import { upCommand } from "./commands/up.js";
import { downCommand } from "./commands/down.js";
import { initCommand } from "./commands/init.js";
import { doctorCommand, hasRedChecks } from "./commands/doctor.js";
import { statusCommand } from "./commands/status.js";
import { logsCommand } from "./commands/logs.js";
import { configCommand } from "./commands/config.js";
import { skillsCommand } from "./commands/skills.js";
import { header, info, isTty, dim } from "./util/logger.js";
import { readState, formatAge } from "./util/state.js";
import { listSkills } from "./util/skills.js";

interface MenuChoice {
  name: string;
  value: string;
  description?: string;
}

export async function runMenu(): Promise<void> {
  if (!isTty) {
    info(
      "Interactive menu requires a TTY. Use a subcommand (e.g. `agenticros up real`) or `agenticros --help`.",
    );
    return;
  }

  header("AgenticROS - agentic AI for ROS-powered robots");

  const state = readState();
  if (state.lastMode) {
    const age = formatAge(state.lastUpAt);
    dim(`Last mode: ${state.lastMode}${age ? ` (${age})` : ""}`);
  }

  // Need-setup detection. Doctor returns a count; we use that to reorder.
  const setupNeeded = await hasRedChecks();

  const skillsListing = safeListSkills();
  const skillsSuffix = formatSkillsSuffix(skillsListing);

  const baseChoices: MenuChoice[] = [
    { name: "Launch with real robot", value: "real" },
    { name: "Launch with simulation", value: "sim" },
    { name: "First-time setup (workspace + OpenClaw plugin + API key)", value: "init" },
    { name: `Manage skills${skillsSuffix}`, value: "skills" },
    { name: "Stop everything", value: "down" },
    { name: "Doctor (health check)", value: "doctor" },
    { name: "Configure (API keys, namespace, transport)", value: "config" },
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
    default: setupNeeded ? "init" : state.lastMode === "sim-amr" || state.lastMode === "sim-arm" ? "sim" : "real",
  });

  switch (choice) {
    case "real":
      await upCommand({ target: "real" });
      break;
    case "sim": {
      const sub = await select<"sim-amr" | "sim-arm">({
        message: "Which simulated robot?",
        choices: [
          { name: "2-wheel AMR (camera + depth + LiDAR)", value: "sim-amr" },
          {
            name: "6-DOF arm (UR5e-shaped, per-joint position control)",
            value: "sim-arm",
          },
        ],
        default: "sim-amr",
      });
      const rviz = await confirm({ message: "Show RViz?", default: false });
      await upCommand({ target: sub, rviz });
      break;
    }
    case "init":
      await initCommand({});
      break;
    case "down":
      await downCommand({});
      break;
    case "doctor":
      await doctorCommand({});
      break;
    case "config":
      await configCommand({ action: "show" });
      break;
    case "skills":
      await skillsSubmenu();
      break;
    case "logs":
      await logsCommand({ target: undefined });
      break;
    case "status":
      await statusCommand({});
      break;
    case "quit":
    default:
      break;
  }
}

/**
 * Skills sub-menu. Reads the OpenClaw config so the prompt can show how many
 * skills are registered and offer the right next step (discover when nothing
 * is registered yet, otherwise list-first).
 */
async function skillsSubmenu(): Promise<void> {
  const listing = safeListSkills();
  const hasAvailable = listing && listing.available.length > 0;
  const hasRegistered = listing && listing.registered.length > 0;
  const action = await select<string>({
    message: "Skills:",
    choices: [
      { name: "List registered + available", value: "list" },
      {
        name: hasAvailable
          ? `Discover & register (${listing!.available.length} unregistered found)`
          : "Discover & register (interactive picker)",
        value: "discover",
      },
      { name: "Add a skill by path or package name", value: "add" },
      { name: "Remove a skill", value: "remove" },
      { name: "Sync OpenClaw contracts.tools allowlist", value: "sync" },
      { name: "Back", value: "back" },
    ],
    default: hasRegistered ? "list" : "discover",
  });
  if (action === "back") return;
  await skillsCommand({ action });
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
