import type { OpenClawPluginApi, HttpRouteHandler, HttpRouteResponse } from "./plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { parseConfig, prepareConfigForPersistence } from "@agenticros/core";
import {
  readOpenClawConfig,
  writeAgenticROSConfig,
  getOpenClawConfigPath,
  ConfigFileError,
  readAgenticROSConfigFromFile,
} from "./config-file.js";
import { getLandingPageHtml } from "./landing-page.js";
import { getConfigPageHtml, getConfigPageScript } from "./config-page.js";
import { registerTeleopRoutes } from "./teleop/routes.js";
import { registerCameraSnapshotRoutes } from "./camera-snapshot-routes.js";
import { getMemory, getMemoryInitError } from "./memory.js";
import { resolveMemoryNamespace } from "@agenticros/core";

async function readJsonBodyFromReq(req: { readJsonBody?: () => Promise<Record<string, unknown> | null>; body?: unknown; on?: (e: string, cb: (c?: Buffer) => void) => void }): Promise<Record<string, unknown>> {
  if (typeof req.readJsonBody === "function") {
    const out = await req.readJsonBody();
    if (out && typeof out === "object") return out;
  }
  const raw = req.body;
  if (typeof raw === "object" && raw !== null) return raw as Record<string, unknown>;
  if (raw && typeof (raw as Promise<unknown>).then === "function") {
    const parsed = await (raw as Promise<Record<string, unknown>>);
    if (parsed && typeof parsed === "object") return parsed;
  }
  if (typeof req.on === "function") {
    const chunks: Buffer[] = [];
    const body = await new Promise<string>((resolve, reject) => {
      (req as NodeJS.ReadableStream).on("data", (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      (req as NodeJS.ReadableStream).on("end", () =>
        resolve(Buffer.concat(chunks).toString("utf8")),
      );
      (req as NodeJS.ReadableStream).on("error", reject);
    });
    if (body.trim()) {
      try {
        return JSON.parse(body) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
  }
  return {};
}

/**
 * Returns a JSON-serializable copy of config with sensitive fields redacted.
 */
function configForApi(config: AgenticROSConfig): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  const webrtc = out.webrtc as Record<string, unknown> | undefined;
  if (webrtc && typeof webrtc.robotKey === "string" && webrtc.robotKey.length > 0) {
    webrtc.robotKey = "(set)";
  }
  return out;
}

/**
 * Merge an incoming save payload with the existing on-disk config so partial forms do not erase
 * nested keys (e.g. skills.followme vs other skill ids).
 */
function mergeIncomingAgenticROSConfig(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" ? (JSON.parse(JSON.stringify(existing)) as Record<string, unknown>) : {};
  for (const key of Object.keys(incoming)) {
    if (key === "skills") {
      const exSkills = (base.skills as Record<string, unknown>) ?? {};
      const inSkills = incoming.skills as Record<string, unknown> | undefined;
      if (!inSkills || typeof inSkills !== "object" || Array.isArray(inSkills)) continue;
      base.skills = { ...exSkills, ...inSkills };
      const exFm = (exSkills.followme as Record<string, unknown>) ?? {};
      const rawFm = inSkills.followme;
      if (rawFm !== undefined && typeof rawFm === "object" && rawFm !== null && !Array.isArray(rawFm)) {
        const inFm = rawFm as Record<string, unknown>;
        (base.skills as Record<string, unknown>).followme = { ...exFm, ...inFm };
      }
    } else {
      base[key] = incoming[key];
    }
  }
  return base;
}

/**
 * Register all AgenticROS HTTP routes: landing, config, config API, and teleop.
 * Only call when api.registerHttpRoute is available.
 */
export function registerRoutes(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  const register = api.registerHttpRoute;
  if (typeof register !== "function") {
    api.logger.info("AgenticROS HTTP: registerHttpRoute not available, skipping routes");
    return;
  }

  const makeLandingHandler = (basePath: string): HttpRouteHandler => (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.statusCode = 200;
    res.end(getLandingPageHtml(basePath));
  };
  const configPageHandler: HttpRouteHandler = (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.statusCode = 200;
    res.end(getConfigPageHtml());
  };
  const configScriptHandler: HttpRouteHandler = (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.statusCode = 200;
    res.end(getConfigPageScript());
  };
  const configJsonHandler: HttpRouteHandler = (_req, res) => {
    let payload: Record<string, unknown>;
    try {
      // Always reflect on-disk openclaw.json so the form matches manual edits / external saves without relying on a stale startup snapshot.
      payload = configForApi(readAgenticROSConfigFromFile());
    } catch (err) {
      api.logger.warn(
        "AgenticROS config.json: could not read OpenClaw config file, using startup snapshot: " +
          (err instanceof Error ? err.message : String(err)),
      );
      payload = configForApi(config);
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.statusCode = 200;
    res.end(JSON.stringify(payload));
  };

  // Register under /agenticros, /api/agenticros, and /plugins/agenticros. auth: "plugin" so 2026.3.11+ accepts; requireAuth: false for older gateways.
  const route = (opts: { path: string; method?: string; handler: HttpRouteHandler }) =>
    register({ ...opts, requireAuth: false, auth: "plugin" });
  for (const base of ["/agenticros", "/api/agenticros", "/plugins/agenticros"]) {
    route({ path: `${base}/`, method: "GET", handler: makeLandingHandler(base) });
    route({ path: `${base}/config`, method: "GET", handler: configPageHandler });
    route({ path: `${base}/config.js`, method: "GET", handler: configScriptHandler });
    route({ path: `${base}/config.json`, method: "GET", handler: configJsonHandler });
  }

  const sendJson = (res: HttpRouteResponse, status: number, data: { success: boolean; error?: string; message?: string; configPath?: string }) => {
    res.setHeader("Content-Type", "application/json");
    res.statusCode = status;
    res.end(JSON.stringify(data));
  };

  async function performConfigSave(body: Record<string, unknown>): Promise<{ success: boolean; error?: string; message?: string; configPath?: string; statusCode?: number }> {
    try {
      let merged: AgenticROSConfig;
      let existingAgenticROS: Record<string, unknown> | undefined;
      try {
        const full = readOpenClawConfig();
        const plugins = full.plugins as Record<string, unknown> | undefined;
        const entries = plugins?.entries as Record<string, unknown> | undefined;
        const agenticrosEntry = entries?.agenticros as Record<string, unknown> | undefined;
        existingAgenticROS = agenticrosEntry?.config as Record<string, unknown> | undefined;
      } catch (err) {
        if (err instanceof ConfigFileError && err.code === "ENOENT") {
          api.logger.warn("AgenticROS config file missing: " + err.message);
          return { success: false, error: err.message, statusCode: 503 };
        }
        if (err instanceof ConfigFileError && err.code === "EACCES") {
          api.logger.warn("AgenticROS config file access denied: " + err.message);
          return { success: false, error: err.message, statusCode: 500 };
        }
        const readMsg = err instanceof Error ? err.message : "Failed to read config file";
        api.logger.warn("AgenticROS config read failed: " + readMsg);
        return { success: false, error: readMsg, statusCode: 500 };
      }
      let combined: Record<string, unknown>;
      try {
        combined =
          existingAgenticROS && typeof existingAgenticROS === "object"
            ? mergeIncomingAgenticROSConfig(existingAgenticROS, body)
            : body;
        merged = parseConfig(combined);
      } catch (err) {
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as Error).message)
            : "Validation failed";
        api.logger.warn("AgenticROS config save validation failed: " + msg);
        return { success: false, error: msg };
      }
      const existingKey =
        (existingAgenticROS?.webrtc as Record<string, unknown> | undefined)?.robotKey;
      if (typeof existingKey === "string" && existingKey.length > 0) {
        merged.webrtc.robotKey = existingKey;
      }
      try {
        writeAgenticROSConfig(prepareConfigForPersistence(merged, combined));
      } catch (err) {
        const msg = err instanceof ConfigFileError ? err.message : (err instanceof Error ? err.message : "Failed to write config");
        api.logger.warn("AgenticROS config write failed: " + msg);
        return { success: false, error: msg };
      }
      const configPath = getOpenClawConfigPath();
      return {
        success: true,
        message: "Config saved. Restart the OpenClaw gateway for changes to take effect.",
        configPath,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      api.logger.warn("AgenticROS config save error: " + msg);
      return { success: false, error: msg };
    }
  }

  const configSaveHandler: HttpRouteHandler = async (req, res) => {
      try {
        let body: Record<string, unknown>;
        const method = (req as { method?: string }).method;
        if (method === "GET") {
          const url = (req as { url?: string }).url ?? "";
          const q = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
          const params = new URLSearchParams(q);
          const payloadEnc = params.get("payload");
          if (!payloadEnc) {
            sendJson(res, 400, { success: false, error: "Missing payload query parameter (base64url-encoded JSON)" });
            return;
          }
          try {
            const decoded = Buffer.from(payloadEnc.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
            body = JSON.parse(decoded) as Record<string, unknown>;
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Invalid payload";
            sendJson(res, 400, { success: false, error: msg });
            return;
          }
        } else {
          try {
            body = await readJsonBodyFromReq(req as Parameters<typeof readJsonBodyFromReq>[0]);
          } catch (e) {
            const bodyMsg = e instanceof Error ? e.message : "Invalid request body";
            api.logger.warn("AgenticROS config save invalid body: " + bodyMsg);
            sendJson(res, 400, { success: false, error: bodyMsg });
            return;
          }
        }
        const result = await performConfigSave(body);
        const status = result.success ? 200 : (result.statusCode ?? 400);
        sendJson(res, status, result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed";
        sendJson(res, 500, { success: false, error: msg });
      }
    };

  for (const base of ["/agenticros", "/api/agenticros", "/plugins/agenticros"]) {
    route({ path: `${base}/config/save`, method: "POST", handler: configSaveHandler });
    route({ path: `${base}/config/save`, method: "PUT", handler: configSaveHandler });
    route({ path: `${base}/config/save`, method: "GET", handler: configSaveHandler });
  }

  const memoryStatusHandler: HttpRouteHandler = async (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    const memory = getMemory();
    if (!memory) {
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          success: true,
          enabled: false,
          reason:
            getMemoryInitError() ??
            "Memory disabled. Set memory.enabled=true to use the four memory_* tools.",
        }),
      );
      return;
    }
    try {
      const namespace = resolveMemoryNamespace(config);
      const status = await memory.status(namespace);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, ...status }));
    } catch (err) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  };

  const memoryClearHandler: HttpRouteHandler = async (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    const memory = getMemory();
    if (!memory) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: "Memory not enabled" }));
      return;
    }
    try {
      const namespace = resolveMemoryNamespace(config);
      const result = await memory.forget({ namespace });
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, ...result, namespace }));
    } catch (err) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  };

  for (const base of ["/agenticros", "/api/agenticros", "/plugins/agenticros"]) {
    route({ path: `${base}/memory/status`, method: "GET", handler: memoryStatusHandler });
    route({ path: `${base}/memory/clear`, method: "POST", handler: memoryClearHandler });
  }

  registerCameraSnapshotRoutes(api);
  registerTeleopRoutes(api, config);

  api.logger.info(
    "AgenticROS HTTP routes registered (GET /agenticros/, /config, /config.json; GET/POST/PUT /config/save; memory status + clear; camera snapshot + teleop routes)",
  );
}
