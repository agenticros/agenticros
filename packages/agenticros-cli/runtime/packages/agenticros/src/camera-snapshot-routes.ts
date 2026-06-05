import type { OpenClawPluginApi, HttpRouteRequest, HttpRouteResponse } from "./plugin-api.js";
import { getCameraSnapshot } from "./camera-snapshot-cache.js";

/**
 * Serves cached ros2_camera_snapshot bytes (JPEG/PNG) for chat markdown — avoids huge data: URLs.
 */
export function registerCameraSnapshotRoutes(api: OpenClawPluginApi): void {
  const register = api.registerHttpRoute;
  if (typeof register !== "function") {
    return;
  }

  const handler = (req: HttpRouteRequest, res: HttpRouteResponse) => {
    const url = req.url ?? "";
    const u = new URL(url, "http://localhost");
    const id = u.searchParams.get("id")?.trim() ?? "";
    if (!id || !/^[a-f0-9]{32}$/i.test(id)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Missing or invalid id");
      return;
    }
    const entry = getCameraSnapshot(id);
    if (!entry) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Snapshot not found or expired");
      return;
    }
    res.setHeader("Content-Type", entry.mimeType);
    res.setHeader("Cache-Control", "no-store");
    res.statusCode = 200;
    res.end(entry.body);
  };

  const route = (opts: { path: string; method?: string; handler: typeof handler }) =>
    register({ ...opts, requireAuth: false, auth: "plugin" });

  for (const base of ["/agenticros", "/api/agenticros", "/plugins/agenticros"]) {
    route({ path: `${base}/camera/snapshot`, method: "GET", handler });
  }

  api.logger.info("AgenticROS: camera snapshot route registered (GET .../camera/snapshot?id=)");
}
