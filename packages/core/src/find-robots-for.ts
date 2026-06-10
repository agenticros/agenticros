/**
 * `findRobotsFor` — Phase 1.e capability-aware robot filter.
 *
 * Given a (capability?, kind?, online?) query, returns the configured
 * robots that match, ranked best-first. This is the resolver behind the
 * `ros2_find_robots_for` MCP tool — adapters call it from `tools.ts`
 * with the live online-set computed from a topic scan (or `undefined`
 * when `online` isn't being filtered, so we don't pay for the scan).
 *
 * Filter semantics:
 *  - `capability` — keep robots whose per-robot allowlist
 *    (`config.robots[i].capabilities`) includes the verb, OR (when no
 *    allowlist is set) whose gateway's global capability registry
 *    includes it. The global path is the common case — every robot
 *    today exposes the same builtin + skill-declared capabilities. The
 *    per-robot allowlist exists for heterogeneous fleets where (e.g.)
 *    only one robot has the `arm_skill` loaded.
 *  - `kind` — exact match on `robot.kind` (case-insensitive). Use
 *    "amr" / "arm" / "drone" / "rover" by convention but any string is
 *    accepted by the schema.
 *  - `online` — `true` keeps only robots whose id is in `onlineIds`;
 *    `false` keeps only robots NOT in `onlineIds`; `undefined` skips
 *    this filter entirely. The adapter is responsible for populating
 *    `onlineIds` from the live topic graph (typically via
 *    `discoverRobots()`) before calling this — core doesn't touch the
 *    transport.
 *
 * Ranking (highest score first):
 *   +2  online (when query.online is true)
 *   +1  per-robot capabilities allowlist included the requested verb
 *       (an explicit "I support this" beats a global-registry inference)
 *   +0  default tier
 *
 * Ties broken by config declaration order (stable).
 *
 * Why not a full LLM-style scoring function? Phase 1.e's goal is
 * deterministic and explainable — an agent calling `find_robots_for`
 * wants a list it can plan against, not a relevance heuristic. The
 * +1/+2 deltas are enough to surface a perfect match above an
 * inherited one without inventing fuzzy matching.
 */

import type { AgenticROSConfig } from "./config.js";
import { listAllCapabilities, type Capability } from "./capabilities.js";
import { listRobots, type ResolvedRobot } from "./robots.js";

/** Query input to `findRobotsFor`. All fields optional → returns every robot. */
export interface FindRobotsForQuery {
  /** Capability id (e.g. `follow_person`, `find_object`). Case-sensitive — match the registry. */
  capability?: string;
  /** Robot kind (e.g. `amr`, `arm`, `drone`). Case-insensitive. */
  kind?: string;
  /** When set, restrict to online (true) or offline (false) robots. */
  online?: boolean;
}

/** One entry in the find-robots-for result. */
export interface FindRobotsForMatch {
  robot: ResolvedRobot;
  /** True when the capability filter was satisfied by an explicit per-robot allowlist. */
  matched_capability_explicitly: boolean;
  /**
   * True when this robot is in the caller-supplied online set, false when
   * not, and `null` when the caller didn't provide an online set at all
   * (so we can't say either way).
   */
  online: boolean | null;
  /** Sort key — higher = better match. See module header for the formula. */
  score: number;
}

/** Result envelope. */
export interface FindRobotsForResult {
  query: FindRobotsForQuery;
  total: number;
  /** Best-matching robots first. */
  robots: FindRobotsForMatch[];
}

/**
 * Run the filter+rank against the configured fleet.
 *
 * `onlineIds` is optional. When omitted AND `query.online` is set, this
 * throws — the adapter MUST resolve the live set before calling this so
 * the core stays transport-agnostic.
 *
 * The match list is stable across calls with the same input (no
 * non-determinism, no time-of-day effects).
 */
export function findRobotsFor(
  config: AgenticROSConfig,
  query: FindRobotsForQuery,
  onlineIds?: ReadonlySet<string>,
): FindRobotsForResult {
  if (query.online !== undefined && onlineIds === undefined) {
    throw new Error(
      "findRobotsFor: query.online was set but onlineIds was not provided. " +
        "Call discoverRobots() first and pass configured_online ids.",
    );
  }

  // Resolve the global capability registry once — used as the fallback
  // when a robot doesn't declare its own per-robot allowlist.
  const globalCapIds: ReadonlySet<string> = new Set(
    listAllCapabilities(config).map((c: Capability) => c.id),
  );

  const wantedKind = query.kind?.trim().toLowerCase();
  const wantedCap = query.capability?.trim();

  const fleet = listRobots(config);
  const matches: FindRobotsForMatch[] = [];

  for (const robot of fleet) {
    // kind filter
    if (wantedKind && robot.kind.toLowerCase() !== wantedKind) continue;

    // capability filter
    let matchedExplicitly = false;
    if (wantedCap) {
      const allowlist = robot.capabilities;
      if (allowlist) {
        if (!allowlist.includes(wantedCap)) continue;
        matchedExplicitly = true;
      } else {
        // No per-robot allowlist → fall back to the gateway-wide
        // registry. This is the common case today.
        if (!globalCapIds.has(wantedCap)) continue;
      }
    }

    // online filter
    let isOnline: boolean | null = null;
    if (onlineIds) {
      isOnline = onlineIds.has(robot.id);
      if (query.online === true && !isOnline) continue;
      if (query.online === false && isOnline) continue;
    }

    let score = 0;
    if (matchedExplicitly) score += 1;
    if (query.online === true && isOnline) score += 2;
    // Reward online robots even when the user didn't filter for it —
    // an agent picking a robot for an action almost always wants the
    // one currently reachable.
    if (query.online === undefined && isOnline === true) score += 1;

    matches.push({ robot, matched_capability_explicitly: matchedExplicitly, online: isOnline, score });
  }

  // Stable sort: higher score first, tie-broken by original config
  // order (which is what listRobots() returned).
  matches.sort((a, b) => b.score - a.score);

  return {
    query: {
      ...(wantedCap ? { capability: wantedCap } : {}),
      ...(wantedKind ? { kind: wantedKind } : {}),
      ...(query.online !== undefined ? { online: query.online } : {}),
    },
    total: matches.length,
    robots: matches,
  };
}
