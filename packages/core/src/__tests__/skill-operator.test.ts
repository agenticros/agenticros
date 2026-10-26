import { test } from "node:test";
import assert from "node:assert/strict";

import { fetchMarketplaceSkills } from "../discoverable-capabilities.js";
import { installConfirmDecision } from "../skill-operator.js";

test("a named capability is requested without the popular sort", async () => {
  const seen: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    seen.push(String(input));
    return new Response(JSON.stringify({ skills: [] }), { status: 200 });
  }) as typeof fetch;
  try {
    await fetchMarketplaceSkills({ capability: "navigate_to" });
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(seen.length, 1);
  assert.match(seen[0]!, /capability=navigate_to/);
  assert.doesNotMatch(seen[0]!, /sort=popular/);
});

test("install confirmation refuses a non-interactive caller", () => {
  assert.equal(
    installConfirmDecision({ grant: false, helperAvailable: false, tty: false }),
    "refuse",
  );
  assert.equal(
    installConfirmDecision({ grant: true, helperAvailable: false, tty: false }),
    "proceed",
  );
  assert.equal(
    installConfirmDecision({ grant: false, helperAvailable: true, tty: true }),
    "ask-helper",
  );
  assert.equal(
    installConfirmDecision({ grant: false, helperAvailable: false, tty: true }),
    "ask-tty",
  );
});
