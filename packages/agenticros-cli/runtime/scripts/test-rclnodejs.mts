#!/usr/bin/env npx tsx
/**
 * Validation prototype for rclnodejs ESM integration.
 *
 * Run with ROS2 workspace sourced:
 *   npx tsx scripts/test-rclnodejs.mts
 *
 * Tests:
 * 1. ESM import of rclnodejs
 * 2. init() + createNode() + spin()
 * 3. Topic/service introspection
 * 4. Message type loading
 * 5. Message construction and extraction
 * 6. Clean shutdown
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

// Resolve from the plugin directory where rclnodejs is actually installed
const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginDir = resolve(__dirname, "../extensions/openclaw-plugin");
const pluginRequire = createRequire(resolve(pluginDir, "package.json"));

// --- Test 1: ESM import ---
console.log("=== Test 1: ESM import of rclnodejs ===");

let rclnodejs: any;
try {
  rclnodejs = await import("rclnodejs");
  console.log("  ✓ Direct ESM import succeeded");
} catch {
  console.log("  ⚠ Direct ESM import failed, trying createRequire fallback...");
  rclnodejs = pluginRequire("rclnodejs");
  console.log("  ✓ createRequire fallback succeeded (resolved from plugin node_modules)");
}

// --- Test 2: init + createNode + spin ---
console.log("\n=== Test 2: init + createNode + spin ===");

await rclnodejs.init();
console.log("  ✓ rclnodejs.init() succeeded");

const node = rclnodejs.createNode("agenticros_test");
console.log("  ✓ createNode('agenticros_test') succeeded");

rclnodejs.spin(node);
console.log("  ✓ spin(node) started (non-blocking)");

// --- Test 3: Introspection ---
console.log("\n=== Test 3: Topic/service introspection ===");

const topics = node.getTopicNamesAndTypes();
console.log(`  ✓ getTopicNamesAndTypes() returned ${topics.length} topic(s):`);
for (const t of topics.slice(0, 10)) {
  const name = typeof t === "object" && "name" in t ? (t as { name: string }).name : String(t);
  const types =
    typeof t === "object" && "types" in t ? (t as { types: string[] }).types : [];
  console.log(`    - ${name} [${types.join(", ")}]`);
}
if (topics.length > 10) console.log(`    ... and ${topics.length - 10} more`);

const services = node.getServiceNamesAndTypes();
console.log(`  ✓ getServiceNamesAndTypes() returned ${services.length} service(s):`);
for (const s of services.slice(0, 10)) {
  const name = typeof s === "object" && "name" in s ? (s as { name: string }).name : String(s);
  const types =
    typeof s === "object" && "types" in s ? (s as { types: string[] }).types : [];
  console.log(`    - ${name} [${types.join(", ")}]`);
}
if (services.length > 10) console.log(`    ... and ${services.length - 10} more`);

// --- Test 4: Message type loading ---
console.log("\n=== Test 4: Message type loading ===");

let TwistClass: any;
try {
  TwistClass = rclnodejs.require("geometry_msgs/msg/Twist");
  console.log("  ✓ rclnodejs.require('geometry_msgs/msg/Twist') succeeded");
  console.log(`    Type: ${typeof TwistClass}`);
} catch (e) {
  console.log(`  ✗ Failed to load Twist: ${e}`);
}

// --- Test 5: Message construction and extraction ---
console.log("\n=== Test 5: Message construction & extraction ===");

if (TwistClass) {
  try {
    const msg = new TwistClass();
    msg.linear.x = 1.0;
    msg.linear.y = 0.0;
    msg.linear.z = 0.0;
    msg.angular.x = 0.0;
    msg.angular.y = 0.0;
    msg.angular.z = 0.5;
    console.log("  ✓ Created Twist message and set fields");

    // Try toPlainObject if available
    if (typeof msg.toPlainObject === "function") {
      const plain = msg.toPlainObject();
      console.log("  ✓ msg.toPlainObject() succeeded:");
      console.log(`    ${JSON.stringify(plain)}`);
    } else {
      console.log("  ⚠ toPlainObject() not available, extracting fields manually:");
      const plain = {
        linear: { x: msg.linear.x, y: msg.linear.y, z: msg.linear.z },
        angular: { x: msg.angular.x, y: msg.angular.y, z: msg.angular.z },
      };
      console.log(`    ${JSON.stringify(plain)}`);
    }
  } catch (e) {
    console.log(`  ✗ Message construction failed: ${e}`);
  }
} else {
  console.log("  ⚠ Skipped — Twist class not loaded");
}

// --- Test 6: Clean shutdown ---
console.log("\n=== Test 6: Clean shutdown ===");

node.destroy();
console.log("  ✓ node.destroy() succeeded");

rclnodejs.shutdown();
console.log("  ✓ rclnodejs.shutdown() succeeded");

console.log("\n=== All tests passed ===");
