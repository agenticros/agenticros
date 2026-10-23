import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildGstArgs } from "./capture.js";
import { parseBusctlScreenCast, portalRequestPath, portalSessionPath, streamFromResults } from "./portal.js";
import { waylandSessionError, waylandSocketPath } from "./session.js";
import { encodeMotionAbsolute, parseGlobal, parseMessages } from "./wayland.js";

describe("session", () => {
  it("requires a Wayland session and socket", () => {
    assert.match(
      waylandSessionError({ XDG_SESSION_TYPE: "tty", WAYLAND_DISPLAY: "" }),
      /Wayland session/,
    );
    assert.equal(
      waylandSessionError({ XDG_SESSION_TYPE: "wayland", WAYLAND_DISPLAY: "wayland-1" }),
      null,
    );
    assert.equal(
      waylandSocketPath({ XDG_RUNTIME_DIR: "/run/user/1000", WAYLAND_DISPLAY: "wayland-1" }),
      "/run/user/1000/wayland-1",
    );
  });
});

describe("portal paths", () => {
  it("builds the request path the portal emits on", () => {
    assert.equal(
      portalRequestPath(":1.42", "agenticrosabc"),
      "/org/freedesktop/portal/desktop/request/1_42/agenticrosabc",
    );
    assert.equal(
      portalSessionPath(":1.42", "sessiontoken"),
      "/org/freedesktop/portal/desktop/session/1_42/sessiontoken",
    );
  });

  it("reads a busctl ScreenCast response without dbus-next", () => {
    const partial = `Member=Response\nMESSAGE "ua{sv}" {\nUINT32 0;\nSTRING "streams";\n`;
    assert.equal(parseBusctlScreenCast(partial), null);
    const text = `
      Path=/org/freedesktop/portal/desktop/request/1_186/agenticrosdc21b289
      Interface=org.freedesktop.portal.Request  Member=Response
      MESSAGE "ua{sv}" {
        UINT32 0;
        STRING "streams";
        VARIANT "a(ua{sv})" {
          UINT32 75;
          STRING "size";
          VARIANT "(ii)" {
            INT32 1920;
            INT32 1080;
          };
        };
        STRING "restore_token";
        VARIANT "s" {
          STRING "saved-token";
        };
      };
    `;
    assert.deepEqual(parseBusctlScreenCast(text), {
      nodeId: 75,
      width: 1920,
      height: 1080,
      restoreToken: "saved-token",
    });
    assert.deepEqual(parseBusctlScreenCast(`Member=Response\nUINT32 2;\n`), { denied: 2 });
  });

  it("reads the PipeWire node id out of Start results", () => {
    const stream = streamFromResults({
      streams: { value: [[42, { size: { value: [1920, 1080] } }]] },
      restore_token: { value: "tok" },
    });
    assert.deepEqual(stream, {
      nodeId: 42,
      width: 1920,
      height: 1080,
      restoreToken: "tok",
    });
  });
});

describe("gstreamer pipeline", () => {
  it("captures a portal fd with x264 and a test pattern without one", () => {
    const live = buildGstArgs({
      fd: 3,
      nodeId: 42,
      width: 1280,
      height: 720,
      fps: 15,
      encoder: "x264enc",
    });
    assert.match(live[1], /pipewiresrc fd=3 path=42/);
    assert.match(live[1], /x264enc tune=zerolatency/);
    assert.match(live[1], /width=1280,height=720,framerate=15\/1/);
    assert.match(live[1], /fdsink fd=1/);

    const pattern = buildGstArgs({
      testPattern: true,
      width: 640,
      height: 360,
      fps: 10,
      encoder: "vah264enc",
    });
    assert.match(pattern[1], /videotestsrc/);
    assert.match(pattern[1], /vah264enc/);
    assert.doesNotMatch(pattern[1], /pipewiresrc/);
  });
});

describe("wayland motion_absolute", () => {
  it("encodes the absolute pointer request and parses a global event", () => {
    const msg = encodeMotionAbsolute(7, {
      time: 5,
      x: 10,
      y: 20,
      xExtent: 1280,
      yExtent: 720,
    });
    assert.equal(msg.readUInt32LE(0), 7);
    const sizeOpcode = msg.readUInt32LE(4);
    assert.equal(sizeOpcode & 0xffff, 1);
    assert.equal(sizeOpcode >>> 16, msg.length);
    assert.equal(msg.readUInt32LE(8), 5);
    assert.equal(msg.readUInt32LE(12), 10);
    assert.equal(msg.readUInt32LE(16), 20);
    assert.equal(msg.readUInt32LE(20), 1280);
    assert.equal(msg.readUInt32LE(24), 720);

    const { events, rest } = parseMessages(msg);
    assert.equal(events.length, 1);
    assert.equal(rest.length, 0);

    const name = Buffer.alloc(4);
    name.writeUInt32LE(9, 0);
    const iface = Buffer.from("wl_seat\0");
    const pad = Buffer.alloc((4 - (iface.length % 4)) % 4);
    const len = Buffer.alloc(4);
    len.writeUInt32LE(iface.length, 0);
    const version = Buffer.alloc(4);
    version.writeUInt32LE(3, 0);
    const payload = Buffer.concat([name, len, iface, pad, version]);
    assert.deepEqual(parseGlobal(payload), {
      name: 9,
      interfaceName: "wl_seat",
      version: 3,
    });
  });
});
