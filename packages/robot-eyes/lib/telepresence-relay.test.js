import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { areSoundsPaused, setSoundsPaused } from "./sounds.js";
import { createTelepresenceHub } from "./telepresence-relay.js";

function fakeClient() {
  const sent = [];
  return {
    readyState: 1,
    sent,
    send(data) {
      sent.push(JSON.parse(data));
    },
  };
}

describe("telepresence relay", () => {
  it("forwards an agent offer to the kiosk and not back to the agent", () => {
    const hub = createTelepresenceHub();
    const agent = fakeClient();
    const kiosk = fakeClient();
    hub.addClient(agent);
    hub.addClient(kiosk);

    hub.handleMessage(agent, { type: "hello", role: "agent" });
    hub.handleMessage(agent, {
      type: "telepresence",
      signal: "offer",
      sdp: "v=0",
    });

    assert.equal(agent.sent.length, 0);
    assert.equal(kiosk.sent.length, 1);
    assert.equal(kiosk.sent[0].signal, "offer");
    assert.equal(kiosk.sent[0].sdp, "v=0");
  });

  it("tells the agent when no kiosk is connected", () => {
    const hub = createTelepresenceHub();
    const agent = fakeClient();
    hub.addClient(agent);
    hub.handleMessage(agent, { type: "hello", role: "agent" });
    hub.handleMessage(agent, { type: "telepresence", signal: "offer", sdp: "v=0" });
    assert.deepEqual(agent.sent, [
      { type: "telepresence", signal: "unavailable", reason: "no-kiosk" },
    ]);
  });

  it("returns a kiosk answer only to the agent", () => {
    const hub = createTelepresenceHub();
    const agent = fakeClient();
    const kiosk = fakeClient();
    const other = fakeClient();
    hub.addClient(agent);
    hub.addClient(kiosk);
    hub.addClient(other);
    hub.handleMessage(agent, { type: "hello", role: "agent" });

    hub.handleMessage(kiosk, {
      type: "telepresence",
      signal: "answer",
      sdp: "v=answer",
    });

    assert.deepEqual(agent.sent, [
      { type: "telepresence", signal: "answer", sdp: "v=answer" },
    ]);
    assert.equal(kiosk.sent.length, 0);
    assert.equal(other.sent.length, 0);
  });

  it("pauses sounds while a call is active and resumes on hangup", () => {
    setSoundsPaused(false);
    const hub = createTelepresenceHub({
      onCallActive: (active) => setSoundsPaused(active),
    });
    const agent = fakeClient();
    const kiosk = fakeClient();
    hub.addClient(agent);
    hub.addClient(kiosk);
    hub.handleMessage(agent, { type: "hello", role: "agent" });

    hub.handleMessage(kiosk, { type: "call", active: true });
    assert.equal(areSoundsPaused(), true);
    assert.equal(hub.callActive, true);

    hub.handleMessage(kiosk, { type: "call", active: false });
    assert.equal(areSoundsPaused(), false);
    assert.equal(hub.callActive, false);
  });

  it("tells kiosks the call ended when the agent disconnects", () => {
    const hub = createTelepresenceHub({
      onCallActive: (active) => setSoundsPaused(active),
    });
    const agent = fakeClient();
    const kiosk = fakeClient();
    hub.addClient(kiosk);
    hub.addClient(agent);
    hub.handleMessage(agent, { type: "hello", role: "agent" });
    hub.handleMessage(kiosk, { type: "call", active: true });
    kiosk.sent.length = 0;

    hub.removeClient(agent);

    assert.equal(areSoundsPaused(), false);
    assert.deepEqual(kiosk.sent, [{ type: "telepresence", signal: "end" }]);
  });
});
