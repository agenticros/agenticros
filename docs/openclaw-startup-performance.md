# AgenticROS / OpenClaw Startup Optimization

## Purpose

This document describes a startup-performance problem discovered when loading AgenticROS as an OpenClaw plugin, the diagnostic changes made on a deployed NVIDIA Jetson installation, what we learned, and what still needs to be implemented cleanly in the AgenticROS source repository.

**Important:** The deployed copy under `~/.agenticros/plugin-deploy` contains experimental diagnostic modifications. Do **not** blindly copy that directory over the source repository.

The goal is to translate the proven optimizations into maintainable source changes while preserving all AgenticROS transports and functionality.

---

# 1. Original Problem

OpenClaw startup became extremely slow when the AgenticROS plugin was enabled.

Observed behavior included:

- OpenClaw startup exceeding 100 seconds.
- Event-loop stalls of roughly 60–105 seconds.
- OpenClaw consuming approximately one CPU core during startup.
- Memory usage reaching approximately 1–2 GB.
- The gateway port sometimes accepting TCP connections before HTTP became responsive.
- AgenticROS `register()` itself completing in only tens of milliseconds.

This initially looked like AgenticROS runtime initialization blocking Node.js.

That turned out **not** to be the primary cause.

---

# 2. Root Cause

OpenClaw performs extensive plugin source/dependency capture and admission processing.

During startup, OpenClaw recursively examines/copies/hashes plugin sources and dependencies into:

```text
~/.openclaw/tmp/plugin-captures/
```

A startup could generate tens of thousands of files and hundreds of megabytes or more of temporary capture data.

The AgenticROS dependency graph caused OpenClaw to capture packages that were not actually needed for the configured transport.

The most expensive examples were native optional dependencies such as:

```text
rclnodejs
node-datachannel
```

AgenticROS was configured to use:

```text
transport = rosbridge
```

but OpenClaw still processed dependencies associated with:

```text
local DDS     -> rclnodejs
WebRTC        -> node-datachannel
Zenoh         -> zenoh-ts + CDR dependencies
vision        -> ONNX Runtime + Sharp
camera        -> PNGJS
```

The fundamental issue is therefore:

> Optional AgenticROS capabilities were optional at runtime but not sufficiently optional from OpenClaw's plugin dependency/admission perspective.

---

# 3. Performance Results

The experiments produced approximately the following progression:

| Configuration | OpenClaw startup |
|---|---:|
| Original full AgenticROS | ~102.0 sec |
| Minimal AgenticROS root manifest | ~79.1 sec |
| Remove unused `rclnodejs` + `node-datachannel` dependency declarations | ~49.5 sec |
| Remove Zenoh manifest declaration | ~46.7 sec |
| Lazy-load object detection | ~49.1 sec |
| Remove ros-camera manifest dependencies | ~48.3 sec |
| Remove startup CDR diagnostic / Foxglove declarations | ~48.6 sec |
| Current OpenClaw without functioning AgenticROS | ~47.0 sec |

The exact numbers vary between runs, but the major result is clear:

**AgenticROS originally added roughly 50+ seconds of startup overhead.**

After removing the major dependency-capture problems:

**AgenticROS adds only approximately 1–2 seconds relative to the current OpenClaw baseline.**

AgenticROS `register()` itself typically takes only approximately:

```text
35–60 ms
```

Therefore the major performance problem has effectively been solved experimentally.

---

# 4. Most Important Finding

The largest single improvement came from removing these unused native optional dependencies from the deployed `@agenticros/core` manifest:

```json
"optionalDependencies": {
  "node-datachannel": "...",
  "rclnodejs": "..."
}
```

Removing these reduced startup from approximately:

```text
79 sec -> 49 sec
```

This happened even though neither dependency was required for the active `rosbridge` transport.

This is the most important production issue to address.

**Production fix (source tree):** keep `rclnodejs` and `node-datachannel` as `@agenticros/core` `optionalDependencies` so install stays main-compatible (Mode A / Mode C work after a normal `pnpm install`). `scripts/setup_gateway_plugin.sh` reconstructs either package into the deploy tree if `pnpm deploy` omits it, then strips `optionalDependencies` from the *deployed* core `package.json` only (replacing the file inode so pnpm hardlinks do not mutate the workspace source). Modules remain on disk for runtime; OpenClaw admission no longer re-captures those native trees.

---

# 5. Existing Transport Factory Is Good

The AgenticROS transport factory is already architected correctly at the JavaScript level.

It dynamically loads transports:

```js
export async function createTransport(config) {
    switch (config.mode) {
        case "rosbridge": {
            const { RosbridgeTransport } =
                await import("./rosbridge/adapter.js");

            return new RosbridgeTransport(config.rosbridge);
        }

        case "local": {
            const { LocalTransport } =
                await import("./local/transport.js");

            return new LocalTransport(config.local);
        }

        case "webrtc": {
            const { WebRTCTransport } =
                await import("./webrtc/transport.js");

            return new WebRTCTransport(config.webrtc);
        }

        case "zenoh": {
            const { ZenohTransport } =
                await import("./zenoh/adapter.js");

            return new ZenohTransport(config.zenoh);
        }
    }
}
```

This behavior should be preserved.

The problem is primarily **package/dependency visibility to OpenClaw**, not the transport factory's runtime behavior.

---

# 6. Recommended Architecture

AgenticROS core should remain lightweight.

Conceptually:

```text
@agenticros/core

    configuration
    robot profiles
    safety
    capabilities
    transport interfaces
    transport factory

         |
         +-- rosbridge
         |      |
         |      +-- ws
         |
         +-- local
         |      |
         |      +-- rclnodejs
         |
         +-- WebRTC
         |      |
         |      +-- node-datachannel
         |
         +-- Zenoh
                |
                +-- zenoh-ts
                +-- CDR serialization
                     |
                     +-- Foxglove libraries
```

Selecting `rosbridge` should ideally not cause OpenClaw to capture:

```text
rclnodejs
node-datachannel
zenoh-ts
Foxglove CDR packages
ONNX Runtime
Sharp
PNGJS
```

unless those capabilities are actually needed.

---

# 7. Local DDS / rclnodejs

The transport factory already dynamically imports the local transport.

It also has an appropriate failure path explaining that `rclnodejs` must be installed.

Therefore investigate making `rclnodejs` a truly optional/installable transport dependency rather than something OpenClaw sees as part of the default core dependency graph.

Do **not** remove Local/DDS support from AgenticROS.

The goal is:

```text
rosbridge user
    -> does not pay rclnodejs startup/admission cost

DDS/local user
    -> can install/use rclnodejs normally
```

---

# 8. WebRTC / node-datachannel

The same applies to:

```text
node-datachannel
```

The factory already dynamically imports WebRTC.

Do **not** remove WebRTC support.

Instead make `node-datachannel` a dependency that is only required/admitted when WebRTC is actually being used or explicitly installed.

---

# 9. Object Detection

Originally an AgenticROS tool contained a static import similar to:

```js
import { findObject } from "@agenticros/object-detection";
```

That made OpenClaw capture the vision stack, including packages such as:

```text
onnxruntime-node
sharp
```

A diagnostic modification changed this to a dynamic import inside tool execution:

```js
const { findObject } =
    await import("@agenticros/object-detection");

const result = await findObject(...);
```

This successfully prevented OpenClaw from capturing the object-detection dependency tree during normal startup.

The feature remained available when invoked.

This is a good candidate for a **permanent source change**.

Desired behavior:

```text
OpenClaw startup
    -> no ONNX/Sharp admission

ros2_find_object invoked
    -> dynamic import
    -> object detection loads
```

Implement this cleanly in source.

---

# 10. Zenoh CDR Startup Diagnostic

The OpenClaw plugin currently/previously performed an unconditional startup diagnostic:

```js
const imageSupported =
    isCdrTypeSupported(
        "sensor_msgs/msg/CompressedImage"
    );

api.logger.info(
    `AgenticROS: Zenoh CDR Image/CompressedImage supported=${imageSupported}`
);
```

The plugin entrypoint also imported:

```js
isCdrTypeSupported
```

from `@agenticros/core`.

This check is informational only.

It is unnecessary when AgenticROS is configured for `rosbridge`.

The diagnostic version of the deployed plugin removed this unconditional startup check.

Recommended production change:

**Do not initialize/check Zenoh CDR capabilities during generic AgenticROS plugin startup.**

If such a diagnostic is useful, execute it only when:

```text
transport.mode === "zenoh"
```

or perform it inside the Zenoh implementation.

---

# 11. Foxglove Dependencies

The following imports were found exclusively in:

```text
@agenticros/core/dist/transport/zenoh/cdr.js
```

They are:

```js
import { CdrReader } from "@foxglove/cdr";
import { parse } from "@foxglove/rosmsg";
import { MessageReader }
    from "@foxglove/rosmsg2-serialization";
```

These are not evidence of a Foxglove application integration.

They are being used as ROS/CDR serialization infrastructure for Zenoh.

Foxglove-related packages observed included:

```text
@foxglove/cdr
@foxglove/rosmsg
@foxglove/rosmsg2-serialization
@foxglove/message-definition
@foxglove/rostime
```

Experiments removing Foxglove declarations did **not** materially improve startup.

Therefore:

**Do not prioritize Foxglove optimization for performance.**

Longer term, however, these dependencies should ideally live behind the Zenoh transport boundary rather than appearing to be generic core requirements.

---

# 12. Zenoh

Removing the Zenoh manifest declaration reduced the AgenticROS capture size substantially but only improved startup by a few seconds.

Zenoh should remain supported.

The transport factory already dynamically imports:

```js
await import("./zenoh/adapter.js");
```

Possible future cleanup:

```text
@agenticros/core
@agenticros/transport-rosbridge
@agenticros/transport-dds
@agenticros/transport-webrtc
@agenticros/transport-zenoh
```

or package exports/subpaths that provide similar dependency isolation.

Do not undertake a major package split solely for this startup fix unless there is a compelling architectural reason.

---

# 13. Camera / PNGJS

A major diagnostic discovery involved:

```text
pngjs
```

An eager PNGJS path correlated with severe OpenClaw capture behavior during earlier experiments.

The deployed diagnostic version currently has a temporary modification in the ros-camera snapshot code:

- eager PNGJS import removed
- raw ROS Image -> PNG encoding currently throws rather than using PNGJS

**This is diagnostic only and must not become the production solution.**

Production goal:

```text
CompressedImage
    -> normal fast path

Raw sensor_msgs/Image requiring PNG encoding
    -> dynamically load PNG encoder only when needed
```

For example, investigate:

```js
const { PNG } = await import("pngjs");
```

inside the actual raw-image encoding path.

Do not eagerly load/capture PNGJS during ordinary startup if it can be avoided.

Restore full raw image -> PNG functionality.

---

# 14. fzstd

`fzstd` remained discoverable through actual code references even when removed from the ros-camera manifest.

It did not appear to be a significant startup contributor.

Do not optimize it unless there is another architectural reason.

---

# 15. TypeBox

Earlier investigation found significant startup/capture behavior associated with:

```text
@sinclair/typebox
```

A deployed diagnostic version replaced runtime TypeBox usage with a lightweight plain JSON schema shim.

Nested expressions such as:

```js
Type.Optional(Type.String(...))
```

were also removed/de-nested during investigation.

This produced a meaningful improvement earlier in the debugging process.

Before making this permanent:

1. Inspect the current AgenticROS source.
2. Determine why TypeBox is required.
3. Determine whether OpenClaw tools can use plain JSON Schema instead.
4. Preserve all tool schemas and validation semantics.
5. Avoid introducing an unnecessary runtime TypeBox dependency if plain JSON Schema satisfies the OpenClaw API.

Do not simply copy the diagnostic shim without reviewing it.

---

# 16. Zod

Zod is used by generic core functionality.

Observed imports include:

```text
robot-profile.js
capability-schema.js
config.js
```

Examples include:

```js
import { z } from "zod";
```

Zod is therefore not merely a transport-specific dependency.

Do not remove Zod as part of this optimization.

---

# 17. ws

`ws` is used by at least:

```text
transport/rosbridge/client.js
transport/webrtc/signaling-client.js
```

Since rosbridge is an important/default transport, `ws` is legitimate core runtime functionality.

Do not remove `ws`.

---

# 18. Current Deployed Diagnostic State

The deployed installation has been modified during debugging.

Location:

```text
~/.agenticros/plugin-deploy
```

Important modifications include:

### Root package manifest

The deployed root manifest was temporarily reduced to approximately:

```json
"dependencies": {
  "@agenticros/core": "workspace:*"
}
```

This is an experiment, not necessarily the desired production manifest.

### Core manifest

The deployed core manifest has had these removed during experiments:

```text
rclnodejs
node-datachannel
zenoh-ts
@foxglove/cdr
@foxglove/rosmsg
@foxglove/rosmsg2-serialization
```

At the end of testing its dependencies were approximately:

```json
{
  "ws": "^8.18.0",
  "zod": "^3.24.0"
}
```

Do not blindly reproduce this manifest.

### Object detection

`ros2-find-object.js` was modified to dynamically import:

```text
@agenticros/object-detection
```

This is likely worth making permanent.

### PNGJS

The deployed ros-camera code currently contains a diagnostic modification that disables the normal raw-image PNG encoding path.

This needs to be fixed properly.

### Zenoh CDR diagnostic

The unconditional `isCdrTypeSupported()` startup diagnostic was removed from the deployed OpenClaw plugin.

This is likely worth making permanent or conditional on Zenoh.

### Core CDR export

The following core export was restored after testing:

```js
export {
    isCdrTypeSupported
} from "./transport/zenoh/cdr.js";
```

Removing it broke the OpenClaw AgenticROS plugin before the plugin entrypoint diagnostic was changed.

Do not remove public API exports without checking compatibility.

---

# 19. Diagnostic Backups

Diagnostic backups were stored outside the deployed plugin tree under approximately:

```text
~/.agenticros/debug-artifacts/
```

Examples include:

```text
package.json.before-minimal-manifest

core-package.json.before-minimal

core-package.json.before-no-foxglove

core-index.js.before-no-zenoh-cdr

ros2-find-object.js.before-lazy

ros-camera-package.json.before-minimal

index.js.before-no-cdr-diagnostic
```

These can be useful for comparing original and experimental versions.

Do not treat every diagnostic version as production-ready.

---

# 20. Do Not Blindly Copy plugin-deploy

Do **not** do something like:

```bash
cp -R ~/.agenticros/plugin-deploy/* ~/Projects/agenticros/
```

The deployed tree contains experimental state.

Instead:

1. Inspect the source repository.
2. Identify corresponding TypeScript source files.
3. Implement each desired change in TypeScript/source manifests.
4. Build normally.
5. Test.
6. Deploy through the normal AgenticROS deployment process.

---

# 21. Source Repository

Expected source repository:

```text
~/Projects/agenticros
```

Create/use a dedicated branch, for example:

```bash
git switch -c fix/openclaw-startup-performance
```

Before modifying anything:

```bash
git status
git branch --show-current
git remote -v
```

Do not overwrite unrelated existing work.

---

# 22. Recommended Implementation Order

Implement production changes in this order.

## Phase 1 — Preserve the proven performance fix

Address:

```text
rclnodejs
node-datachannel
```

They should not be admitted/captured for rosbridge users.

Preserve Local/DDS and WebRTC functionality.

Verify that the dynamic transport factory continues to work.

---

## Phase 2 — Lazy object detection

Change the object-detection tool to load:

```text
@agenticros/object-detection
```

only when the tool is actually executed.

Verify:

```text
ros2_find_object still works
```

while ONNX/Sharp are absent from normal startup capture.

---

## Phase 3 — Zenoh diagnostic

Remove or conditionally execute the unconditional:

```text
isCdrTypeSupported(...)
```

startup diagnostic.

Zenoh functionality must remain intact.

---

## Phase 4 — Camera PNG handling

Restore raw ROS Image -> PNG functionality.

Change PNGJS usage so the PNG encoder is loaded only when the raw-image encoding path is actually needed.

Verify both:

```text
sensor_msgs/CompressedImage
sensor_msgs/Image
```

camera paths.

---

## Phase 5 — TypeBox/schema cleanup

Review the diagnostic plain-JSON-schema implementation.

If OpenClaw does not require TypeBox runtime objects, migrate tool schemas to plain JSON Schema and eliminate unnecessary runtime TypeBox capture.

Preserve schema behavior.

---

## Phase 6 — Dependency/package cleanup

Review:

```text
core
ros-camera
object-detection
openclaw plugin
```

manifests.

Dependencies should accurately describe runtime requirements without forcing unrelated optional capabilities into OpenClaw's startup graph.

Do not remove dependencies merely to make benchmarks look better.

---

# 23. Testing Requirements

After implementation, test at minimum:

### Build

Run the project's normal build and typecheck.

Do not use `npm install` to repair the deployed pnpm workspace.

Use the package manager/workspace conventions already used by the repository.

### Unit tests

Run existing tests for affected packages.

### OpenClaw startup

Test OpenClaw with:

```text
AgenticROS enabled
transport = rosbridge
no skills
```

Measure the OpenClaw-reported startup time.

Expected result should be close to the OpenClaw-without-AgenticROS baseline.

### rosbridge

Verify normal ROS2 operations through rosbridge.

### Local DDS

If an environment with `rclnodejs` is available, verify local/DDS mode still works.

### WebRTC

Verify the WebRTC transport can still load when its native dependency is installed.

### Zenoh

Verify Zenoh still loads its adapter and CDR support correctly.

### Camera

Verify:

```text
CompressedImage
Raw Image -> PNG
depth/camera tools
```

### Object detection

Verify invoking object detection dynamically loads the vision dependencies and succeeds.

---

# 24. Capture Validation

During OpenClaw startup, inspect:

```text
~/.openclaw/tmp/plugin-captures/
```

For a rosbridge-only configuration, ideally normal AgenticROS startup should not capture large dependency trees associated exclusively with:

```text
rclnodejs
node-datachannel
onnxruntime-node
sharp
```

Zenoh/Foxglove capture may require additional architectural work and is not currently a high-priority performance problem.

Do not delete an active capture directory while OpenClaw is running.

---

# 25. Performance Success Criteria

The goal is **not** necessarily to make OpenClaw itself start instantly.

Current testing established an OpenClaw baseline around:

```text
47 seconds
```

on this Jetson/configuration even when AgenticROS failed to load.

Therefore AgenticROS should be judged primarily by **incremental startup overhead**.

Target:

```text
OpenClaw baseline       ~47 sec
OpenClaw + AgenticROS   ~47–50 sec
```

rather than the original:

```text
OpenClaw + AgenticROS   ~102 sec
```

The latter behavior must not return.

---

# 26. Important Non-Goals

Do not:

- Remove Local/DDS support.
- Remove WebRTC support.
- Remove Zenoh support.
- Remove object detection.
- Permanently disable raw-image PNG conversion.
- Delete dependencies solely because they appear large.
- Rewrite the entire transport architecture unnecessarily.
- Copy the diagnostic deployment over the source tree.
- Reinstall OpenClaw as part of this work.
- Modify OpenClaw's capture implementation as the first solution.

The objective is **dependency isolation and lazy loading**, not feature removal.

---

# 27. Additional OpenClaw Issues

Several OpenClaw system/service issues were observed but are separate from this AgenticROS source change.

They include:

```text
TimeoutStopSec too low
KillMode configuration
NVM-based Node runtime
filesystem permissions
slow eMMC/SD storage
OpenClaw capture overhead
```

Do not mix those system-level changes into the AgenticROS Git branch unless specifically required.

The Jetson currently has no NVMe drive detected, and the working filesystem is on:

```text
/dev/mmcblk0p1
```

The filesystem was also more than 90% full during portions of testing.

Storage performance contributes to OpenClaw capture time but does not explain the AgenticROS-specific dependency regression by itself.

---

# 28. Summary for the Implementing Agent

The key lesson is:

> AgenticROS itself was not taking 100 seconds to initialize. OpenClaw was spending most of that time capturing, hashing, admitting, and processing AgenticROS dependencies that were not required for the selected transport.

The largest offender was the presence of unused native optional transport dependencies:

```text
rclnodejs
node-datachannel
```

Removing those from the default OpenClaw-visible dependency graph reduced startup dramatically.

The preferred design is:

> Load expensive or transport-specific dependencies only when the corresponding AgenticROS capability is actually selected or invoked.

Preserve functionality.

Implement the changes in source.

Do not blindly reproduce diagnostic manifest edits.

After implementation, compare OpenClaw startup with and without AgenticROS and verify that incremental AgenticROS overhead remains only a few seconds.

---

# 29. Suggested Commit Structure

Prefer several understandable commits instead of one large opaque change.

For example:

```text
perf(core): isolate optional native transport dependencies

perf(openclaw): avoid eager Zenoh CDR initialization

perf(tools): lazy-load object detection dependencies

perf(camera): lazy-load PNG encoder

refactor(openclaw): replace unnecessary TypeBox runtime schemas

test: cover lazy optional dependency loading
```

Final branch could be:

```text
fix/openclaw-startup-performance
```

Before merging, document benchmark results in the PR/commit history:

```text
Before: ~102 sec
After:  ~48–50 sec
OpenClaw baseline: ~47 sec
```

This demonstrates that the optimization removes approximately 50 seconds of AgenticROS-induced startup overhead without intentionally removing AgenticROS functionality.
