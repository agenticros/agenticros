/**
 * Spawn a long-running helper, detach it, and refuse to report success if it
 * dies during startup (native ABI mismatch, missing serial device, etc.).
 */

import { spawn } from "node:child_process";
import { closeSync, openSync, readFileSync, writeFileSync } from "node:fs";

export function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function tailLog(logPath, maxChars = 2000) {
  try {
    const text = readFileSync(logPath, "utf8");
    return text.length <= maxChars ? text : text.slice(-maxChars);
  } catch {
    return "(no log)";
  }
}

export async function spawnDetachedVerified({
  command,
  args,
  cwd,
  logFile,
  settleMs = 1500,
}) {
  try {
    writeFileSync(logFile, "");
  } catch {
    // best effort — spawn may still work without a truncated log
  }

  const out = openSync(logFile, "a");
  const child = spawn(command, args, {
    detached: true,
    stdio: ["ignore", out, out],
    cwd,
  });

  try {
    await new Promise((resolve, reject) => {
      const onError = (err) => reject(err);
      child.once("error", onError);
      if (child.pid) {
        child.off("error", onError);
        resolve();
        return;
      }
      child.once("spawn", () => {
        child.off("error", onError);
        resolve();
      });
    });
  } finally {
    try {
      closeSync(out);
    } catch {
      // already closed
    }
  }

  child.unref();

  if (settleMs > 0) {
    await new Promise((r) => setTimeout(r, settleMs));
  }

  if (!isPidAlive(child.pid)) {
    const log = tailLog(logFile);
    const err = new Error(`Process exited immediately.\nLast log output:\n${log}`);
    err.log = log;
    throw err;
  }

  return { pid: child.pid, logFile };
}
