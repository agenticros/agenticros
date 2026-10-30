/**
 * Parse a `--transport=<shorthand>` flag into the JSON-shaped object the
 * core resolver expects under `config.robots[i].transport`.
 *
 * Shorthand grammar (most-common-case-first):
 *
 *     <mode>[:<primary-value>]
 *
 *   - `zenoh`                              ⇒ inherit everything from global config.zenoh
 *   - `zenoh:<routerEndpoint>`             ⇒ override the router endpoint only
 *   - `rosbridge`                          ⇒ inherit global rosbridge config
 *   - `rosbridge:<url>`                    ⇒ override rosbridge url
 *   - `local`                              ⇒ inherit global local config
 *   - `local:<domainId>`                   ⇒ override DDS domain id (integer ≥ 0)
 *   - `webrtc`                             ⇒ inherit global webrtc config
 *   - `webrtc:<signalingUrl>`              ⇒ override signaling url
 *
 * Anything more elaborate (multiple sub-fields, custom iceServers, etc.)
 * should use `--transport-json=...` which is passed straight through to
 * the core Zod schema. The CLI deliberately doesn't model the full set
 * of sub-fields — that would couple this layer to every transport
 * adapter's settings shape. The shorthand exists for the 95% of users
 * who only want to point one robot at a different router.
 *
 * Errors are intentionally specific — they tell the user the exact
 * accepted forms so they can recover without hunting through docs.
 */

export type TransportOverrideJson =
  | { mode: "zenoh"; zenoh?: { routerEndpoint?: string } }
  | { mode: "rosbridge"; rosbridge?: { url?: string } }
  | { mode: "local"; local?: { domainId?: number } }
  | { mode: "webrtc"; webrtc?: { signalingUrl?: string } };

const VALID_MODES = ["zenoh", "rosbridge", "local", "webrtc"] as const;
type ValidMode = (typeof VALID_MODES)[number];

function isValidMode(s: string): s is ValidMode {
  return (VALID_MODES as readonly string[]).includes(s);
}

/**
 * Parse a `--transport=<shorthand>` value. Throws with an actionable
 * message on malformed input. The returned object is a plain JSON
 * structure that the core `RobotTransportOverrideSchema` will then
 * validate at config-load time, so this parser doesn't have to repeat
 * field-level validation — it only needs to produce well-shaped JSON.
 */
export function parseTransportShorthand(raw: string): TransportOverrideJson {
  const input = raw.trim();
  if (!input) {
    throw new Error(
      "--transport requires a value. Examples: --transport=zenoh, --transport=zenoh:ws://farm:10000, --transport=local:1",
    );
  }
  const colon = input.indexOf(":");
  const modeRaw = (colon < 0 ? input : input.slice(0, colon)).trim().toLowerCase();
  const valueRaw = colon < 0 ? "" : input.slice(colon + 1).trim();

  if (!isValidMode(modeRaw)) {
    throw new Error(
      `Unknown transport mode "${modeRaw}". Accepted: ${VALID_MODES.join(", ")}. ` +
        "Example: --transport=zenoh:ws://farm:10000",
    );
  }

  switch (modeRaw) {
    case "zenoh":
      return valueRaw
        ? { mode: "zenoh", zenoh: { routerEndpoint: valueRaw } }
        : { mode: "zenoh" };
    case "rosbridge":
      return valueRaw
        ? { mode: "rosbridge", rosbridge: { url: valueRaw } }
        : { mode: "rosbridge" };
    case "local": {
      if (!valueRaw) return { mode: "local" };
      const n = Number(valueRaw);
      if (!Number.isInteger(n) || n < 0) {
        throw new Error(
          `--transport=local:<domainId> requires a non-negative integer (got "${valueRaw}"). ` +
            "Example: --transport=local:1",
        );
      }
      return { mode: "local", local: { domainId: n } };
    }
    case "webrtc":
      return valueRaw
        ? { mode: "webrtc", webrtc: { signalingUrl: valueRaw } }
        : { mode: "webrtc" };
  }
}

/**
 * Validate a raw JSON string passed via `--transport-json`. Returns the
 * parsed object on success; throws a friendly error on parse failure or
 * when the JSON doesn't look at all like a transport override (missing
 * `mode`). Field-level validation is deferred to the core Zod schema at
 * config-load time — this is just a smoke check so an obviously-wrong
 * JSON string doesn't slip into the file.
 */
export function parseTransportJson(raw: string): Record<string, unknown> {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `--transport-json: invalid JSON (${e instanceof Error ? e.message : String(e)}). ` +
        'Example: --transport-json=\'{"mode":"zenoh","zenoh":{"routerEndpoint":"ws://farm:10000"}}\'',
    );
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error("--transport-json: must be a JSON object, e.g. {\"mode\":\"zenoh\"}");
  }
  const mode = (obj as Record<string, unknown>)["mode"];
  if (typeof mode !== "string" || !isValidMode(mode)) {
    throw new Error(
      `--transport-json: missing or invalid "mode" (expected one of ${VALID_MODES.join(", ")}).`,
    );
  }
  return obj as Record<string, unknown>;
}
