import assert from "node:assert/strict";
import { unlinkSync } from "node:fs";
import test from "node:test";

import { isPidAlive, spawnDetachedVerified } from "./spawn-detached.js";

function tmpLog(suffix) {
  return `/tmp/agenticros-spawn-test-${process.pid}-${suffix}.log`;
}

function rmLog(path) {
  try {
    unlinkSync(path);
  } catch {
    // ignore
  }
}

test("spawnDetachedVerified fails when the child exits immediately", async () => {
  const logFile = tmpLog("crash");
  try {
    await assert.rejects(
      () =>
        spawnDetachedVerified({
          command: process.execPath,
          args: ["-e", "console.error('boom-native'); process.exit(1)"],
          logFile,
          settleMs: 250,
        }),
      (err) => {
        assert.match(String(err), /exited immediately/);
        assert.match(String(err), /boom-native/);
        return true;
      },
    );
  } finally {
    rmLog(logFile);
  }
});

test("spawnDetachedVerified succeeds when the child stays alive", async () => {
  const logFile = tmpLog("alive");
  let pid;
  try {
    const result = await spawnDetachedVerified({
      command: process.execPath,
      args: ["-e", "setInterval(() => {}, 1000)"],
      logFile,
      settleMs: 250,
    });
    pid = result.pid;
    assert.ok(pid);
    assert.equal(isPidAlive(pid), true);
  } finally {
    if (pid && isPidAlive(pid)) {
      try {
        process.kill(pid);
      } catch {
        // ignore
      }
    }
    rmLog(logFile);
  }
});
