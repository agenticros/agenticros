import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseTransportShorthand,
  parseTransportJson,
} from "../util/transport-shorthand.js";

describe("parseTransportShorthand", () => {
  it("zenoh: mode-only inherits everything from global config", () => {
    assert.deepEqual(parseTransportShorthand("zenoh"), { mode: "zenoh" });
  });

  it("zenoh:<url> overrides only the router endpoint", () => {
    assert.deepEqual(parseTransportShorthand("zenoh:ws://farm:10000"), {
      mode: "zenoh",
      zenoh: { routerEndpoint: "ws://farm:10000" },
    });
  });

  it("rosbridge:<url> overrides only the websocket url", () => {
    assert.deepEqual(parseTransportShorthand("rosbridge:ws://10.0.0.5:9090"), {
      mode: "rosbridge",
      rosbridge: { url: "ws://10.0.0.5:9090" },
    });
  });

  it("local mode-only inherits domainId from global config", () => {
    assert.deepEqual(parseTransportShorthand("local"), { mode: "local" });
  });

  it("local:<n> overrides domainId (integer)", () => {
    assert.deepEqual(parseTransportShorthand("local:7"), {
      mode: "local",
      local: { domainId: 7 },
    });
  });

  it("local:0 is accepted (non-negative integer)", () => {
    assert.deepEqual(parseTransportShorthand("local:0"), {
      mode: "local",
      local: { domainId: 0 },
    });
  });

  it("local:<non-integer> is rejected with an actionable message", () => {
    assert.throws(() => parseTransportShorthand("local:abc"), /non-negative integer/);
    assert.throws(() => parseTransportShorthand("local:1.5"), /non-negative integer/);
    assert.throws(() => parseTransportShorthand("local:-1"), /non-negative integer/);
  });

  it("webrtc:<signalingUrl> overrides only the signaling url", () => {
    assert.deepEqual(parseTransportShorthand("webrtc:wss://sig.example/signal"), {
      mode: "webrtc",
      webrtc: { signalingUrl: "wss://sig.example/signal" },
    });
  });

  it("unknown mode is rejected and the message lists accepted modes", () => {
    assert.throws(() => parseTransportShorthand("bogus"), /Accepted:/);
    assert.throws(() => parseTransportShorthand("bogus:value"), /Accepted:/);
  });

  it("empty input is rejected with usage hint", () => {
    assert.throws(() => parseTransportShorthand(""), /requires a value/);
    assert.throws(() => parseTransportShorthand("   "), /requires a value/);
  });

  it("mode is case-insensitive but value is preserved verbatim", () => {
    assert.deepEqual(parseTransportShorthand("ZENOH:ws://Foo:10000"), {
      mode: "zenoh",
      zenoh: { routerEndpoint: "ws://Foo:10000" },
    });
  });

  it("URLs containing colons are preserved (only first colon splits mode)", () => {
    assert.deepEqual(parseTransportShorthand("zenoh:ws://farm:10000"), {
      mode: "zenoh",
      zenoh: { routerEndpoint: "ws://farm:10000" },
    });
  });
});

describe("parseTransportJson", () => {
  it("accepts a well-formed override object", () => {
    const out = parseTransportJson(
      JSON.stringify({ mode: "zenoh", zenoh: { routerEndpoint: "ws://farm:10000" } }),
    );
    assert.deepEqual(out, {
      mode: "zenoh",
      zenoh: { routerEndpoint: "ws://farm:10000" },
    });
  });

  it("rejects invalid JSON with a helpful message", () => {
    assert.throws(() => parseTransportJson("{not json"), /invalid JSON/);
  });

  it("rejects non-object JSON (array, number, string)", () => {
    assert.throws(() => parseTransportJson("[]"), /must be a JSON object/);
    assert.throws(() => parseTransportJson("42"), /must be a JSON object/);
    assert.throws(() => parseTransportJson("\"zenoh\""), /must be a JSON object/);
  });

  it("rejects JSON missing or with invalid mode", () => {
    assert.throws(() => parseTransportJson("{}"), /missing or invalid "mode"/);
    assert.throws(
      () => parseTransportJson(JSON.stringify({ mode: "bogus" })),
      /missing or invalid "mode"/,
    );
  });
});
