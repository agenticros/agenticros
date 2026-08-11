/**
 * `agenticros remote` — run preset CLI actions on an online ARC robot.
 *
 *   agenticros remote list
 *   agenticros remote status [--robot <id>]
 *   agenticros remote start_motors [--robot <id>]
 *
 * Uses POST /robot/:id/cli on cloud.agenticros.com. No free-form shell.
 */

import { select } from "@inquirer/prompts";

import {
  REMOTE_CLI_ACTIONS,
  fetchRobotPresence,
  getApiToken,
  getRobotId,
  isRemoteCliAction,
  listMyRobots,
  runRemoteCli,
  type RemoteCliAction,
} from "../util/robot-cloud-config.js";
import { colors, dim, err, header, info, isTty, ok, warn } from "../util/logger.js";

export interface RemoteOptions {
  /** Subcommand: list | <action> */
  action?: string;
  /** --robot <id> */
  robot?: string;
  /** --json */
  json?: boolean;
}

const ACTION_LABELS: Record<RemoteCliAction, string> = {
  start_motors: "Start motors",
  stop_motors: "Stop motors",
  start_realsense: "Start RealSense",
  stop_realsense: "Stop RealSense",
  start_camera: "Start 2D camera",
  stop_camera: "Stop 2D camera",
  status: "Show status (JSON)",
};

export async function remoteCommand(opts: RemoteOptions): Promise<void> {
  const action = (opts.action ?? "").trim().toLowerCase();

  if (!getApiToken()) {
    err("Not logged in. Run `agenticros login` first.");
    process.exit(1);
  }

  if (!action || action === "list" || action === "ls") {
    return listRemoteRobots(opts.json === true);
  }

  if (!isRemoteCliAction(action)) {
    err(`Unknown remote action '${opts.action}'.`);
    err(`Use: list | ${REMOTE_CLI_ACTIONS.join(" | ")}`);
    process.exit(2);
  }

  const robotId = await resolveRobotId(opts.robot);
  await runAction(robotId, action, opts.json === true);
}

async function listRemoteRobots(asJson: boolean): Promise<void> {
  header("AgenticROS Cloud robots");
  let ids: string[];
  try {
    ids = await listMyRobots();
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  if (ids.length === 0) {
    warn("No robots registered to this account. Run `agenticros register` on a robot.");
    return;
  }

  const rows: { id: string; online: boolean }[] = [];
  for (const id of ids) {
    let online = false;
    try {
      const presence = await fetchRobotPresence(id);
      online = presence.online;
    } catch {
      online = false;
    }
    rows.push({ id, online });
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
    return;
  }

  for (const r of rows) {
    const badge = r.online ? colors.green("●") : colors.dim("○");
    const tag = r.online ? colors.green("online") : colors.dim("offline");
    process.stdout.write(`  ${badge}  ${colors.bold(r.id)}  ${tag}\n`);
  }
  process.stdout.write("\n");
  dim("Run a preset: agenticros remote <action> --robot <id>");
  dim(`Actions: ${REMOTE_CLI_ACTIONS.join(", ")}`);
}

async function resolveRobotId(explicit?: string): Promise<string> {
  if (explicit?.trim()) return explicit.trim();

  let ids: string[];
  try {
    ids = await listMyRobots();
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  if (ids.length === 0) {
    err("No robots registered. Run `agenticros register` on a robot first.");
    process.exit(1);
  }

  const localId = getRobotId();
  if (ids.length === 1) return ids[0]!;

  // Prefer the local ROBOT_ID when it belongs to this account.
  if (localId && ids.includes(localId)) {
    if (!isTty) return localId;
  }

  if (!isTty) {
    if (localId && ids.includes(localId)) return localId;
    err("Multiple robots on this account. Pass --robot <id>.");
    process.exit(2);
  }

  // Show presence in the picker.
  const choices = [];
  for (const id of ids) {
    let online = false;
    try {
      online = (await fetchRobotPresence(id)).online;
    } catch {
      online = false;
    }
    const badge = online ? "● online" : "○ offline";
    choices.push({
      name: `${id}  ${badge}`,
      value: id,
    });
  }

  return select<string>({
    message: "Which remote robot?",
    choices,
    default: localId && ids.includes(localId) ? localId : ids[0],
  });
}

async function runAction(
  robotId: string,
  action: RemoteCliAction,
  asJson: boolean,
): Promise<void> {
  info(`${ACTION_LABELS[action]} on ${robotId} …`);

  try {
    const presence = await fetchRobotPresence(robotId);
    if (!presence.online) {
      err(`Robot ${robotId} is offline (not connected to cloud).`);
      err("On the robot: agenticros connect");
      process.exit(1);
    }
  } catch {
    // Presence check is best-effort; the CLI endpoint will 503 if offline.
  }

  let result;
  try {
    result = await runRemoteCli(robotId, action);
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    if (result.command) dim(`Command: ${result.command}`);
    if (result.stdout.trim()) {
      process.stdout.write(`${result.stdout.replace(/\n$/, "")}\n`);
    }
    if (result.stderr.trim()) {
      process.stderr.write(`${colors.yellow(result.stderr.replace(/\n$/, ""))}\n`);
    }
    if (result.exitCode === 0) {
      ok(`Remote ${action} completed.`);
    } else {
      warn(`Remote ${action} exited with code ${result.exitCode}.`);
    }
  }

  if (result.exitCode !== 0) process.exit(result.exitCode);
}

/** Interactive picker used by the Cloud account menu. */
export async function remoteControlInteractive(): Promise<void> {
  if (!getApiToken()) {
    err("Not logged in. Run `agenticros login` first.");
    return;
  }

  const robotId = await resolveRobotId();
  const action = await select<RemoteCliAction | "__back__">({
    message: `Remote action for ${robotId}:`,
    choices: [
      ...REMOTE_CLI_ACTIONS.map((a) => ({
        name: ACTION_LABELS[a],
        value: a,
      })),
      { name: "Back", value: "__back__" as const },
    ],
  });
  if (action === "__back__") return;
  await runAction(robotId, action, false);
}
