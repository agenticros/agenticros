import { test } from "node:test";
import assert from "node:assert/strict";

import { waitForStableTopics, type TopicNameAndTypes } from "../transport/local/graph-discovery.js";

function topic(name: string): TopicNameAndTypes {
  return { name, types: ["std_msgs/msg/String"] };
}

test("waitForStableTopics returns once the count holds for the required hits", async () => {
  const graph = [topic("/cmd_vel"), topic("/odom"), topic("/scan"), topic("/tf")];
  let nowMs = 0;
  let reads = 0;
  const slept: number[] = [];

  const raw = await waitForStableTopics(
    () => {
      reads++;
      return graph;
    },
    {
      deadlineMs: 6000,
      intervalMs: 300,
      minCount: 3,
      requiredHits: 2,
      now: () => nowMs,
      sleep: async (ms) => {
        slept.push(ms);
        nowMs += ms;
      },
    },
  );

  assert.equal(raw.length, 4);
  // First poll sets the baseline, the next two match: two sleeps, then stop.
  assert.deepEqual(slept, [300, 300]);
  assert.equal(reads, 3);
  assert.ok(nowMs < 6000);
});

test("waitForStableTopics keeps polling while the graph is still growing", async () => {
  const phases: TopicNameAndTypes[][] = [
    [topic("/clock"), topic("/tf"), topic("/tf_static")],
    [topic("/clock"), topic("/tf"), topic("/tf_static"), topic("/cmd_vel")],
    [topic("/clock"), topic("/tf"), topic("/tf_static"), topic("/cmd_vel"), topic("/odom")],
    [topic("/clock"), topic("/tf"), topic("/tf_static"), topic("/cmd_vel"), topic("/odom")],
    [topic("/clock"), topic("/tf"), topic("/tf_static"), topic("/cmd_vel"), topic("/odom")],
  ];
  let i = 0;
  let nowMs = 0;

  const raw = await waitForStableTopics(
    () => phases[Math.min(i++, phases.length - 1)]!,
    {
      deadlineMs: 6000,
      intervalMs: 300,
      minCount: 3,
      requiredHits: 2,
      now: () => nowMs,
      sleep: async (ms) => {
        nowMs += ms;
      },
    },
  );

  assert.equal(raw.length, 5);
  assert.ok(i >= 5);
  assert.ok(nowMs < 6000);
});

test("waitForStableTopics returns the last snapshot when the deadline hits first", async () => {
  let nowMs = 0;
  const raw = await waitForStableTopics(() => [topic("/clock")], {
    deadlineMs: 300,
    intervalMs: 300,
    minCount: 3,
    requiredHits: 2,
    now: () => nowMs,
    sleep: async (ms) => {
      nowMs += ms;
    },
  });

  assert.equal(raw.length, 1);
  assert.ok(nowMs >= 300);
});
