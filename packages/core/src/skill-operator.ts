/**
 * Operator gate for installing or creating an AgenticROS skill.
 * A non-interactive caller cannot skip the desktop prompt with --yes.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

import { missingFeatures, type RobotProfile } from "./robot-profile.js";
import { skillsApiBase } from "./skill-refs.js";

export const SKILL_GRANT_ENV = "AGENTICROS_SKILL_GRANT";

const EXTERNAL_STACK_NOTES: Record<string, string> = {
  navigate_to: "Nav2 is not started by this install. Bring it up before navigate_to can run.",
  navigate_through_poses:
    "Nav2 is not started by this install. Bring it up before navigate_through_poses can run.",
  pick_object: "MoveIt is not started by this install. Bring it up before pick_object can run.",
  dock_to_charger:
    "OpenNav docking is not started by this install. Bring it up before dock_to_charger can run.",
  start_slam: "RTAB-Map is not started by this install. Bring it up before the SLAM capabilities can run.",
  stop_slam: "RTAB-Map is not started by this install. Bring it up before the SLAM capabilities can run.",
  save_map: "RTAB-Map is not started by this install. Bring it up before the SLAM capabilities can run.",
  load_map: "RTAB-Map is not started by this install. Bring it up before the SLAM capabilities can run.",
  explore: "Nav2 and a map are not started by this install. Bring them up before explore can run.",
  wander: "Nav2 is not started by this install. Bring it up before wander can run.",
  follow_person_ros:
    "The on-robot follow node is not started by this install. Bring it up before follow_person_ros can run.",
  detect_humans:
    "A detection publisher is not started by this install. Bring it up before detect_humans can run.",
};

export type InstallConfirmDecision = "proceed" | "ask-helper" | "ask-tty" | "refuse";

export function installConfirmDecision(opts: {
  grant: boolean;
  helperAvailable: boolean;
  tty: boolean;
}): InstallConfirmDecision {
  if (opts.grant) return "proceed";
  if (opts.helperAvailable) return "ask-helper";
  if (opts.tty) return "ask-tty";
  return "refuse";
}

export function approveHelperPath(): string {
  const fromEnv = process.env.COREBRUM_SKILLS_APPROVE?.trim();
  return fromEnv || "/usr/local/bin/corebrum-skills-approve";
}

export function externalStackNotes(capabilityIds: string[]): string[] {
  const notes: string[] = [];
  for (const id of capabilityIds) {
    const note = EXTERNAL_STACK_NOTES[id];
    if (note && !notes.includes(note)) notes.push(note);
  }
  return notes;
}

export interface SkillListing {
  marketplaceRef?: string;
  displayName?: string;
  description?: string;
  maintainerLogin?: string;
  capabilities?: Array<{ id?: string; requires?: string[] }>;
}

export async function fetchSkillListing(
  ref: string,
  apiBase?: string,
): Promise<SkillListing | null> {
  const trimmed = ref.trim();
  if (!trimmed || trimmed.startsWith("@") || !trimmed.includes("/")) return null;
  const [owner, ...rest] = trimmed.split("/");
  const skill = rest.join("/");
  const url = `${skillsApiBase(apiBase)}/skills/${encodeURIComponent(owner)}/${encodeURIComponent(skill)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Marketplace ${res.status} for ${trimmed}`);
  }
  return (await res.json()) as SkillListing;
}

export function listingCapabilityIds(listing: SkillListing | null): string[] {
  const ids: string[] = [];
  for (const cap of listing?.capabilities ?? []) {
    if (typeof cap.id === "string" && cap.id && !ids.includes(cap.id)) ids.push(cap.id);
  }
  return ids;
}

export function listingRequires(listing: SkillListing | null): string[] {
  const required: string[] = [];
  for (const cap of listing?.capabilities ?? []) {
    for (const feature of cap.requires ?? []) {
      if (feature && !required.includes(feature)) required.push(feature);
    }
  }
  return required;
}

export function runApproveHelper(title: string, author: string, detail: string): Promise<boolean> {
  const helper = approveHelperPath();
  if (!existsSync(helper)) return Promise.resolve(false);
  return new Promise((resolve) => {
    const child = spawn(helper, [title, author, detail], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timer = setTimeout(() => {
      child.kill();
      resolve(false);
    }, 120_000);
    let out = "";
    child.stdout?.on("data", (chunk: Buffer | string) => {
      out += String(chunk);
    });
    const finish = (code: number | null) => {
      clearTimeout(timer);
      const line = out.trim().split("\n")[0] ?? "";
      resolve(code === 0 && /^yes$/i.test(line));
    };
    child.on("error", () => finish(1));
    child.on("close", (code) => finish(code));
  });
}

export function runGrantedCli(args: string[]): Promise<{ code: number; output: string }> {
  const bin = process.env.AGENTICROS_BIN?.trim() || "agenticros";
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      env: { ...process.env, [SKILL_GRANT_ENV]: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout?.on("data", (chunk: Buffer | string) => {
      output += String(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      output += String(chunk);
    });
    child.on("error", (err) => {
      resolve({ code: 1, output: err.message });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

export interface SkillActionResult {
  ok: boolean;
  text: string;
}

async function approveAction(title: string, author: string, detail: string): Promise<"yes" | "no" | "refuse"> {
  const decision = installConfirmDecision({
    grant: process.env[SKILL_GRANT_ENV] === "1",
    helperAvailable: existsSync(approveHelperPath()),
    tty: Boolean(process.stdin.isTTY && process.stdout.isTTY),
  });
  if (decision === "proceed") return "yes";
  if (decision === "ask-helper") {
    return (await runApproveHelper(title, author, detail)) ? "yes" : "no";
  }
  if (decision === "ask-tty") {
    process.stdout.write(`${title}\n${author}\n${detail}\nApprove? [y/N] `);
    const answer = await new Promise<string>((resolve) => {
      process.stdin.setEncoding("utf8");
      process.stdin.once("data", (chunk) => resolve(String(chunk)));
    });
    return /^y(es)?$/i.test(answer.trim()) ? "yes" : "no";
  }
  return "refuse";
}

function approvalText(answer: "yes" | "no" | "refuse"): string | null {
  if (answer === "yes") return null;
  if (answer === "refuse") {
    return "Refusing to install or create a skill without an operator present.";
  }
  return "The operator did not approve.";
}

export async function installSkillForOperator(input: {
  ref: string;
  reason?: string;
  profile?: RobotProfile;
  apiBase?: string;
}): Promise<SkillActionResult> {
  const ref = input.ref.trim();
  if (!ref) return { ok: false, text: "install_ref is required." };

  let listing: SkillListing | null = null;
  if (!ref.startsWith("@")) {
    try {
      listing = await fetchSkillListing(ref, input.apiBase);
    } catch (err) {
      return {
        ok: false,
        text: err instanceof Error ? err.message : String(err),
      };
    }
    if (!listing) return { ok: false, text: `No marketplace skill matches ${ref}.` };
  }

  const missing = missingFeatures(input.profile, listingRequires(listing));
  if (missing.length > 0) {
    return {
      ok: false,
      text: `This robot is missing ${missing.join(", ")}. The skill was not installed.`,
    };
  }

  const ids = listingCapabilityIds(listing);
  const notes = externalStackNotes(ids);
  const title = listing?.displayName?.trim() || ref;
  const author = listing?.maintainerLogin ? `@${listing.maintainerLogin}` : ref;
  const detail = [
    listing?.description?.trim() || "Install this AgenticROS skill on this machine.",
    input.reason?.trim() ? `Reason: ${input.reason.trim()}` : "",
    ...notes,
  ]
    .filter(Boolean)
    .join("\n");

  const approved = await approveAction(title, author, detail);
  const denied = approvalText(approved);
  if (denied) return { ok: false, text: denied };

  const ran = await runGrantedCli(["skills", "install", ref]);
  const noteBlock = notes.length ? `\n${notes.join("\n")}` : "";
  const restart =
    "\nStart the agent again before the new tools are available in this session.";
  if (ran.code !== 0) {
    return { ok: false, text: `${ran.output.trim()}${noteBlock}`.trim() };
  }
  return { ok: true, text: `${ran.output.trim()}${noteBlock}${restart}`.trim() };
}

export async function createLocalSkillForOperator(input: {
  slug: string;
  reason?: string;
  template?: string;
}): Promise<SkillActionResult> {
  const slug = input.slug.trim();
  if (!slug) return { ok: false, text: "slug is required." };
  const detail = [
    `Create a local skill named ${slug}. It is not published.`,
    input.reason?.trim() ? `Reason: ${input.reason.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const approved = await approveAction("Create local skill", slug, detail);
  const denied = approvalText(approved);
  if (denied) return { ok: false, text: denied };

  const args = ["skills", "create-local", slug];
  if (input.template?.trim()) args.push("--template", input.template.trim());
  const ran = await runGrantedCli(args);
  if (ran.code !== 0) return { ok: false, text: ran.output.trim() };
  return {
    ok: true,
    text: `${ran.output.trim()}\nThis skill was not published. Start the agent again before its tools are available.`.trim(),
  };
}
