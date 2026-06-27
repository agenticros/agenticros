/**
 * Dynamic loader for `node-datachannel` — an optional native dependency.
 *
 * WebRTC (Mode C) is the only transport that needs it. Sandboxed installs
 * (NemoClaw, minimal Docker images) often lack the toolchain to build it,
 * so it lives in @agenticros/core's optionalDependencies and is imported
 * only when transport.mode === "webrtc".
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NodeDataChannelModule = any;

let cached: NodeDataChannelModule | null = null;

export async function loadNodeDataChannel(): Promise<NodeDataChannelModule> {
  if (cached) return cached;
  try {
    cached = await import("node-datachannel");
    return cached;
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND") {
      throw new Error(
        'Mode C (webrtc) requires the "node-datachannel" package with a working native binary. ' +
          "Install with: pnpm add node-datachannel (needs build tools or a prebuilt binary for your platform). " +
          "For rosbridge/zenoh-only setups you can skip it.",
      );
    }
    throw e;
  }
}
