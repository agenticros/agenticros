/**
 * Node wrapper around system-installed JETGPIO (libjetgpio.so) via koffi.
 * BOARD pin numbering (40-pin header). Software PWM for arbitrary pins.
 *
 * Install JETGPIO first: https://github.com/Rubberazer/JETGPIO
 * Prefer standalone v1.2 if you want to avoid the Jetclocks kernel module.
 * koffi is an optionalDependency (Jetson -b jetson only).
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const JET_INPUT = 0;
const JET_OUTPUT = 1;

const LIB_CANDIDATES = [
  'libjetgpio.so',
  '/usr/local/lib/libjetgpio.so',
  '/usr/lib/libjetgpio.so',
  '/usr/lib/aarch64-linux-gnu/libjetgpio.so'
];

let koffi = null;
let lib = null;
let gpioInitialise;
let gpioTerminate;
let gpioSetMode;
let gpioWrite;
let initialized = false;
const pwmTimers = new Map();

function loadKoffi() {
  if (koffi) return koffi;
  try {
    koffi = require('koffi');
  } catch (err) {
    throw new Error(
      'Optional package "koffi" is not installed. It is required for robotics start motors -b jetson. ' +
      'On this Jetson, reinstall robotics (koffi is an optionalDependency) or: npm install koffi. ' +
      `Detail: ${err.message}`
    );
  }
  return koffi;
}

function loadLibrary() {
  if (lib) return lib;

  const ffi = loadKoffi();
  let lastError;
  for (const path of LIB_CANDIDATES) {
    try {
      lib = ffi.load(path);
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!lib) {
    throw new Error(
      'JETGPIO library (libjetgpio.so) not found. Install from https://github.com/Rubberazer/JETGPIO ' +
      '(standalone release v1.2 recommended to avoid Jetclocks). Then run: sudo make && sudo make install. ' +
      `Last load error: ${lastError ? lastError.message : 'unknown'}`
    );
  }

  gpioInitialise = lib.func('int gpioInitialise(void)');
  gpioTerminate = lib.func('void gpioTerminate(void)');
  gpioSetMode = lib.func('int gpioSetMode(unsigned gpio, unsigned mode)');
  gpioWrite = lib.func('int gpioWrite(unsigned gpio, unsigned level)');

  return lib;
}

export function init() {
  if (initialized) return;
  loadLibrary();
  const rc = gpioInitialise();
  if (rc < 0) {
    throw new Error(
      `gpioInitialise failed (${rc}). JETGPIO often needs root or /dev/mem access. ` +
      'Try: sudo node motors-jetson.js ...'
    );
  }
  initialized = true;
}

export function deinit() {
  stopAll();
  if (initialized && gpioTerminate) {
    gpioTerminate();
    initialized = false;
  }
}

export function initOutput(boardPin) {
  ensureInit();
  const pin = Number(boardPin);
  const rc = gpioSetMode(pin, JET_OUTPUT);
  if (rc < 0) {
    throw new Error(`gpioSetMode(${pin}, OUTPUT) failed (${rc})`);
  }
  gpioWrite(pin, 0);
}

export function write(boardPin, level) {
  ensureInit();
  const pin = Number(boardPin);
  const rc = gpioWrite(pin, level ? 1 : 0);
  if (rc < 0) {
    throw new Error(`gpioWrite(${pin}, ${level ? 1 : 0}) failed (${rc})`);
  }
}

/**
 * Software PWM on a BOARD pin (JETGPIO hardware PWM is only on a few pins).
 * @param {number|string} boardPin
 * @param {number} frequencyHz e.g. 200
 * @param {number} dutyPercent 0-100 (matches @iiot2k/gpiox pwm_gpio duty style)
 */
export function pwm(boardPin, frequencyHz, dutyPercent) {
  ensureInit();
  const pin = Number(boardPin);
  const freq = Math.max(1, Number(frequencyHz) || 200);
  let duty = Number(dutyPercent);
  if (!Number.isFinite(duty)) duty = 0;
  duty = Math.max(0, Math.min(100, duty));

  stopPwm(pin);

  if (duty <= 0) {
    write(pin, 0);
    return;
  }
  if (duty >= 100) {
    write(pin, 1);
    return;
  }

  const periodMs = 1000 / freq;
  const onMs = periodMs * (duty / 100);
  const offMs = periodMs - onMs;
  const state = { timeout: null, stopped: false };
  pwmTimers.set(pin, state);

  const cycle = () => {
    if (state.stopped) return;
    write(pin, 1);
    state.timeout = setTimeout(() => {
      if (state.stopped) return;
      write(pin, 0);
      state.timeout = setTimeout(cycle, offMs);
    }, onMs);
  };
  cycle();
}

export function stopPwm(boardPin) {
  const pin = Number(boardPin);
  const state = pwmTimers.get(pin);
  if (state) {
    state.stopped = true;
    if (state.timeout) clearTimeout(state.timeout);
    pwmTimers.delete(pin);
  }
  if (initialized) {
    try {
      write(pin, 0);
    } catch {
      // ignore if library already torn down
    }
  }
}

export function stopAll() {
  for (const pin of [...pwmTimers.keys()]) {
    stopPwm(pin);
  }
}

function ensureInit() {
  if (!initialized) {
    init();
  }
}

export const MODES = { INPUT: JET_INPUT, OUTPUT: JET_OUTPUT };
