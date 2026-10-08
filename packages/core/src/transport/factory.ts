import type { TransportConfig } from "./types.js";
import type { RosTransport } from "./transport.js";

/**
 * Create a RosTransport instance for the given deployment mode.
 *
 * Uses dynamic import() to load the correct adapter so that
 * unused adapters (and their dependencies) are never loaded.
 */
export async function createTransport(config: TransportConfig): Promise<RosTransport> {
  switch (config.mode) {
    case "rosbridge": {
      const { RosbridgeTransport } = await import("./rosbridge/adapter.js");
      return new RosbridgeTransport(config.rosbridge);
    }

    case "local": {
      try {
        const { LocalTransport } = await import("./local/transport.js");
        return new LocalTransport(config.local);
      } catch (e: any) {
        if (e?.code === "ERR_MODULE_NOT_FOUND" || e?.code === "MODULE_NOT_FOUND") {
          throw new Error(
            'Mode A (local) requires the "rclnodejs" package (not bundled with @agenticros/core). ' +
              "Install it where the gateway/MCP runs: `pnpm add -w rclnodejs` in the AgenticROS " +
              "repo (with ROS 2 sourced), then redeploy the plugin; or `npm install rclnodejs` " +
              "into the OpenClaw plugin deploy tree.",
          );
        }
        throw e;
      }
    }

    case "webrtc": {
      try {
        const { WebRTCTransport } = await import("./webrtc/transport.js");
        return new WebRTCTransport(config.webrtc);
      } catch (e: any) {
        if (e?.code === "ERR_MODULE_NOT_FOUND" || e?.code === "MODULE_NOT_FOUND") {
          throw new Error(
            'Mode C (webrtc) requires the "node-datachannel" package (not bundled with @agenticros/core). ' +
              "Install it where the gateway runs: `pnpm add -w node-datachannel` (needs native " +
              "build tools or a prebuilt binary), then redeploy the plugin.",
          );
        }
        throw e;
      }
    }

    case "zenoh": {
      const { ZenohTransport } = await import("./zenoh/adapter.js");
      return new ZenohTransport(config.zenoh);
    }

    default: {
      const _exhaustive: never = config;
      throw new Error(`Unknown transport mode: ${(_exhaustive as TransportConfig).mode}`);
    }
  }
}
