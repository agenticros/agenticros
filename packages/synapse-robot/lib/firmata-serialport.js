/**
 * serialport v8-compatible constructor for firmata-io:
 *   new Transport(path, { baudRate, highWaterMark, ... })
 *
 * The old `firmata` meta-package pulled serialport@8, whose NAN bindings are
 * compiled against a single NODE_MODULE_VERSION. After a Node upgrade
 * (v22 → v26) those bindings fail to load, motors-firmata.js exits immediately,
 * and `start motors` still printed success because it never waited.
 *
 * serialport v10+ uses N-API (`@serialport/bindings-cpp`) and survives Node
 * upgrades without a native rebuild.
 */

import { SerialPort } from "serialport";

export function toOpenOptions(path, options) {
  if (path && typeof path === "object" && !Array.isArray(path) && "path" in path) {
    return path;
  }
  const opts = options && typeof options === "object" ? { ...options } : {};
  const baudRate = Number(opts.baudRate) || 57600;
  delete opts.baudRate;
  return { path: String(path), baudRate, ...opts };
}

/** Callable with `new` — firmata-io does `new Transport(port, settings.serialport)`. */
export function FirmataSerialPort(path, options) {
  return new SerialPort(toOpenOptions(path, options));
}

FirmataSerialPort.list = (...args) => SerialPort.list(...args);
