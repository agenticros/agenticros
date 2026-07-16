/**
 * Idle + excited R2D2 sound loop for @agenticros/eyes.
 *
 * Plays synthesized WAV via afplay (macOS), paplay, or aplay (Linux).
 * Excited bursts are triggered by active cmd_vel (see exciteFromTwist).
 */
import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { synthesizeExcited, synthesizeRandom } from "./synth.js";

const MIN_GAP_MS = Number(process.env.SOUND_MIN_GAP_MS || 300);
const MAX_GAP_MS = Number(process.env.SOUND_MAX_GAP_MS || 2500);
const EXCITE_COOLDOWN_MS = Number(process.env.SOUND_EXCITE_COOLDOWN_MS || 600);
const LINEAR_DEADZONE = Number(process.env.SOUND_LINEAR_DEADZONE || 0.02);

/** @type {string | null} */
let playerBin = null;
let playerWarned = false;
let running = false;
/** @type {import('node:child_process').ChildProcess | null} */
let currentPlayer = null;
const tempFiles = new Set();
let pendingExcitement = 0;
/** @type {(() => void) | null} */
let wakeSleep = null;
let lastExciteAt = 0;
/** @type {Promise<void> | null} */
let loopPromise = null;

function sleepInterruptible(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      wakeSleep = null;
      resolve();
    }, ms);
    wakeSleep = () => {
      clearTimeout(timer);
      wakeSleep = null;
      resolve();
    };
  });
}

function randomGapMs() {
  return MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS);
}

function findPlayer() {
  if (playerBin !== null) return playerBin || null;
  const candidates = ["afplay", "paplay", "aplay"];
  for (const bin of candidates) {
    try {
      execFileSync("which", [bin], { stdio: "ignore" });
      playerBin = bin;
      return bin;
    } catch {
      // try next
    }
  }
  playerBin = "";
  return null;
}

function stopCurrentPlayback() {
  if (currentPlayer && !currentPlayer.killed) {
    currentPlayer.kill("SIGTERM");
  }
}

/**
 * Queue an excited burst (interrupt idle playback / gap).
 * Rate-limited by SOUND_EXCITE_COOLDOWN_MS.
 */
export function excite() {
  if (!running) return;
  const now = Date.now();
  if (now - lastExciteAt < EXCITE_COOLDOWN_MS) return;
  lastExciteAt = now;
  pendingExcitement += 1;
  stopCurrentPlayback();
  if (wakeSleep) wakeSleep();
}

/**
 * Excite when Twist has meaningful linear.x or angular.z.
 * @param {object} msg geometry_msgs/Twist-like
 * @param {number} angularDeadzone
 */
export function exciteFromTwist(msg, angularDeadzone = 0.05) {
  const lx = Math.abs(msg?.linear?.x ?? 0);
  const az = Math.abs(msg?.angular?.z ?? 0);
  if (lx < LINEAR_DEADZONE && az < angularDeadzone) return;
  excite();
}

async function playWav(wavPath) {
  const bin = findPlayer();
  if (!bin) {
    if (!playerWarned) {
      playerWarned = true;
      console.warn(
        "No audio player found (afplay / paplay / aplay). R2D2 sounds disabled.",
      );
    }
    return;
  }

  const args = bin === "aplay" ? ["-q", wavPath] : [wavPath];

  return new Promise((resolve, reject) => {
    const player = spawn(bin, args, { stdio: "ignore" });
    currentPlayer = player;

    player.on("error", (err) => {
      currentPlayer = null;
      reject(err);
    });

    player.on("close", (code, signal) => {
      currentPlayer = null;
      if (!running || signal === "SIGTERM" || signal === "SIGINT") {
        resolve();
        return;
      }
      if (code === 0) resolve();
      else reject(new Error(`${bin} exited with code ${code}`));
    });
  });
}

async function cleanupTemp(path) {
  tempFiles.delete(path);
  try {
    await unlink(path);
  } catch {
    // already gone
  }
}

async function playGesture(excited) {
  const { wav } = excited ? synthesizeExcited() : synthesizeRandom();
  const wavPath = join(tmpdir(), `agenticros-eyes-${randomUUID()}.wav`);
  tempFiles.add(wavPath);

  try {
    await writeFile(wavPath, wav);
    if (!running) return;
    await playWav(wavPath);
  } catch (err) {
    if (running) {
      console.warn(
        `Sound playback error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } finally {
    await cleanupTemp(wavPath);
  }
}

async function soundLoop() {
  while (running) {
    if (pendingExcitement > 0) {
      pendingExcitement -= 1;
      await playGesture(true);
      if (pendingExcitement > 0) continue;
    } else {
      await playGesture(false);
      if (pendingExcitement > 0) continue;
    }

    if (!running) break;
    await sleepInterruptible(randomGapMs());
  }
}

/** Start idle chirps + accept excite() from cmd_vel. */
export function startSoundLoop() {
  if (running) return;
  const bin = findPlayer();
  if (!bin) {
    if (!playerWarned) {
      playerWarned = true;
      console.warn(
        "No audio player found (afplay / paplay / aplay). R2D2 sounds disabled.",
      );
    }
    return;
  }
  running = true;
  console.log(
    `R2D2 sounds on (${bin}; idle gaps ${MIN_GAP_MS}–${MAX_GAP_MS} ms, ` +
      `excite cooldown ${EXCITE_COOLDOWN_MS} ms)`,
  );
  loopPromise = soundLoop().catch((err) => {
    console.warn(`Sound loop error: ${err instanceof Error ? err.message : String(err)}`);
  });
}

/** Stop playback and clean temp WAVs. */
export async function stopSoundLoop() {
  if (!running) return;
  running = false;
  if (wakeSleep) wakeSleep();
  stopCurrentPlayback();
  if (loopPromise) {
    try {
      await loopPromise;
    } catch {
      // ignore
    }
    loopPromise = null;
  }
  await Promise.all([...tempFiles].map(cleanupTemp));
}
