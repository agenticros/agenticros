/**
 * `agenticros login` / `logout` / `whoami` — AgenticROS Cloud device-code auth.
 *
 * Persists credentials via the same configstore helpers as `set --token` /
 * `id` so connect / motors / menu keep working unchanged.
 */

import { confirm } from "@inquirer/prompts";

import { openInBrowser } from "./web.js";
import {
  CLOUD_REST,
  clearApiToken,
  fetchMe,
  getApiToken,
  getRobotId,
  isCloudRobotRegistered,
  maskToken,
  pollDeviceToken,
  requestDeviceCode,
  setApiToken,
} from "../util/robot-cloud-config.js";
import { dim, err, header, info, ok, warn } from "../util/logger.js";

export interface LoginOptions {
  /** Skip opening a browser (always print URL + code). */
  noOpen?: boolean;
}

export async function loginCommand(opts: LoginOptions = {}): Promise<void> {
  header("AgenticROS Cloud login");

  const existing = getApiToken();
  if (existing) {
    const me = await fetchMe();
    const label = me?.githubLogin || me?.email || me?.displayName || "signed in";
    const again = await confirm({
      message: `Already logged in as ${label} (${maskToken(existing)}). Log in again?`,
      default: false,
    });
    if (!again) {
      info("Keeping existing API token.");
      return;
    }
  }

  info("Requesting device code…");
  let device: Awaited<ReturnType<typeof requestDeviceCode>>;
  try {
    device = await requestDeviceCode();
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  process.stdout.write("\n");
  ok(`Open:  ${device.verification_uri_complete}`);
  info(`Or go to ${device.verification_uri} and enter code:`);
  process.stdout.write(`\n  ${device.user_code}\n\n`);
  dim(
    `Waiting for approval (expires in ${device.expires_in}s). Sign in with GitHub in the browser.`,
  );

  if (!opts.noOpen) {
    openInBrowser(device.verification_uri_complete);
  }

  let intervalMs = Math.max(3, device.interval || 5) * 1000;
  const deadline = Date.now() + device.expires_in * 1000;

  while (Date.now() < deadline) {
    await sleep(intervalMs);
    let result: Awaited<ReturnType<typeof pollDeviceToken>>;
    try {
      result = await pollDeviceToken(device.device_code);
    } catch (e) {
      warn(`Poll error: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    if (result.status === "ready") {
      setApiToken(result.apiToken);
      ok(`API token saved (${maskToken(result.apiToken)}).`);
      const me = await fetchMe();
      if (me) {
        const who =
          me.githubLogin || me.displayName || me.email || me.uid;
        ok(`Logged in as ${who}.`);
        if (me.robotCount != null) {
          dim(`  Cloud robots: ${me.robotCount}${me.maxRobots != null ? ` / ${me.maxRobots}` : ""}`);
        }
      } else {
        ok("Logged in (token stored).");
      }
      dim(`Next: agenticros register   # claim this robot on ${CLOUD_REST}`);
      return;
    }
    if (result.status === "slow_down") {
      intervalMs = Math.max(intervalMs + 1000, (result.interval || 5) * 1000);
      continue;
    }
    if (result.status === "pending") {
      process.stdout.write(".");
      continue;
    }
    if (result.status === "denied") {
      process.stdout.write("\n");
      err("Authorization denied in the browser.");
      process.exit(1);
    }
    if (result.status === "expired") {
      process.stdout.write("\n");
      err("Device code expired. Run `agenticros login` again.");
      process.exit(1);
    }
    process.stdout.write("\n");
    err(result.message);
    process.exit(1);
  }

  process.stdout.write("\n");
  err("Timed out waiting for browser approval. Run `agenticros login` again.");
  process.exit(1);
}

export async function logoutCommand(): Promise<void> {
  if (!getApiToken()) {
    info("Not logged in (no API token stored).");
    return;
  }
  clearApiToken();
  ok("API token cleared.");
  const id = getRobotId();
  if (id) {
    dim(`ROBOT ID kept: ${id}`);
  }
}

export async function whoamiCommand(): Promise<void> {
  header("AgenticROS Cloud account");
  const token = getApiToken();
  const robotId = getRobotId();

  if (!token) {
    warn("Not logged in.");
    dim("Run: agenticros login");
    return;
  }

  info(`API token: ${maskToken(token)}`);
  if (robotId) {
    info(`ROBOT ID:  ${robotId}`);
  } else {
    dim("ROBOT ID:  (none — run agenticros register or agenticros id)");
  }

  const me = await fetchMe();
  if (!me) {
    warn("Could not reach /me — token may be invalid or the cloud is unreachable.");
    dim(`Cloud: ${CLOUD_REST}`);
    return;
  }

  ok(`Account:  ${me.githubLogin || me.displayName || me.email || me.uid}`);
  if (me.email) dim(`  email: ${me.email}`);
  if (me.paidTier != null) dim(`  paidTier: ${me.paidTier}`);
  if (me.robotCount != null) {
    dim(
      `  robots: ${me.robotCount}${me.maxRobots != null && Number.isFinite(me.maxRobots) ? ` / ${me.maxRobots}` : ""}`,
    );
  }

  if (robotId) {
    const registered = await isCloudRobotRegistered();
    if (registered) {
      ok("This robot is registered on AgenticROS Cloud.");
    } else {
      warn("This robot id is not registered on your account yet.");
      dim("Run: agenticros register");
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
