import type { OpenClawPluginApi, HttpRouteRequest, HttpRouteResponse } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { toNamespacedTopic, toNamespacedTopicFull } from "@agenticros/core";
import { getTransport, getTransportOrNull, getTransportMode, tryReconnectFromFile } from "../service.js";
import { readAgenticROSConfigFromFile } from "../config-file.js";
import { getTeleopPageHtml } from "./page.js";
import { ROS_MSG_COMPRESSED_IMAGE } from "@agenticros/ros-camera";

const TWIST_TYPE = "geometry_msgs/msg/Twist";

/** Image/CompressedImage type names (for filtering topics). */
const IMAGE_TYPE_PATTERN = /Image|CompressedImage/i;
/** When type is unknown (e.g. Zenoh), treat topic as camera if name looks like one. */
const CAMERA_TOPIC_NAME_PATTERN = /camera|image|compressed/i;

function parseUrl(req: HttpRouteRequest): { pathname: string; searchParams: URLSearchParams } {
  const base = "http://localhost";
  const url = new URL(req.url ?? "", base);
  return { pathname: url.pathname, searchParams: url.searchParams };
}

function readRequestBody(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}

function getDefaultCameraTopic(config: AgenticROSConfig): string {
  const t = (config.teleop?.cameraTopic ?? "").trim();
  if (t) return t;
  const r = (config.robot?.cameraTopic ?? "").trim();
  if (r) return r;
  return "/camera/camera/color/image_raw/compressed";
}

/** Resolve cmd_vel topic from config (teleop override or robot namespace). Used by estop and teleop. */
export function getCmdVelTopic(config: AgenticROSConfig): string {
  const t = (config.teleop?.cmdVelTopic ?? "").trim();
  if (t) return t;
  return toNamespacedTopicFull(config, "/cmd_vel");
}

function clampTwist(
  config: AgenticROSConfig,
  linearX: number,
  linearY: number,
  linearZ: number,
  angularX: number,
  angularY: number,
  angularZ: number,
): { linear: { x: number; y: number; z: number }; angular: { x: number; y: number; z: number } } {
  const maxLin = config.safety?.maxLinearVelocity ?? 1.0;
  const maxAng = config.safety?.maxAngularVelocity ?? 1.5;

  const linMag = Math.sqrt(linearX * linearX + linearY * linearY + linearZ * linearZ);
  const scaleLin = linMag > maxLin && linMag > 0 ? maxLin / linMag : 1;
  const angMag = Math.abs(angularZ);
  const scaleAng = angMag > maxAng && angMag > 0 ? maxAng / angMag : 1;

  return {
    linear: {
      x: linearX * scaleLin,
      y: linearY * scaleLin,
      z: linearZ * scaleLin,
    },
    angular: {
      x: angularX * scaleAng,
      y: angularY * scaleAng,
      z: Math.max(-maxAng, Math.min(maxAng, angularZ)),
    },
  };
}

function imageDataToBuffer(data: unknown): Buffer | null {
  if (data == null) return null;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) {
    const bytes = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) bytes[i] = Number(data[i]) & 0xff;
    return Buffer.from(bytes);
  }
  if (typeof data === "string") return Buffer.from(data, "base64");
  return null;
}

/** Shared latest-frame cache: one subscription per topic, serve from cache so polling doesn't timeout. */
type CameraCacheState = {
  topic: string;
  sub: { unsubscribe(): void } | null;
  cache: Buffer | null;
  mime: string;
  firstFrameResolve: ((r: { buf: Buffer; mime: string }) => void) | null;
  firstFrameReject: ((e: Error) => void) | null;
  firstFrameTimeout: ReturnType<typeof setTimeout> | null;
};
let cameraCacheState: CameraCacheState | null = null;
/** Throttle camera timeout logs to avoid flooding (log at most once per 15s per topic). */
let lastCameraTimeoutLog: { topic: string; at: number } = { topic: "", at: 0 };
const CAMERA_TIMEOUT_LOG_INTERVAL_MS = 15_000;

/**
 * Register Phase 3 teleop HTTP routes (sources, camera, twist, index page).
 * Only registers when api.registerHttpRoute is available.
 */
export function registerTeleopRoutes(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  const register = api.registerHttpRoute;
  if (typeof register !== "function") {
    api.logger.info("AgenticROS teleop: registerHttpRoute not available, skipping routes");
    return;
  }
  const route = (opts: { path: string; method?: string; handler: (req: HttpRouteRequest, res: HttpRouteResponse) => void | Promise<void> }) =>
    register({ ...opts, requireAuth: false, auth: "plugin" });

  /** Use config from file so namespace/camera/topics apply without gateway restart; fallback to initial config. */
  function getCurrentConfig(): AgenticROSConfig {
    try {
      return readAgenticROSConfigFromFile();
    } catch {
      return config;
    }
  }

  const pingHandler = (_req: HttpRouteRequest, res: HttpRouteResponse) => {
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, agenticros: "teleop" }));
  };

  const statusHandler = (_req: HttpRouteRequest, res: HttpRouteResponse) => {
    const t = getTransportOrNull();
    const mode = getTransportMode();
    const connected = t ? t.getStatus() === "connected" : false;
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 200;
    res.end(JSON.stringify({ mode: mode ?? "none", connected }));
  };

  const reconnectHandler = async (_req: HttpRouteRequest, res: HttpRouteResponse) => {
    try {
      const result = await tryReconnectFromFile(api);
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (e) {
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    }
  };

  for (const base of ["/agenticros", "/api/agenticros", "/plugins/agenticros"]) {
    route({ path: `${base}/teleop/ping`, method: "GET", handler: pingHandler });
    route({ path: `${base}/teleop/status`, method: "GET", handler: statusHandler });
    route({ path: `${base}/teleop/reconnect`, method: "GET", handler: reconnectHandler });
    route({ path: `${base}/teleop/reconnect`, method: "POST", handler: reconnectHandler });
  }

  // GET .../teleop/sources — JSON list of camera topics. Always returns at least one option (default camera) when discovery is empty or transport fails.
  const sourcesHandler = async (_req: HttpRouteRequest, res: HttpRouteResponse) => {
    const fallbackList = (): Array<{ topic: string; label?: string }> => {
      try {
        const cfg = getCurrentConfig();
        const topic = getDefaultCameraTopic(cfg);
        return [{ topic, label: "Default camera" }];
      } catch {
        return [{ topic: "/camera/camera/color/image_raw/compressed", label: "Default camera" }];
      }
    };
    try {
      const currentConfig = getCurrentConfig();
      let list: Array<{ topic: string; label?: string }>;
      const explicit = currentConfig.teleop?.cameraTopics ?? [];
      if (explicit.length > 0) {
        list = explicit.map((o) => ({ topic: o.topic, label: o.label }));
      } else {
        try {
          const transport = getTransport();
          const topics = await transport.listTopics();
          const imageTopics = topics.filter((t) => {
            if (t.type && IMAGE_TYPE_PATTERN.test(t.type)) return true;
            if (!t.type || t.type === "unknown") {
              return CAMERA_TOPIC_NAME_PATTERN.test(t.name);
            }
            return false;
          });
          const compressedOnly = imageTopics.filter((t) => !/\/zstd\/?$/i.test(t.name));
          const toList = compressedOnly.length > 0 ? compressedOnly : imageTopics;
          toList.sort((a, b) => {
            const aCompressed = /compressed/i.test(a.name) ? 1 : 0;
            const bCompressed = /compressed/i.test(b.name) ? 1 : 0;
            return bCompressed - aCompressed;
          });
          list = toList.map((t) => ({
            topic: t.name,
            label: t.name.replace(/^\//, "").replace(/\//g, " / "),
          }));
          if (list.length === 0) list = fallbackList();
        } catch (e) {
          api.logger.warn("Teleop sources (discovery failed, using default): " + (e instanceof Error ? e.message : String(e)));
          list = fallbackList();
        }
      }
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.end(JSON.stringify(list));
    } catch (e) {
      api.logger.warn("Teleop sources error: " + (e instanceof Error ? e.message : String(e)));
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.end(JSON.stringify(fallbackList()));
    }
  };

  for (const base of ["/agenticros", "/api/agenticros", "/plugins/agenticros"]) {
    route({ path: `${base}/teleop/sources`, method: "GET", handler: sourcesHandler });
  }

  // GET .../teleop/camera?topic=...&type=compressed|image
  const cameraHandler = async (req: HttpRouteRequest, res: HttpRouteResponse) => {
      const currentConfig = getCurrentConfig();
      const { searchParams } = parseUrl(req);
      let topic = searchParams.get("topic")?.trim();
      if (topic) topic = topic.replace(/\?.*$/, "").replace(/#.*$/, "").trim();
      if (!topic) topic = getDefaultCameraTopic(currentConfig);
      if (topic && /\/zstd\/?$/i.test(topic)) {
        topic = topic.replace(/\/zstd\/?$/i, "/compressed");
      }
      if (topic && /image_raw$/i.test(topic) && !/compressed|zstd/i.test(topic)) {
        topic = topic.replace(/\/?$/, "") + "/compressed";
      }
      const typeParam = (searchParams.get("type") ?? "compressed").toLowerCase();
      const useImage = typeParam === "image";
      // Camera topics from zenoh-bridge-ros2dds are typically NOT namespaced (e.g. camera/camera/color/image_raw/compressed).
      // Only apply namespace to root-level topics so we subscribe to the key the robot actually publishes.
      const resolvedTopic = toNamespacedTopic(currentConfig, topic);
      if (cameraCacheState?.topic !== resolvedTopic) {
        api.logger.info(`Teleop camera: topic=${topic} resolvedTopic=${resolvedTopic} namespace=${(currentConfig.robot?.namespace ?? "").trim() || "(none)"}`);
      }

      if (useImage) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 501;
        res.end(
          JSON.stringify({
            error: "Raw Image topics not supported; use a CompressedImage topic (e.g. .../image_raw/compressed)",
          }),
        );
        return;
      }

      try {
        if (cameraCacheState?.topic !== resolvedTopic) {
          if (cameraCacheState?.sub) {
            cameraCacheState.sub.unsubscribe();
            if (cameraCacheState.firstFrameTimeout) clearTimeout(cameraCacheState.firstFrameTimeout);
          }
          cameraCacheState = {
            topic: resolvedTopic,
            sub: null,
            cache: null,
            mime: "image/jpeg",
            firstFrameResolve: null,
            firstFrameReject: null,
            firstFrameTimeout: null,
          };
        }
        const state = cameraCacheState;

        if (state.cache && state.cache.length > 0) {
          res.setHeader("Content-Type", state.mime);
          res.setHeader("Cache-Control", "no-store");
          res.statusCode = 200;
          res.end(state.cache);
          return;
        }

        if (!state.sub) {
          const transport = getTransport();
          const firstFramePromise = new Promise<{ buf: Buffer; mime: string }>((resolve, reject) => {
            state.firstFrameResolve = resolve;
            state.firstFrameReject = reject;
            state.firstFrameTimeout = setTimeout(() => {
              if (state.firstFrameReject) {
                state.firstFrameReject(new Error("timeout"));
                state.firstFrameResolve = null;
                state.firstFrameReject = null;
                state.firstFrameTimeout = null;
              }
            }, 8000);
          });
          const handler = (msg: Record<string, unknown>) => {
            const data = msg["data"];
            const buf = imageDataToBuffer(data);
            if (!buf || buf.length === 0) return;
            const format = String(msg["format"] ?? "jpeg").toLowerCase();
            state.mime = format === "png" ? "image/png" : "image/jpeg";
            state.cache = buf;
            if (state.firstFrameTimeout) {
              clearTimeout(state.firstFrameTimeout);
              state.firstFrameTimeout = null;
            }
            if (state.firstFrameResolve) {
              state.firstFrameResolve({ buf, mime: state.mime });
              state.firstFrameResolve = null;
              state.firstFrameReject = null;
            }
          };
          if (typeof (transport as { subscribeAsync?: unknown }).subscribeAsync === "function") {
            state.sub = await (transport as { subscribeAsync(opts: { topic: string; type: string }, h: (msg: Record<string, unknown>) => void): Promise<{ unsubscribe(): void }> }).subscribeAsync(
              { topic: resolvedTopic, type: ROS_MSG_COMPRESSED_IMAGE },
              handler,
            );
          } else {
            state.sub = transport.subscribe(
              { topic: resolvedTopic, type: ROS_MSG_COMPRESSED_IMAGE },
              handler,
            );
          }
          const { buf, mime } = await firstFramePromise;
          res.setHeader("Content-Type", mime);
          res.setHeader("Cache-Control", "no-store");
          res.statusCode = 200;
          res.end(buf);
          return;
        }

        const waitForFirst = new Promise<{ buf: Buffer; mime: string }>((resolve, reject) => {
          const deadline = Date.now() + 5000;
          const check = () => {
            if (state.cache && state.cache.length > 0) {
              resolve({ buf: state.cache, mime: state.mime });
              return;
            }
            if (Date.now() >= deadline) {
              reject(new Error("timeout"));
              return;
            }
            setTimeout(check, 30);
          };
          check();
        });
        const { buf, mime } = await waitForFirst;
        res.setHeader("Content-Type", mime);
        res.setHeader("Cache-Control", "no-store");
        res.statusCode = 200;
        res.end(buf);
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        const isTimeout = /timeout/i.test(raw);
        const now = Date.now();
        if (!isTimeout || resolvedTopic !== lastCameraTimeoutLog.topic || now - lastCameraTimeoutLog.at >= CAMERA_TIMEOUT_LOG_INTERVAL_MS) {
          api.logger.warn("Teleop camera error: " + raw);
          if (isTimeout) lastCameraTimeoutLog = { topic: resolvedTopic, at: now };
        }
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 503;
        const userMsg =
          /session|transport|not initialized|undefined/i.test(raw)
            ? "Camera unavailable. Transport may be on another gateway worker — try opening teleop on the gateway directly or run the gateway with a single worker."
            : raw;
        res.end(JSON.stringify({ error: userMsg }));
      }
  };

  for (const base of ["/agenticros", "/api/agenticros", "/plugins/agenticros"]) {
    route({ path: `${base}/teleop/camera`, method: "GET", handler: cameraHandler });
  }

  // Shared: publish twist and send JSON response
  async function publishTwistAndRespond(
    res: HttpRouteResponse,
    lx: number,
    ly: number,
    lz: number,
    ax: number,
    ay: number,
    az: number,
  ): Promise<void> {
    const currentConfig = getCurrentConfig();
    const clamped = clampTwist(currentConfig, lx, ly, lz, ax, ay, az);
    const topic = getCmdVelTopic(currentConfig);
    api.logger.info(`Teleop twist: publishing linear.x=${clamped.linear.x} angular.z=${clamped.angular.z} to topic=${topic}`);
    try {
      const transport = getTransport();
      const status = transport.getStatus?.();
      if (status && status !== "connected") {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 503;
        res.end(JSON.stringify({ error: `ROS2 transport not connected (status: ${status}). Check Zenoh router and gateway logs.` }));
        return;
      }
      const publishResult = transport.publish({
        topic,
        type: TWIST_TYPE,
        msg: {
          linear: clamped.linear,
          angular: clamped.angular,
        },
      });
      await Promise.resolve(publishResult);
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, topic }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      api.logger.warn("Teleop twist error: " + msg);
      res.setHeader("Content-Type", "application/json");
      const isUnavailable = /not initialized|not connected/i.test(msg);
      res.statusCode = isUnavailable ? 503 : 500;
      res.end(JSON.stringify({ error: isUnavailable ? "ROS2 transport not ready. Start the gateway service and ensure Zenoh/rosbridge is connected." : "Failed to publish twist" }));
    }
  }

  const twistPostHandler = async (req: HttpRouteRequest, res: HttpRouteResponse) => {
    let body: Record<string, unknown> = {};
    try {
      if (typeof req.readJsonBody === "function") {
        body = (await req.readJsonBody()) ?? {};
      }
      if (Object.keys(body).length === 0) {
        const raw = (req as { body?: unknown }).body;
        if (typeof raw === "object" && raw !== null) {
          body = raw as Record<string, unknown>;
        } else if (raw && typeof (raw as Promise<unknown>).then === "function") {
          const parsed = await (raw as Promise<Record<string, unknown>>);
          if (parsed && typeof parsed === "object") body = parsed;
        }
      }
      if (Object.keys(body).length === 0 && typeof (req as { on?: (e: string, cb: (c?: Buffer) => void) => void }).on === "function") {
        const rawBody = await readRequestBody(req as unknown as NodeJS.ReadableStream);
        if (rawBody.trim()) {
          try {
            body = JSON.parse(rawBody) as Record<string, unknown>;
          } catch {
            try {
              for (const part of rawBody.split("&")) {
                const eq = part.indexOf("=");
                const k = eq >= 0 ? decodeURIComponent(part.slice(0, eq).replace(/\+/g, " ")) : decodeURIComponent(part.replace(/\+/g, " "));
                const v = eq >= 0 ? decodeURIComponent(part.slice(eq + 1).replace(/\+/g, " ")) : "";
                if (k) body[k] = v;
              }
            } catch {
              // leave body empty
            }
          }
        }
      }
    } catch {
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Invalid JSON body" }));
      return;
    }
    let lx = Number(body.linear_x ?? (body as Record<string, unknown>).linearX ?? 0);
    let ly = Number(body.linear_y ?? (body as Record<string, unknown>).linearY ?? 0);
    let lz = Number(body.linear_z ?? (body as Record<string, unknown>).linearZ ?? 0);
    let ax = Number(body.angular_x ?? (body as Record<string, unknown>).angularX ?? 0);
    let ay = Number(body.angular_y ?? (body as Record<string, unknown>).angularY ?? 0);
    let az = Number(body.angular_z ?? (body as Record<string, unknown>).angularZ ?? 0);
    const bodyAllZero = lx === 0 && ly === 0 && lz === 0 && ax === 0 && ay === 0 && az === 0;
    if (bodyAllZero) {
      const fromQuery = getTwistParamsFromQuery(req);
      if (fromQuery.source !== "none") {
        lx = fromQuery.lx;
        ly = fromQuery.ly;
        lz = fromQuery.lz;
        ax = fromQuery.ax;
        ay = fromQuery.ay;
        az = fromQuery.az;
        api.logger.info(`Teleop twist POST: linear_x=${lx} linear_y=${ly} angular_z=${az} (from ${fromQuery.source}, body was empty/zeros)`);
      } else {
        api.logger.info(`Teleop twist POST: linear_x=0 linear_y=0 angular_z=0 (body empty/zeros, no query — open via proxy so query is forwarded)`);
      }
    } else {
      api.logger.info(`Teleop twist POST: linear_x=${lx} linear_y=${ly} angular_z=${az}`);
    }
    await publishTwistAndRespond(res, lx, ly, lz, ax, ay, az);
  };

  /** Get a header value (case-insensitive). */
  function getHeader(req: HttpRouteRequest, name: string): string | undefined {
    const h = (req as { headers?: Record<string, string | string[] | undefined> }).headers;
    if (!h) return undefined;
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(h)) {
      if (k.toLowerCase() === lower) {
        return typeof v === "string" ? v : Array.isArray(v) ? (v[0] as string) : undefined;
      }
    }
    return undefined;
  }

  /** Parse twist params from URL query string or X-AgenticROS-Query (used by GET and as POST fallback when body is zeros). */
  function getTwistParamsFromQuery(req: HttpRouteRequest): { lx: number; ly: number; lz: number; ax: number; ay: number; az: number; source: string } {
    const rawUrl = (req as { url?: string; originalUrl?: string }).url ?? (req as { originalUrl?: string }).originalUrl ?? "";
    const forwardedQuery = getHeader(req, "x-agenticros-query");
    const { searchParams } = parseUrl(req);
    const q = (req as { query?: Record<string, string | string[] | undefined> }).query;
    const getParam = (name: string, alt: string): string | undefined => {
      const fromUrl = searchParams.get(name) ?? searchParams.get(alt);
      if (fromUrl != null) return fromUrl;
      if (q) {
        const v = q[name] ?? q[alt];
        return Array.isArray(v) ? v[0] : v;
      }
      const queryString = rawUrl.includes("?") ? rawUrl.slice(rawUrl.indexOf("?") + 1) : forwardedQuery;
      if (queryString) {
        try {
          const params = new URLSearchParams(queryString);
          return params.get(name) ?? params.get(alt) ?? undefined;
        } catch {
          // ignore
        }
      }
      return undefined;
    };
    const lx = Number(getParam("linear_x", "linearX") ?? 0);
    const ly = Number(getParam("linear_y", "linearY") ?? 0);
    const lz = Number(getParam("linear_z", "linearZ") ?? 0);
    const ax = Number(getParam("angular_x", "angularX") ?? 0);
    const ay = Number(getParam("angular_y", "angularY") ?? 0);
    const az = Number(getParam("angular_z", "angularZ") ?? 0);
    const source = rawUrl.includes("?") ? "url" : forwardedQuery ? "header" : "none";
    return { lx, ly, lz, ax, ay, az, source };
  }

  const twistGetHandler = async (req: HttpRouteRequest, res: HttpRouteResponse) => {
    const { lx, ly, lz, ax, ay, az, source } = getTwistParamsFromQuery(req);
    const allZero = lx === 0 && ly === 0 && lz === 0 && ax === 0 && ay === 0 && az === 0;
    api.logger.info(`Teleop twist GET: linear_x=${lx} linear_y=${ly} angular_z=${az} (source: ${source})${allZero && source === "none" ? " — params missing: open teleop via proxy (http://127.0.0.1:18790/plugins/agenticros/) so twist query is forwarded" : ""}`);
    await publishTwistAndRespond(res, lx, ly, lz, ax, ay, az);
  };

  for (const base of ["/agenticros", "/api/agenticros", "/plugins/agenticros"]) {
    route({ path: `${base}/teleop/twist`, method: "POST", handler: twistPostHandler });
    route({ path: `${base}/teleop/twist`, method: "GET", handler: twistGetHandler });
  }

  // GET .../teleop/ and .../teleop/index.html
  const servePage = (_req: HttpRouteRequest, res: HttpRouteResponse) => {
    const html = getTeleopPageHtml(getCurrentConfig());
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.statusCode = 200;
    res.end(html);
  };

  for (const base of ["/agenticros", "/api/agenticros", "/plugins/agenticros"]) {
    route({ path: `${base}/teleop/`, method: "GET", handler: servePage });
    route({ path: `${base}/teleop/index.html`, method: "GET", handler: servePage });
  }

  api.logger.info("AgenticROS teleop routes registered (GET /agenticros/teleop/, /ping, /sources, /camera; GET/POST /twist)");
}
