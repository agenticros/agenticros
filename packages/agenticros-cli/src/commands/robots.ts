/**
 * `agenticros robots` — manage the multi-robot fleet config.
 *
 * Subactions:
 *   list / show / ls              Print configured robots + their online status (default).
 *   discover / scan               Live-discover robots on the wire, offer to add unknown ones.
 *   add [id]                      Add a robot to config.robots[] (interactive when id omitted).
 *                                 Flags: --name, --namespace, --camera, --default,
 *                                        --transport=<shorthand>, --transport-json=<json>.
 *   remove / rm <id>              Remove a robot from config.robots[].
 *   set-default <id>              Mark a robot as the active default.
 *   set-transport <id> [shorthand] Apply a per-robot transport override (or use
 *                                  --transport / --transport-json instead of [shorthand]).
 *   clear-transport <id>          Drop the per-robot transport override so the robot
 *                                  inherits the global transport config.
 *
 * All mutations target `~/.agenticros/config.json`. The legacy single-robot
 * `config.robot` is automatically promoted into `config.robots[]` on the first
 * multi-robot write — see `util/robot-config.ts` for the exact rules.
 *
 * Live discovery is delegated to the `ros2_discover_robots` MCP tool via a
 * subprocess to the agenticros-claude-code server. That keeps this CLI small
 * (no `@agenticros/core` import) AND ensures the user sees the same robots
 * the AI agent sees.
 */

import { checkbox, confirm, input, select } from "@inquirer/prompts";

import {
  addRobot,
  clearTransportForRobot,
  getActiveRobotId,
  readConfigObject,
  readRobots,
  removeRobot,
  robotConfigPath,
  setDefaultRobot,
  setTransportForRobot,
  writeConfigObject,
  type RobotEntry,
  type RobotSensors,
} from "../util/robot-config.js";
import {
  discoverViaMcp,
  type DetectedRobot,
  type DiscoveryResult,
} from "../util/mcp-discovery.js";
import { colors, dim, err, header, info, isTty, ok, warn } from "../util/logger.js";
import {
  parseTransportJson,
  parseTransportShorthand,
} from "../util/transport-shorthand.js";

export interface RobotsOptions {
  action?: string;
  arg?: string;
  /** --name <name> (used by `add` to set the display name non-interactively) */
  name?: string;
  /** --namespace <ns> (used by `add` to set the ROS2 namespace non-interactively) */
  namespace?: string;
  /** --camera <topic> (used by `add` to set the default camera topic non-interactively) */
  camera?: string;
  /** --default (used by `add` to mark the new entry as default non-interactively) */
  default?: boolean;
  /** --kind <kind> (Phase 1.e — sets robot.kind, e.g. "amr" | "arm" | "drone") */
  kind?: string;
  /**
   * --sensors=<csv> (Phase 1.e — sensor tags). Parsed by
   * `parseSensorsCsv`: comma-separated entries, prefix with '!' to set
   * false. Recognized keys: has_realsense, has_lidar, has_arm.
   */
  sensors?: string;
  /**
   * --capabilities=<csv> (Phase 1.e — per-robot capability allowlist).
   * Empty string ("") clears the field so the robot reverts to the
   * gateway-wide registry.
   */
  capabilities?: string;
  /** --transport=<shorthand> (used by `add` / `set-transport` to apply a per-robot override) */
  transport?: string;
  /** --transport-json=<raw json> (used by `add` / `set-transport` for non-shorthand overrides) */
  transportJson?: string;
}

/** Known sensor flags. We reject unknown keys with an actionable error. */
const KNOWN_SENSOR_KEYS = new Set<keyof RobotSensors>([
  "has_realsense",
  "has_lidar",
  "has_arm",
]);

/**
 * Parse a `--sensors=<csv>` value into a RobotSensors partial.
 *
 * Grammar: `key[,...]` where each entry is `keyname` (sets true) or
 * `!keyname` (sets false). Unknown keys throw with the accepted set so
 * the user can self-correct.
 *
 * Examples:
 *   "has_realsense"                  → { has_realsense: true }
 *   "has_realsense,has_lidar"        → { has_realsense: true, has_lidar: true }
 *   "has_realsense,!has_arm"         → { has_realsense: true, has_arm: false }
 *   ""                                → {}
 *
 * Returns `undefined` when the input is undefined (so callers can
 * distinguish "user didn't pass the flag" from "user passed empty").
 */
function parseSensorsCsv(raw: string | undefined): RobotSensors | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const out: RobotSensors = {};
  for (const part of trimmed.split(",")) {
    const entry = part.trim();
    if (!entry) continue;
    let value = true;
    let key = entry;
    if (entry.startsWith("!")) {
      value = false;
      key = entry.slice(1).trim();
    }
    if (!KNOWN_SENSOR_KEYS.has(key as keyof RobotSensors)) {
      throw new Error(
        `Unknown sensor tag "${key}". Accepted: ${[...KNOWN_SENSOR_KEYS].join(", ")}. ` +
          'Prefix with "!" to set false (e.g. --sensors=has_realsense,!has_arm).',
      );
    }
    (out as Record<string, boolean>)[key] = value;
  }
  return out;
}

/**
 * Parse a `--capabilities=<csv>` value. Empty string returns an empty
 * array (which the caller interprets as "clear the field"); undefined
 * returns undefined (meaning the flag wasn't supplied).
 */
function parseCapabilitiesCsv(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function robotsCommand(opts: RobotsOptions): Promise<void> {
  const action = (opts.action ?? "list").toLowerCase();
  switch (action) {
    case "list":
    case "ls":
    case "show":
      return listAction();
    case "discover":
    case "scan":
      return discoverAction();
    case "add":
      return addAction(opts);
    case "remove":
    case "rm":
    case "delete":
      return removeAction(opts.arg);
    case "set-default":
    case "default":
      return setDefaultAction(opts.arg);
    case "set-transport":
    case "transport":
      return setTransportAction(opts);
    case "clear-transport":
      return clearTransportAction(opts.arg);
    default:
      err(`Unknown robots action '${opts.action}'.`);
      err(
        "Use: list | discover | add [id] | remove <id> | set-default <id> | set-transport <id> [shorthand] | clear-transport <id>",
      );
      process.exit(2);
  }
}

/**
 * Parse `--transport` / `--transport-json` (mutually exclusive) into the
 * JSON-shape stored under `config.robots[i].transport`. Returns
 * `undefined` when neither flag is set. Exits the process on parse
 * errors with an actionable message — we deliberately don't propagate
 * the throw because option-parse errors should be terminal.
 */
function parseOverrideFromOptions(opts: RobotsOptions): Record<string, unknown> | undefined {
  if (opts.transport && opts.transportJson) {
    err("Pass either --transport=<shorthand> OR --transport-json=<json>, not both.");
    process.exit(2);
  }
  try {
    if (opts.transport) {
      return parseTransportShorthand(opts.transport) as Record<string, unknown>;
    }
    if (opts.transportJson) {
      return parseTransportJson(opts.transportJson);
    }
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(2);
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// list
// ─────────────────────────────────────────────────────────────────────────────

async function listAction(): Promise<void> {
  header("AgenticROS robots");
  info(`Config: ${robotConfigPath()}`);

  const obj = readConfigObject();
  const { robots, from } = readRobots(obj);
  const activeId = getActiveRobotId(obj);

  if (robots.length === 0) {
    dim("No robots configured yet. Run `agenticros robots discover` to find robots on the wire.");
    return;
  }

  // Best-effort discovery so we can mark each entry online/offline.
  // It's fine if this fails — the list still renders without the badge.
  let discovery: DiscoveryResult | undefined;
  try {
    discovery = await discoverViaMcp();
  } catch {
    /* render list-only — badge falls back to "?" */
  }

  process.stdout.write(`\n${colors.bold("Configured robots:")} ${dimSource(from)}\n`);
  for (const r of robots) {
    const isActive = r.id === activeId;
    const badge = renderOnlineBadge(r, discovery);
    const star = isActive ? colors.bold(colors.green(" (active)")) : "";
    process.stdout.write(
      `  ${badge} ${colors.bold(r.id)}${star}  ${colors.dim(r.name ?? "Robot")}\n`,
    );
    process.stdout.write(
      `      namespace: ${colors.dim(r.namespace || "(empty)")}  ` +
        `camera: ${colors.dim(r.cameraTopic || "(default)")}\n`,
    );
    // Phase 1.e: show kind + sensors so a user can confirm at a glance
    // that the fleet metadata behind ros2_find_robots_for is correct.
    // Suppress the row when kind is "amr" AND sensors are unset — that's
    // the implicit default and doesn't need to add visual noise.
    const showKind = r.kind && r.kind !== "amr";
    const sensorsSummary = r.sensors ? describeSensors(r.sensors) : "";
    if (showKind || sensorsSummary) {
      const kindPart = showKind ? `kind: ${colors.cyan(r.kind!)}` : "";
      const sensorsPart = sensorsSummary
        ? `sensors: ${colors.cyan(sensorsSummary)}`
        : "";
      process.stdout.write(
        `      ${[kindPart, sensorsPart].filter((s) => s).join("  ")}\n`,
      );
    }
    if (r.capabilities && r.capabilities.length > 0) {
      process.stdout.write(
        `      capabilities: ${colors.cyan(r.capabilities.join(", "))}\n`,
      );
    }
    if (r.transport) {
      process.stdout.write(
        `      transport: ${colors.cyan(describeOverride(r.transport))}\n`,
      );
    }
  }

  if (discovery && discovery.unknown_detected.length > 0) {
    process.stdout.write(
      `\n${colors.bold(colors.yellow("Detected on the wire but NOT in config:"))}\n`,
    );
    for (const d of discovery.unknown_detected) {
      process.stdout.write(
        `  ${colors.yellow("○")} ${colors.bold(d.id)}  ${colors.dim(d.cmdVelTopic)}  ${colors.dim(`(${d.topicCount} topic(s))`)}\n`,
      );
    }
    dim(`Promote any of them with 'agenticros robots add <id>' or 'agenticros robots discover'.`);
  }

  process.stdout.write("\n");
}

function dimSource(from: "explicit" | "legacy" | "none"): string {
  if (from === "explicit") return colors.dim("(explicit robots[] in config)");
  if (from === "legacy") return colors.dim("(synthesised from legacy config.robot — promoted on next add)");
  return colors.dim("(none)");
}

function renderOnlineBadge(r: RobotEntry, discovery: DiscoveryResult | undefined): string {
  if (!discovery) return colors.dim("●");
  const onlineIds = new Set(discovery.configured_online.map((x) => x.id));
  if (onlineIds.has(r.id)) return colors.green("●");
  return colors.dim("○");
}

// ─────────────────────────────────────────────────────────────────────────────
// discover
// ─────────────────────────────────────────────────────────────────────────────

async function discoverAction(): Promise<void> {
  header("Discover AgenticROS robots");
  info("Scanning the live ROS2 topic graph via the MCP server …");
  let discovery: DiscoveryResult;
  try {
    discovery = await discoverViaMcp();
  } catch (e) {
    err(`Discovery failed: ${e instanceof Error ? e.message : String(e)}`);
    err(
      "Check that the ROS transport is reachable (zenohd / rosbridge / etc) and that " +
        "`packages/agenticros-claude-code/dist/index.js` is built. See `agenticros doctor`.",
    );
    process.exit(1);
  }

  info(`Scanned ${discovery.total_topics} topic(s).`);
  process.stdout.write(`\n${colors.bold("On the wire right now:")}\n`);
  if (discovery.detected.length === 0) {
    dim("  No /<ns>/cmd_vel topics detected. Is the robot's bridge/router up?");
  } else {
    for (const d of discovery.detected) {
      const tag =
        d.configuredRobotId !== null
          ? colors.green(`● configured as ${d.configuredRobotId}`)
          : colors.yellow("○ unknown (not in config)");
      process.stdout.write(
        `  ${tag}  ${colors.bold(d.id)}  ${colors.dim(d.cmdVelTopic)}  ${colors.dim(`(${d.topicCount} topic(s))`)}\n`,
      );
    }
  }

  if (discovery.configured_offline.length > 0) {
    process.stdout.write(`\n${colors.bold(colors.yellow("Configured but silent:"))}\n`);
    for (const r of discovery.configured_offline) {
      process.stdout.write(`  ${colors.yellow("○")} ${colors.bold(r.id)}\n`);
    }
  }

  if (discovery.unknown_detected.length === 0) {
    process.stdout.write("\n");
    ok("No new robots to add — every detected namespace is already in config.");
    return;
  }

  if (!isTty) {
    process.stdout.write("\n");
    info(`Found ${discovery.unknown_detected.length} unknown robot(s).`);
    info("Run interactively to register them, or use `agenticros robots add <id>`.");
    return;
  }

  process.stdout.write("\n");
  const picks = await checkbox<string>({
    message: `Add ${discovery.unknown_detected.length} new robot(s) to config?`,
    choices: discovery.unknown_detected.map((d) => ({
      name: `${d.id}  (${d.topicCount} topic(s), cmd_vel: ${d.cmdVelTopic})`,
      value: d.id,
      checked: true,
    })),
  });

  if (picks.length === 0) {
    info("Nothing selected. Run `agenticros robots add <id>` later to add one by id.");
    return;
  }

  const obj = readConfigObject();
  let writes = 0;
  for (const id of picks) {
    const detected = discovery.unknown_detected.find((d) => d.id === id)!;
    const result = addRobot(
      {
        id: detected.id,
        name: detected.id,
        namespace: detected.id,
        cameraTopic: "",
      },
      { obj },
    );
    if (result.added) writes += 1;
    if (result.promotedLegacy && writes === 1) {
      info(
        `Promoted legacy config.robot into config.robots[0] (kept as default). The new entries are appended.`,
      );
    }
  }
  if (writes > 0) {
    writeConfigObject(obj);
    ok(`Added ${writes} robot(s) to ${robotConfigPath()}.`);
    warn(
      "Restart any running MCP servers (Claude Code, Claude desktop, OpenClaw) so they re-read the config.",
    );
  } else {
    info("Nothing new to write (all picks were already in config).");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// add
// ─────────────────────────────────────────────────────────────────────────────

async function addAction(opts: RobotsOptions): Promise<void> {
  let id = opts.arg?.trim();

  // Resolve --transport / --transport-json up-front so we fail fast on
  // a malformed value before we touch the live MCP server or prompt
  // the user. parseOverrideFromOptions exits the process on parse
  // failures, so undefined here means "no override flag was passed".
  const overrideFromFlag = parseOverrideFromOptions(opts);

  // Phase 1.e — parse --sensors and --capabilities up-front (same
  // fail-fast story as transport). Both are best-effort: we accept
  // unknown sensor keys with a friendly error rather than crashing the
  // process via Zod, since the user is more likely to typo here than
  // in the transport shorthand.
  let sensorsFromFlag: RobotSensors | undefined;
  try {
    sensorsFromFlag = parseSensorsCsv(opts.sensors);
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(2);
  }
  const capabilitiesFromFlag = parseCapabilitiesCsv(opts.capabilities);

  // True when the user gave us any --flag, meaning "do not prompt".
  // We treat non-interactive mode as the *implicit* default once any
  // flag is set — running `robots add alpha --transport=zenoh` should
  // not interrupt the user with extra prompts for name/namespace.
  const usingFlags =
    overrideFromFlag !== undefined ||
    opts.name !== undefined ||
    opts.namespace !== undefined ||
    opts.camera !== undefined ||
    opts.default === true ||
    opts.kind !== undefined ||
    sensorsFromFlag !== undefined ||
    capabilitiesFromFlag !== undefined;

  // Try to fetch live discovery once so the prompts can pre-fill defaults
  // and so an interactive `add` (no id) lets the user pick from the wire.
  // Skipped in flag-driven runs (we have everything we need from argv).
  let discovery: DiscoveryResult | undefined;
  if (!usingFlags) {
    try {
      discovery = await discoverViaMcp();
    } catch {
      /* offline-add is supported — just no auto-fill */
    }
  }

  if (!id) {
    if (!isTty) {
      err("Usage: agenticros robots add <id> [--name=...] [--namespace=...] [--transport=<shorthand>]");
      process.exit(2);
    }
    id = await pickIdInteractively(discovery);
    if (!id) {
      info("Cancelled.");
      return;
    }
  }

  // Look up any existing entry so flag-driven updates can merge with
  // prior values instead of clobbering them. (addRobot itself doesn't
  // merge name/namespace/cameraTopic — see util/robot-config.ts.)
  const obj = readConfigObject();
  const existing = readRobots(obj).robots.find((r) => r.id === id);

  // Default fallbacks. Precedence: explicit --flag > prior persisted value > discovery hint > id.
  const detected = discovery?.unknown_detected.find((d) => d.id === id);

  let name = opts.name ?? existing?.name ?? id;
  let namespace = opts.namespace ?? existing?.namespace ?? detected?.id ?? id;
  let cameraTopic = opts.camera ?? existing?.cameraTopic ?? "";

  // Interactive prompts only when the user didn't pass any flags AND
  // we have a TTY. This preserves the original wizard UX while still
  // allowing one-shot CLI usage.
  if (isTty && !usingFlags) {
    name = (
      await input({
        message: "Display name:",
        default: name,
        validate: (v) => v.trim().length > 0 || "Required",
      })
    ).trim();
    namespace = (await input({ message: "ROS2 namespace:", default: namespace })).trim();
    cameraTopic = (
      await input({
        message: "Default camera topic (optional, blank ⇒ /<namespace>/camera/...):",
        default: cameraTopic,
      })
    ).trim();
  }

  // Mark default? --default flag forces it; otherwise prompt in TTY-and-no-flags mode.
  let setDefault = opts.default === true;
  if (!setDefault && isTty && !usingFlags) {
    const { robots } = readRobots(obj);
    if (robots.length >= 1 && robots[0].id !== id) {
      setDefault = await confirm({
        message: `Make "${id}" the default robot?`,
        default: false,
      });
    }
  }

  // Phase 1.e merges: when --sensors=key1,key2 was passed, merge the
  // delta over the existing sensors block so the user can flip ONE
  // flag without re-declaring the rest. (Vs --transport which is a
  // whole-object replacement — the contracts are different because
  // sensors are a small named set.)
  let mergedSensors: RobotSensors | undefined;
  if (sensorsFromFlag !== undefined) {
    mergedSensors = { ...(existing?.sensors ?? {}), ...sensorsFromFlag };
  }

  // Capability allowlist: treat the flag as a full replacement (empty
  // string already became []). Same semantics as --transport.
  const capabilitiesToApply = capabilitiesFromFlag;

  const result = addRobot(
    {
      id,
      name,
      namespace,
      cameraTopic,
      transport: overrideFromFlag,
      kind: opts.kind,
      sensors: mergedSensors,
      capabilities: capabilitiesToApply,
    },
    { obj, setDefault },
  );
  writeConfigObject(obj);

  if (result.promotedLegacy) {
    info("Promoted legacy config.robot into config.robots[0] (kept as default).");
  }
  if (result.added) {
    ok(`Added robot "${id}" to ${robotConfigPath()}.`);
  } else {
    ok(`Updated existing robot "${id}" in ${robotConfigPath()}.`);
  }
  if (overrideFromFlag) {
    ok(`Per-robot transport override applied: ${describeOverride(overrideFromFlag)}.`);
  }
  if (opts.kind) ok(`Robot kind set to "${opts.kind}".`);
  if (mergedSensors) {
    const formatted = describeSensors(mergedSensors);
    if (formatted) ok(`Sensors: ${formatted}.`);
  }
  if (capabilitiesToApply !== undefined) {
    if (capabilitiesToApply.length === 0) {
      ok("Per-robot capability allowlist cleared (robot now inherits the gateway-wide registry).");
    } else {
      ok(`Per-robot capability allowlist: ${capabilitiesToApply.join(", ")}.`);
    }
  }
  if (setDefault) ok(`"${id}" is now the default robot.`);
  warn("Restart any running MCP servers so they re-read the config.");
}

/**
 * Render a sensors object as a stable, comma-separated human summary
 * for log messages. Omits keys that are unset (undefined) so we don't
 * lie about defaults.
 */
function describeSensors(s: RobotSensors): string {
  const parts: string[] = [];
  for (const k of ["has_realsense", "has_lidar", "has_arm"] as const) {
    const v = s[k];
    if (v === undefined) continue;
    parts.push(v ? k : `!${k}`);
  }
  return parts.join(", ");
}

/**
 * Render a one-line human summary of a transport override for log
 * messages. Deliberately tolerant — the JSON has already passed our
 * shorthand parser (or made it through `--transport-json`), and the
 * core Zod schema will field-validate at load time. We only need this
 * good enough to confirm to the user "yes, we wrote that thing you
 * just typed".
 */
function describeOverride(override: Record<string, unknown>): string {
  const mode = String(override["mode"] ?? "?");
  switch (mode) {
    case "zenoh": {
      const ep =
        override["zenoh"] && typeof override["zenoh"] === "object"
          ? (override["zenoh"] as Record<string, unknown>)["routerEndpoint"]
          : undefined;
      return ep ? `zenoh @ ${String(ep)}` : "zenoh (inherits global router endpoint)";
    }
    case "rosbridge": {
      const url =
        override["rosbridge"] && typeof override["rosbridge"] === "object"
          ? (override["rosbridge"] as Record<string, unknown>)["url"]
          : undefined;
      return url ? `rosbridge @ ${String(url)}` : "rosbridge (inherits global url)";
    }
    case "local": {
      const dom =
        override["local"] && typeof override["local"] === "object"
          ? (override["local"] as Record<string, unknown>)["domainId"]
          : undefined;
      return dom !== undefined
        ? `local DDS (domainId=${String(dom)})`
        : "local DDS (inherits global domainId)";
    }
    case "webrtc": {
      const sig =
        override["webrtc"] && typeof override["webrtc"] === "object"
          ? (override["webrtc"] as Record<string, unknown>)["signalingUrl"]
          : undefined;
      return sig ? `webrtc @ ${String(sig)}` : "webrtc (inherits global signaling url)";
    }
    default:
      return `mode=${mode}`;
  }
}

async function pickIdInteractively(discovery: DiscoveryResult | undefined): Promise<string | undefined> {
  const unknown: DetectedRobot[] = discovery?.unknown_detected ?? [];
  if (unknown.length === 0) {
    return (
      await input({
        message: "Robot id (free-form, e.g. robot-alpha):",
        validate: (v) => v.trim().length > 0 || "Required",
      })
    ).trim();
  }
  const choice = await select<string>({
    message: "Pick a robot to add:",
    choices: [
      ...unknown.map((d) => ({
        name: `${d.id}  (cmd_vel: ${d.cmdVelTopic}, ${d.topicCount} topic(s))`,
        value: d.id,
      })),
      { name: "Enter id manually…", value: "__manual__" },
      { name: "Cancel", value: "__cancel__" },
    ],
  });
  if (choice === "__cancel__") return undefined;
  if (choice === "__manual__") {
    return (
      await input({
        message: "Robot id:",
        validate: (v) => v.trim().length > 0 || "Required",
      })
    ).trim();
  }
  return choice;
}

// ─────────────────────────────────────────────────────────────────────────────
// remove
// ─────────────────────────────────────────────────────────────────────────────

async function removeAction(arg: string | undefined): Promise<void> {
  const id = arg?.trim();
  if (!id) {
    err("Usage: agenticros robots remove <id>");
    process.exit(2);
  }
  const obj = readConfigObject();
  const result = removeRobot(id, obj);
  if (!result.removed) {
    warn(`No robot with id "${id}" found in ${robotConfigPath()}.`);
    return;
  }
  writeConfigObject(obj);
  ok(`Removed robot "${id}".`);
  if (result.robots.length === 0) {
    info(
      "robots[] is now empty — the gateway will fall back to legacy config.robot (if set). " +
        "Run `agenticros robots discover` to re-populate.",
    );
  }
  warn("Restart any running MCP servers so they re-read the config.");
}

// ─────────────────────────────────────────────────────────────────────────────
// set-default
// ─────────────────────────────────────────────────────────────────────────────

async function setDefaultAction(arg: string | undefined): Promise<void> {
  const id = arg?.trim();
  if (!id) {
    err("Usage: agenticros robots set-default <id>");
    process.exit(2);
  }
  const obj = readConfigObject();
  try {
    const { promotedLegacy } = setDefaultRobot(id, obj);
    writeConfigObject(obj);
    if (promotedLegacy) {
      info("Promoted legacy config.robot into config.robots[0] first.");
    }
    ok(`"${id}" is now the default robot.`);
    warn("Restart any running MCP servers so they re-read the config.");
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// set-transport / clear-transport
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `agenticros robots set-transport <id> [shorthand]`
 *
 * Two ways to supply the override:
 *   - Positional `[shorthand]` (parsed via parseTransportShorthand).
 *   - `--transport=<shorthand>` / `--transport-json=<json>` flags.
 * They're mutually exclusive — picking one is enough.
 *
 * Why a dedicated subcommand when `add` already takes the same flags?
 * Two reasons. First, it surfaces the transport-override knob in
 * --help so users discover the feature without reading code. Second,
 * it makes the intent unambiguous in scripts: `add` can't tell whether
 * a new entry is wanted or an update; `set-transport` is always-update
 * and throws if the id is unknown (no silent typo-promotion).
 */
async function setTransportAction(opts: RobotsOptions): Promise<void> {
  const id = opts.arg?.trim();
  if (!id) {
    err(
      "Usage: agenticros robots set-transport <id> <shorthand>\n" +
        "   or: agenticros robots set-transport <id> --transport=<shorthand>\n" +
        "   or: agenticros robots set-transport <id> --transport-json=<json>",
    );
    process.exit(2);
  }

  // Resolve the override. Positional argument is a convenience for the
  // common case `set-transport alpha zenoh:ws://farm:10000`; flags are
  // preferred when scripting or when the user has TTY tab completion.
  // We don't accept "positional + flag" simultaneously — too ambiguous.
  // We *do* re-use parseOverrideFromOptions so flag-driven runs share
  // the same error path as `add`.
  let override: Record<string, unknown> | undefined;
  if (opts.transport || opts.transportJson) {
    override = parseOverrideFromOptions(opts);
  } else {
    err(
      "Missing override. Supply either:\n" +
        "  agenticros robots set-transport <id> --transport=<shorthand>\n" +
        "  agenticros robots set-transport <id> --transport-json=<json>",
    );
    process.exit(2);
  }
  if (!override) return;

  const obj = readConfigObject();
  try {
    const { promotedLegacy } = setTransportForRobot(id, override, obj);
    writeConfigObject(obj);
    if (promotedLegacy) info("Promoted legacy config.robot into config.robots[0] first.");
    ok(`Applied per-robot transport override to "${id}": ${describeOverride(override)}.`);
    warn("Restart any running MCP servers so they re-read the config.");
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

/**
 * `agenticros robots clear-transport <id>` — drop the per-robot
 * transport override, letting the robot inherit the global transport
 * settings again. Idempotent: prints a friendly "(nothing to clear)"
 * message when the robot didn't have an override to begin with.
 */
async function clearTransportAction(arg: string | undefined): Promise<void> {
  const id = arg?.trim();
  if (!id) {
    err("Usage: agenticros robots clear-transport <id>");
    process.exit(2);
  }
  const obj = readConfigObject();
  try {
    const { cleared, promotedLegacy } = clearTransportForRobot(id, obj);
    writeConfigObject(obj);
    if (promotedLegacy) info("Promoted legacy config.robot into config.robots[0] first.");
    if (cleared) {
      ok(`Cleared per-robot transport override on "${id}".`);
      warn("Restart any running MCP servers so they re-read the config.");
    } else {
      info(`"${id}" had no transport override (nothing to clear).`);
    }
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
