/**
 * Browser input → Hyprland virtual pointer / virtual keyboard.
 *
 * Pointer coordinates are normalized (0–1) against the captured frame.
 * `motion_absolute` takes those in a caller-chosen extent box.
 * Keys use Linux evdev codes (KEY_A = 30). The US keymap is generated from
 * the same table so the virtual keyboard and the lookup cannot drift.
 */

/** @typedef {{ code: string, evdev: number, name: string, base: string, shift?: string, modifier?: number }} KeyDef */

/** XKB modifier masks: Shift, Lock, Control, Mod1 (Alt), Mod4 (Super). */
export const MOD_SHIFT = 0x1;
export const MOD_LOCK = 0x2;
export const MOD_CONTROL = 0x4;
export const MOD_ALT = 0x8;
export const MOD_SUPER = 0x40;

export const BTN_LEFT = 0x110;
export const BTN_RIGHT = 0x111;
export const BTN_MIDDLE = 0x112;

/** One wheel notch, in wl_fixed units (1.0 = 256). */
export const WHEEL_STEP = 10 * 256;

/** @type {KeyDef[]} */
export const US_KEYS = [
  { code: "Escape", evdev: 1, name: "ESC", base: "Escape" },
  { code: "Digit1", evdev: 2, name: "AE01", base: "1", shift: "exclam" },
  { code: "Digit2", evdev: 3, name: "AE02", base: "2", shift: "at" },
  { code: "Digit3", evdev: 4, name: "AE03", base: "3", shift: "numbersign" },
  { code: "Digit4", evdev: 5, name: "AE04", base: "4", shift: "dollar" },
  { code: "Digit5", evdev: 6, name: "AE05", base: "5", shift: "percent" },
  { code: "Digit6", evdev: 7, name: "AE06", base: "6", shift: "asciicircum" },
  { code: "Digit7", evdev: 8, name: "AE07", base: "7", shift: "ampersand" },
  { code: "Digit8", evdev: 9, name: "AE08", base: "8", shift: "asterisk" },
  { code: "Digit9", evdev: 10, name: "AE09", base: "9", shift: "parenleft" },
  { code: "Digit0", evdev: 11, name: "AE10", base: "0", shift: "parenright" },
  { code: "Minus", evdev: 12, name: "AE11", base: "minus", shift: "underscore" },
  { code: "Equal", evdev: 13, name: "AE12", base: "equal", shift: "plus" },
  { code: "Backspace", evdev: 14, name: "BKSP", base: "BackSpace" },
  { code: "Tab", evdev: 15, name: "TAB", base: "Tab" },
  { code: "KeyQ", evdev: 16, name: "AD01", base: "q", shift: "Q" },
  { code: "KeyW", evdev: 17, name: "AD02", base: "w", shift: "W" },
  { code: "KeyE", evdev: 18, name: "AD03", base: "e", shift: "E" },
  { code: "KeyR", evdev: 19, name: "AD04", base: "r", shift: "R" },
  { code: "KeyT", evdev: 20, name: "AD05", base: "t", shift: "T" },
  { code: "KeyY", evdev: 21, name: "AD06", base: "y", shift: "Y" },
  { code: "KeyU", evdev: 22, name: "AD07", base: "u", shift: "U" },
  { code: "KeyI", evdev: 23, name: "AD08", base: "i", shift: "I" },
  { code: "KeyO", evdev: 24, name: "AD09", base: "o", shift: "O" },
  { code: "KeyP", evdev: 25, name: "AD10", base: "p", shift: "P" },
  { code: "BracketLeft", evdev: 26, name: "AD11", base: "bracketleft", shift: "braceleft" },
  { code: "BracketRight", evdev: 27, name: "AD12", base: "bracketright", shift: "braceright" },
  { code: "Enter", evdev: 28, name: "RTRN", base: "Return" },
  { code: "ControlLeft", evdev: 29, name: "LCTL", base: "Control_L", modifier: MOD_CONTROL },
  { code: "KeyA", evdev: 30, name: "AC01", base: "a", shift: "A" },
  { code: "KeyS", evdev: 31, name: "AC02", base: "s", shift: "S" },
  { code: "KeyD", evdev: 32, name: "AC03", base: "d", shift: "D" },
  { code: "KeyF", evdev: 33, name: "AC04", base: "f", shift: "F" },
  { code: "KeyG", evdev: 34, name: "AC05", base: "g", shift: "G" },
  { code: "KeyH", evdev: 35, name: "AC06", base: "h", shift: "H" },
  { code: "KeyJ", evdev: 36, name: "AC07", base: "j", shift: "J" },
  { code: "KeyK", evdev: 37, name: "AC08", base: "k", shift: "K" },
  { code: "KeyL", evdev: 38, name: "AC09", base: "l", shift: "L" },
  { code: "Semicolon", evdev: 39, name: "AC10", base: "semicolon", shift: "colon" },
  { code: "Quote", evdev: 40, name: "AC11", base: "apostrophe", shift: "quotedbl" },
  { code: "Backquote", evdev: 41, name: "TLDE", base: "grave", shift: "asciitilde" },
  { code: "ShiftLeft", evdev: 42, name: "LFSH", base: "Shift_L", modifier: MOD_SHIFT },
  { code: "Backslash", evdev: 43, name: "BKSL", base: "backslash", shift: "bar" },
  { code: "KeyZ", evdev: 44, name: "AB01", base: "z", shift: "Z" },
  { code: "KeyX", evdev: 45, name: "AB02", base: "x", shift: "X" },
  { code: "KeyC", evdev: 46, name: "AB03", base: "c", shift: "C" },
  { code: "KeyV", evdev: 47, name: "AB04", base: "v", shift: "V" },
  { code: "KeyB", evdev: 48, name: "AB05", base: "b", shift: "B" },
  { code: "KeyN", evdev: 49, name: "AB06", base: "n", shift: "N" },
  { code: "KeyM", evdev: 50, name: "AB07", base: "m", shift: "M" },
  { code: "Comma", evdev: 51, name: "AB08", base: "comma", shift: "less" },
  { code: "Period", evdev: 52, name: "AB09", base: "period", shift: "greater" },
  { code: "Slash", evdev: 53, name: "AB10", base: "slash", shift: "question" },
  { code: "ShiftRight", evdev: 54, name: "RTSH", base: "Shift_R", modifier: MOD_SHIFT },
  { code: "AltLeft", evdev: 56, name: "LALT", base: "Alt_L", modifier: MOD_ALT },
  { code: "Space", evdev: 57, name: "SPCE", base: "space" },
  { code: "CapsLock", evdev: 58, name: "CAPS", base: "Caps_Lock" },
  { code: "F1", evdev: 59, name: "FK01", base: "F1" },
  { code: "F2", evdev: 60, name: "FK02", base: "F2" },
  { code: "F3", evdev: 61, name: "FK03", base: "F3" },
  { code: "F4", evdev: 62, name: "FK04", base: "F4" },
  { code: "F5", evdev: 63, name: "FK05", base: "F5" },
  { code: "F6", evdev: 64, name: "FK06", base: "F6" },
  { code: "F7", evdev: 65, name: "FK07", base: "F7" },
  { code: "F8", evdev: 66, name: "FK08", base: "F8" },
  { code: "F9", evdev: 67, name: "FK09", base: "F9" },
  { code: "F10", evdev: 68, name: "FK10", base: "F10" },
  { code: "F11", evdev: 87, name: "FK11", base: "F11" },
  { code: "F12", evdev: 88, name: "FK12", base: "F12" },
  { code: "ControlRight", evdev: 97, name: "RCTL", base: "Control_R", modifier: MOD_CONTROL },
  { code: "AltRight", evdev: 100, name: "RALT", base: "Alt_R", modifier: MOD_ALT },
  { code: "Home", evdev: 102, name: "HOME", base: "Home" },
  { code: "ArrowUp", evdev: 103, name: "UP", base: "Up" },
  { code: "PageUp", evdev: 104, name: "PGUP", base: "Prior" },
  { code: "ArrowLeft", evdev: 105, name: "LEFT", base: "Left" },
  { code: "ArrowRight", evdev: 106, name: "RGHT", base: "Right" },
  { code: "End", evdev: 107, name: "END", base: "End" },
  { code: "ArrowDown", evdev: 108, name: "DOWN", base: "Down" },
  { code: "PageDown", evdev: 109, name: "PGDN", base: "Next" },
  { code: "Insert", evdev: 110, name: "INS", base: "Insert" },
  { code: "Delete", evdev: 111, name: "DELE", base: "Delete" },
  { code: "MetaLeft", evdev: 125, name: "LWIN", base: "Super_L", modifier: MOD_SUPER },
  { code: "OSLeft", evdev: 125, name: "LWIN", base: "Super_L", modifier: MOD_SUPER },
  { code: "MetaRight", evdev: 126, name: "RWIN", base: "Super_R", modifier: MOD_SUPER },
  { code: "OSRight", evdev: 126, name: "RWIN", base: "Super_R", modifier: MOD_SUPER },
];

const BY_CODE = new Map(US_KEYS.map((key) => [key.code, key]));

/**
 * @param {string} code DOM KeyboardEvent.code
 * @returns {number | null} Linux evdev keycode
 */
export function domCodeToEvdev(code) {
  const key = BY_CODE.get(code);
  return key ? key.evdev : null;
}

/**
 * @param {number} evdev
 * @returns {number} depressed modifier mask, or 0
 */
export function evdevModifierBit(evdev) {
  const key = US_KEYS.find((item) => item.evdev === evdev && item.modifier);
  return key?.modifier ?? 0;
}

/**
 * @param {Iterable<number>} depressedEvdev
 */
export function modifierMask(depressedEvdev) {
  let mask = 0;
  for (const evdev of depressedEvdev) mask |= evdevModifierBit(evdev);
  return mask;
}

/**
 * XKB keymap text (format 1) for the virtual keyboard.
 * Keycodes are evdev + 8, which is what xkbcommon expects.
 */
export function buildUsKeymap() {
  const seen = new Set();
  const keys = [];
  for (const key of US_KEYS) {
    if (seen.has(key.evdev)) continue;
    seen.add(key.evdev);
    keys.push(key);
  }
  const keycodes = keys
    .map((key) => `    <${key.name}> = ${key.evdev + 8};`)
    .join("\n");
  const symbols = keys
    .map((key) => {
      const levels = key.shift ? `[ ${key.base}, ${key.shift} ]` : `[ ${key.base} ]`;
      const type = key.shift ? 'type="TWO_LEVEL", ' : "";
      return `    key <${key.name}> { ${type}symbols${levels} };`;
    })
    .join("\n");
  const maps = [
    ["Shift", ["LFSH", "RTSH"]],
    ["Lock", ["CAPS"]],
    ["Control", ["LCTL", "RCTL"]],
    ["Mod1", ["LALT", "RALT"]],
    ["Mod4", ["LWIN", "RWIN"]],
  ]
    .map(([name, members]) => `    modifier_map ${name} { ${members.map((m) => `<${m}>`).join(", ")} };`)
    .join("\n");

  return `xkb_keymap {
xkb_keycodes "(agenticros)" {
    minimum = 8;
    maximum = 255;
${keycodes}
};
xkb_types "(agenticros)" {
    type "ONE_LEVEL" {
        modifiers = none;
        level_name[Level1] = "Any";
    };
    type "TWO_LEVEL" {
        modifiers = Shift;
        map[Shift] = Level2;
        level_name[Level1] = "Base";
        level_name[Level2] = "Shift";
    };
};
xkb_compatibility "(agenticros)" {
};
xkb_symbols "(agenticros)" {
    name[Group1] = "English (US)";
${symbols}
${maps}
};
};
`;
}

export function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Normalized pointer position → zwlr_virtual_pointer_v1.motion_absolute.
 * Coordinates are inside [0, extent).
 *
 * @param {number} xNorm
 * @param {number} yNorm
 * @param {number} width
 * @param {number} height
 */
export function pointerToAbsolute(xNorm, yNorm, width, height) {
  const xExtent = Math.max(1, Math.floor(Number(width) || 1));
  const yExtent = Math.max(1, Math.floor(Number(height) || 1));
  const x = Math.min(xExtent - 1, Math.round(clamp01(xNorm) * (xExtent - 1)));
  const y = Math.min(yExtent - 1, Math.round(clamp01(yNorm) * (yExtent - 1)));
  return { x, y, xExtent, yExtent };
}

/**
 * @param {number} button DOM MouseEvent.button
 */
export function browserButtonToEvdev(button) {
  if (button === 2) return BTN_RIGHT;
  if (button === 1) return BTN_MIDDLE;
  return BTN_LEFT;
}

/**
 * Wheel deltas → virtual pointer axis values in wl_fixed.
 * Positive dy scrolls down (axis 0). Positive dx scrolls right (axis 1).
 *
 * @param {number} dx
 * @param {number} dy
 * @returns {{ axis: number, value: number }[]}
 */
export function wheelToAxes(dx, dy) {
  const axes = [];
  if (Number.isFinite(dy) && dy !== 0) {
    axes.push({ axis: 0, value: Math.sign(dy) * WHEEL_STEP });
  }
  if (Number.isFinite(dx) && dx !== 0) {
    axes.push({ axis: 1, value: Math.sign(dx) * WHEEL_STEP });
  }
  return axes;
}

/**
 * @param {unknown} raw data-channel payload
 * @returns {object | null}
 */
export function parseInputMessage(raw) {
  let msg = raw;
  if (Buffer.isBuffer(raw) || raw instanceof Uint8Array) {
    try {
      msg = JSON.parse(Buffer.from(raw).toString("utf8"));
    } catch {
      return null;
    }
  } else if (typeof raw === "string") {
    try {
      msg = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!msg || typeof msg !== "object") return null;
  if (msg.type === "pointer") {
    const action = msg.action;
    if (action !== "move" && action !== "down" && action !== "up" && action !== "wheel") return null;
    return {
      type: "pointer",
      action,
      x: Number(msg.x),
      y: Number(msg.y),
      button: Number(msg.button ?? 0),
      dx: Number(msg.dx ?? 0),
      dy: Number(msg.dy ?? 0),
    };
  }
  if (msg.type === "key") {
    if (msg.action !== "down" && msg.action !== "up") return null;
    if (typeof msg.code !== "string" || !msg.code) return null;
    return { type: "key", action: msg.action, code: msg.code };
  }
  return null;
}
