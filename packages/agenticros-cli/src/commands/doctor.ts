/**
 * `agenticros doctor` - environment health check.
 *
 * Runs every check, prints a coloured table, exits non-zero if any check is
 * red. With --json, emits a structured JSON object suitable for CI.
 *
 * The same check infrastructure powers the menu's "needs first-time setup"
 * detection (`hasRedChecks()`) so the UX stays consistent.
 */

import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { execa } from "execa";

import { getCliPaths } from "../util/paths.js";
import { detectRosDistro, hasGazeboHarmonic } from "../util/env.js";
import { colors, header, ok, warn, err, info } from "../util/logger.js";
import { activeConfigPath, profilesDir, readActiveMode } from "../util/profiles.js";
import {
  ensureToolsAlsoAllow,
  readAgenticrosContractTools,
  readOpenclawConfig,
} from "../util/openclaw-config.js";
import { listSkills } from "../util/skills.js";

export type Severity = "green" | "yellow" | "red";

export interface CheckResult {
  id: string;
  label: string;
  severity: Severity;
  detail?: string;
  hint?: string;
}

export interface DoctorReport {
  checks: CheckResult[];
  summary: { green: number; yellow: number; red: number };
}

export interface DoctorOptions {
  json?: boolean;
}

export async function doctorCommand(opts: DoctorOptions): Promise<number> {
  const report = await runDoctorChecks();

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    header("AgenticROS doctor");
    for (const c of report.checks) {
      const icon =
        c.severity === "green"
          ? colors.green("✓")
          : c.severity === "yellow"
            ? colors.yellow("○")
            : colors.red("✗");
      const labelText = `${icon} ${c.label}`;
      const detail = c.detail ? `  ${colors.dim(c.detail)}` : "";
      process.stdout.write(`${labelText}${detail}\n`);
      if (c.severity === "red" && c.hint) {
        process.stdout.write(`     ${colors.dim("→ " + c.hint)}\n`);
      }
    }
    const s = report.summary;
    process.stdout.write(
      `\n${colors.bold("Summary:")} ${colors.green(`${s.green} green`)}, ${colors.yellow(`${s.yellow} yellow`)}, ${colors.red(`${s.red} red`)}\n`,
    );
    if (s.red > 0) {
      info("Try `agenticros init` to fix the red checks.");
    }
  }

  return report.summary.red > 0 ? 1 : 0;
}

/** Returns true if any red check is present — used by the menu to reorder choices. */
export async function hasRedChecks(): Promise<boolean> {
  const report = await runDoctorChecks();
  return report.summary.red > 0;
}

export async function runDoctorChecks(): Promise<DoctorReport> {
  const paths = getCliPaths();
  const checks: CheckResult[] = [];

  // ROS distro.
  const ros = detectRosDistro();
  if (ros.distro) {
    checks.push({
      id: "ros-distro",
      label: `ROS 2 distro detected (${ros.distro})`,
      severity: "green",
    });
  } else {
    checks.push({
      id: "ros-distro",
      label: "ROS 2 not detected",
      severity: "red",
      hint: "Install ROS 2 Humble or Jazzy: https://docs.ros.org/en/humble/Installation.html",
    });
  }

  // pnpm + node.
  try {
    const { stdout } = await execa("node", ["--version"], { reject: false });
    const ver = stdout.trim().replace(/^v/, "");
    const major = Number(ver.split(".")[0]);
    checks.push({
      id: "node",
      label: `Node ${ver}`,
      severity: major >= 20 ? "green" : "yellow",
      hint: major >= 20 ? undefined : "AgenticROS targets Node >= 20.",
    });
  } catch {
    checks.push({
      id: "node",
      label: "Node not installed",
      severity: "red",
      hint: "Install Node 20+ from https://nodejs.org",
    });
  }

  // Workspace built (workspace mode only).
  if (paths.workspaceMode) {
    const installSetup = join(paths.repoRoot!, "ros2_ws", "install", "setup.bash");
    checks.push({
      id: "ros2-ws-built",
      label: "ros2_ws colcon-built",
      severity: existsSync(installSetup) ? "green" : "red",
      hint: existsSync(installSetup)
        ? undefined
        : "Build with: cd ros2_ws && colcon build --symlink-install",
    });

    const nm = join(paths.repoRoot!, "node_modules");
    checks.push({
      id: "js-deps",
      label: "JS workspace deps installed",
      severity: existsSync(nm) ? "green" : "red",
      hint: existsSync(nm) ? undefined : "Run: pnpm install",
    });
  }

  // MCP server built.
  const mcpIndex = join(paths.mcpDistDir, "index.js");
  if (existsSync(mcpIndex)) {
    const ageDays = (Date.now() - statSync(mcpIndex).mtimeMs) / 86_400_000;
    checks.push({
      id: "mcp-built",
      label: "@agenticros/claude-code MCP server built",
      severity: ageDays < 30 ? "green" : "yellow",
      detail: `dist age: ${Math.round(ageDays)} day(s)`,
      hint: ageDays >= 30 ? "Rebuild with `pnpm --filter @agenticros/claude-code build`" : undefined,
    });
  } else {
    checks.push({
      id: "mcp-built",
      label: "@agenticros/claude-code MCP server NOT built",
      severity: "red",
      hint: paths.workspaceMode
        ? "Run: pnpm --filter @agenticros/claude-code build"
        : "Re-run `agenticros init` to repopulate the bundled MCP dist.",
    });
  }

  // Disk free.
  try {
    const { stdout } = await execa("df", ["-Pk", paths.workspaceMode ? paths.repoRoot! : paths.installDir], {
      reject: false,
    });
    const lines = stdout.trim().split("\n");
    const last = lines[lines.length - 1] ?? "";
    const cols = last.trim().split(/\s+/);
    const availKb = Number(cols[3]);
    if (Number.isFinite(availKb)) {
      const availGb = availKb / 1_048_576;
      const sev: Severity = availGb >= 5 ? "green" : availGb >= 2 ? "yellow" : "red";
      checks.push({
        id: "disk",
        label: `Disk free: ${availGb.toFixed(1)} GB`,
        severity: sev,
        hint:
          sev === "red"
            ? "Free at least 2 GB before colcon build / pnpm install."
            : sev === "yellow"
              ? "Disk is getting tight; consider cleaning ~/.cache/pip or large docker images."
              : undefined,
      });
    }
  } catch {
    // skip if df missing
  }

  // Gazebo (informational - only red for sim modes).
  checks.push({
    id: "gz",
    label: hasGazeboHarmonic() ? "Gazebo Harmonic available" : "Gazebo not installed",
    severity: hasGazeboHarmonic() ? "green" : "yellow",
    hint: hasGazeboHarmonic()
      ? undefined
      : "Required only for simulation. Install with: sudo apt install gz-harmonic ros-humble-ros-gz",
  });

  // Mode profile + namespace shadowing. Each mode (real / sim) needs its own
  // namespace in ~/.agenticros/config.json. If AGENTICROS_ROBOT_NAMESPACE is
  // exported in the shell (or hardcoded in .mcp.json env), it unconditionally
  // overrides the config file - silently breaking the other mode.
  const mode = readActiveMode();
  const cfgPath = activeConfigPath();
  if (mode) {
    checks.push({
      id: "active-mode",
      label: `Active mode: ${mode} (~/.agenticros/profiles/${mode}.json)`,
      severity: existsSync(cfgPath) ? "green" : "yellow",
      hint: existsSync(cfgPath)
        ? undefined
        : "Run `agenticros mode real` (or sim) to populate ~/.agenticros/config.json.",
    });
  } else {
    checks.push({
      id: "active-mode",
      label: "Active mode profile not set",
      severity: existsSync(profilesDir()) ? "yellow" : "yellow",
      hint: "Run `agenticros mode real` (or sim) to pick a profile.",
    });
  }

  const envNs = (process.env["AGENTICROS_ROBOT_NAMESPACE"] ?? "").trim();
  if (envNs.length > 0) {
    const shadowsSim = mode === "sim" || mode === null;
    checks.push({
      id: "ns-env-shadow",
      label: shadowsSim
        ? `AGENTICROS_ROBOT_NAMESPACE env shadows config (set to '${envNs}')`
        : `AGENTICROS_ROBOT_NAMESPACE env overrides config (set to '${envNs}')`,
      severity: shadowsSim ? "red" : "yellow",
      hint: shadowsSim
        ? "Unset that env var (or set it to \"\" in .mcp.json / claude_desktop_config.json) so the active mode profile drives the namespace."
        : "Fine for real-robot mode if the value matches your robot's namespace.",
    });
  }

  // OpenAI key.
  const home = process.env["HOME"] ?? "";
  const authFile = join(home, ".openclaw", "agents", "main", "agent", "auth-profiles.json");
  const haveEnv = (process.env["OPENAI_API_KEY"] ?? "").length > 10;
  const haveFile = existsSync(authFile);
  checks.push({
    id: "openai-key",
    label: haveEnv ? "OpenAI key in env" : haveFile ? "OpenAI key in OpenClaw profiles" : "OpenAI key not configured",
    severity: haveEnv || haveFile ? "green" : "yellow",
    hint:
      haveEnv || haveFile
        ? undefined
        : "Set OPENAI_API_KEY in env, or run `agenticros init` to configure it interactively.",
  });

  // OpenClaw plugin.
  const ocConfig = join(home, ".openclaw", "openclaw.json");
  checks.push({
    id: "openclaw-config",
    label: existsSync(ocConfig) ? "OpenClaw config present" : "OpenClaw config missing",
    severity: existsSync(ocConfig) ? "green" : "red",
    hint: existsSync(ocConfig) ? undefined : "Run `agenticros init` to install the OpenClaw plugin.",
  });

  // tools.alsoAllow vs plugin contracts.tools. OpenClaw 2026.6+ tool profiles
  // ("coding", "standard", …) are strict allowlists applied BEFORE plugin tools
  // are merged in - missing entries here is why "OpenClaw says it has no
  // ros2_camera_snapshot" even when the plugin loaded successfully. We do a
  // dry-run sync (write:false) to compute the delta without touching the file.
  if (existsSync(ocConfig)) {
    const cfg = readOpenclawConfig();
    const tools = readAgenticrosContractTools(paths.repoRoot ?? paths.installDir);
    if (cfg && tools && tools.length > 0) {
      const dry = ensureToolsAlsoAllow(tools, { cfg, write: false });
      if (dry && dry.added.length > 0) {
        const profile = (cfg["tools"] as Record<string, unknown> | undefined)?.["profile"];
        const profileStr = typeof profile === "string" ? profile : "(default)";
        checks.push({
          id: "tools-alsoallow",
          label: `OpenClaw tools.alsoAllow missing ${dry.added.length} AgenticROS tool(s)`,
          severity: "red",
          detail: `tools.profile = ${profileStr}; chat agent will not see: ${dry.added.slice(0, 4).join(", ")}${dry.added.length > 4 ? ", …" : ""}`,
          hint: "Run `agenticros skills sync` (or re-run `agenticros init`) to repair the allowlist.",
        });
      } else {
        checks.push({
          id: "tools-alsoallow",
          label: `OpenClaw tools.alsoAllow covers every AgenticROS tool`,
          severity: "green",
        });
      }
    }
  }

  // Skills (only meaningful once the OpenClaw config exists).
  if (existsSync(ocConfig)) {
    try {
      const skills = listSkills();
      if (skills.brokenPaths.length > 0) {
        checks.push({
          id: "skills",
          label: `Skills: ${skills.registered.length} registered, ${skills.brokenPaths.length} broken`,
          severity: "yellow",
          detail: skills.available.length > 0 ? `${skills.available.length} cloned but unregistered` : undefined,
          hint:
            "Run `agenticros skills` to inspect; broken paths point at directories that no longer contain a valid skill.",
        });
      } else if (skills.registered.length > 0) {
        const ids = skills.registered.map((s) => s.id).join(", ");
        const unbuilt = skills.registered.filter((s) => s.dir && s.built === false);
        if (unbuilt.length > 0) {
          checks.push({
            id: "skills",
            label: `Skills: ${skills.registered.length} registered, ${unbuilt.length} not built (${unbuilt.map((s) => s.id).join(", ")})`,
            severity: "yellow",
            hint:
              `Build them so the OpenClaw plugin can load their tools:\n` +
              unbuilt.map((s) => `      cd ${s.dir} && pnpm build`).join("\n"),
          });
        } else {
          checks.push({
            id: "skills",
            label: `Skills: ${skills.registered.length} registered (${ids})`,
            severity: "green",
            detail:
              skills.available.length > 0
                ? `${skills.available.length} cloned but unregistered`
                : undefined,
            hint:
              skills.available.length > 0
                ? "Run `agenticros skills discover` to register the cloned-but-unregistered ones."
                : undefined,
          });
        }
      } else {
        checks.push({
          id: "skills",
          label: "Skills: none registered",
          severity: "yellow",
          detail: skills.available.length > 0 ? `${skills.available.length} cloned but unregistered` : "(none cloned)",
          hint:
            skills.available.length > 0
              ? "Run `agenticros skills discover` to register cloned skills."
              : "Skills are optional. Clone any `agenticros-skill-*` repo near this one to make it discoverable.",
        });
      }
    } catch {
      // Skip silently if listing fails (already covered by openclaw-config check).
    }
  }

  // Skill config sanity: detect "phantom blanks" in OpenClaw's plugin config that
  // historically broke skills (e.g. config UI saving every field as "" or 0 →
  // depthTopic="" → follow_robot publishes linear.x=0 → no motor motion).
  // Modern agenticros-skill-followme treats blanks/zeros as "use default", but a
  // user running an older skill version will still see the bug. We surface it.
  if (existsSync(ocConfig)) {
    try {
      const oc = readOpenclawConfig() as Record<string, unknown> | null;
      const ag = (oc?.plugins as Record<string, unknown> | undefined)?.entries as
        | Record<string, unknown>
        | undefined;
      const fm = (
        (((ag?.agenticros as Record<string, unknown> | undefined)?.config as
          | Record<string, unknown>
          | undefined)?.skills as Record<string, unknown> | undefined)?.followme
      ) as Record<string, unknown> | undefined;
      if (fm) {
        const stringKeysNeedingValue = [
          "depthTopic",
          "cameraTopic",
          "vlmModel",
          "ollamaUrl",
        ];
        const numericKeysExpectedPositive = [
          "rateHz",
          "targetDistance",
          "searchAngularVelocity",
          "searchTicksBeforeSwitch",
          "criticalStopDistanceM",
          "maxVelocityFraction",
        ];
        const blankStrings = stringKeysNeedingValue.filter(
          (k) => typeof fm[k] === "string" && (fm[k] as string).trim() === "",
        );
        const zeroNumbers = numericKeysExpectedPositive.filter(
          (k) => typeof fm[k] === "number" && (fm[k] as number) === 0,
        );
        const phantom = [...blankStrings, ...zeroNumbers];
        if (phantom.length > 0) {
          checks.push({
            id: "skills-followme-blanks",
            label: `follow_me config has ${phantom.length} blank/zero field(s)`,
            severity: "yellow",
            detail: `Empty: ${phantom.slice(0, 6).join(", ")}${phantom.length > 6 ? ", …" : ""} - modern skill versions default these, but older builds may not.`,
            hint:
              "Open the OpenClaw config UI and clear (or fix) the fields - or upgrade agenticros-skill-followme to a version where getFollowMeConfig() treats blanks as 'use default'.",
          });
        }
      }
    } catch {
      // Non-fatal; doctor's openclaw-config check covers parse errors.
    }
  }

  // OpenClaw gateway service.
  try {
    const { exitCode } = await execa(
      "systemctl",
      ["--user", "is-active", "openclaw-gateway.service"],
      { reject: false },
    );
    checks.push({
      id: "openclaw-gateway",
      label:
        exitCode === 0
          ? "OpenClaw gateway service active"
          : "OpenClaw gateway service not running",
      severity: exitCode === 0 ? "green" : "yellow",
      hint:
        exitCode === 0
          ? undefined
          : "Start with: systemctl --user start openclaw-gateway.service",
    });
  } catch {
    // systemctl missing - skip
  }

  // RealSense (informational).
  try {
    const { stdout, exitCode } = await execa("lsusb", { reject: false });
    if (exitCode === 0) {
      const hit = /Intel.*RealSense|8086:0b/i.test(stdout);
      checks.push({
        id: "realsense",
        label: hit ? "Intel RealSense detected" : "No Intel RealSense detected",
        severity: hit ? "green" : "yellow",
        hint: hit
          ? undefined
          : "Only required for `agenticros up real` with the default camera setup.",
      });
    }
  } catch {
    // lsusb missing - skip
  }

  const summary = checks.reduce(
    (acc, c) => {
      acc[c.severity] += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 } as DoctorReport["summary"],
  );

  return { checks, summary };
}

// Silence unused warnings for utilities the doctor module re-exports.
void ok;
void warn;
void err;
