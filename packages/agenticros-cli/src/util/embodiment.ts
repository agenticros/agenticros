/**
 * Standing instruction merged into each agent's own instruction file.
 * A re-run replaces only the block between the sentinels.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const EMBODIMENT_BEGIN = "<!-- agenticros-embodiment -->";
export const EMBODIMENT_END = "<!-- /agenticros-embodiment -->";

export const EMBODIMENT_TEXT = [
  "AgenticROS is your body on this machine. Use its tools to see, sense, and act through ROS here.",
  'When the user asks what you see, asks for a photo, or mentions the camera, call ros2_camera_snapshot with no topic and describe the image.',
  "When they ask you to move, stop, or carry out a mission that needs the camera, the motors, or any other ROS topic on this computer, use the AgenticROS tools. Call ros2_estop to stop motion.",
  'Do not ask them to say "AgenticROS".',
].join("\n");

export function embodimentBlock(): string {
  return `${EMBODIMENT_BEGIN}\n${EMBODIMENT_TEXT}\n${EMBODIMENT_END}\n`;
}

/** Insert or replace the embodiment block. Other text in the file stays. */
export function upsertEmbodiment(existing: string | null): string {
  const block = embodimentBlock();
  const text = existing ?? "";
  const begin = text.indexOf(EMBODIMENT_BEGIN);
  const end = text.indexOf(EMBODIMENT_END);
  if (begin >= 0 && end > begin) {
    const head = text.slice(0, begin).replace(/\s*$/, "");
    const tail = text.slice(end + EMBODIMENT_END.length).replace(/^\s*/, "");
    const parts = [head, block.trimEnd(), tail].filter((part) => part.length > 0);
    return `${parts.join("\n\n")}\n`;
  }
  if (!text.trim()) return block;
  return `${text.replace(/\s*$/, "")}\n\n${block}`;
}

export function writeEmbodimentFile(path: string): void {
  const existing = existsSync(path) ? readFileSync(path, "utf8") : null;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, upsertEmbodiment(existing), "utf8");
}

export function claudeInstructionPath(): string {
  return join(homedir(), ".claude", "CLAUDE.md");
}

export function codexInstructionPath(): string {
  return join(homedir(), ".codex", "AGENTS.md");
}

export function hermesInstructionPath(): string {
  return join(homedir(), ".hermes", "SOUL.md");
}

export function grokInstructionPath(): string {
  return join(homedir(), ".grok", "AGENTS.md");
}

export function cursorRulePath(): string {
  return join(homedir(), ".cursor", "rules", "agenticros.mdc");
}

/** Cursor user rule. This file is owned by AgenticROS; other rules are left alone. */
export function cursorRuleContent(): string {
  return `---
description: AgenticROS is this machine's body for ROS
alwaysApply: true
---

${embodimentBlock()}`;
}

export function writeCursorRule(path = cursorRulePath()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, cursorRuleContent(), "utf8");
}
