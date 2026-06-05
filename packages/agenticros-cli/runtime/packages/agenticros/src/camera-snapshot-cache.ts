import { randomBytes } from "node:crypto";

type Entry = { body: Buffer; mimeType: string; at: number };

const TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 64;
const MAX_BYTES = 12 * 1024 * 1024;

const cache = new Map<string, Entry>();

function prune(): void {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now - v.at > TTL_MS) {
      cache.delete(k);
    }
  }
  while (cache.size > MAX_ENTRIES) {
    let oldestKey: string | undefined;
    let oldestAt = Infinity;
    for (const [k, v] of cache) {
      if (v.at < oldestAt) {
        oldestAt = v.at;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      cache.delete(oldestKey);
    } else {
      break;
    }
  }
}

/**
 * Store one frame for GET /camera/snapshot?id=… (chat UI same as teleop: raw bytes, not data URLs).
 */
export function storeCameraSnapshot(body: Buffer, mimeType: string): string {
  prune();
  if (body.length > MAX_BYTES) {
    throw new Error(`Snapshot exceeds ${MAX_BYTES} bytes`);
  }
  const id = randomBytes(16).toString("hex");
  cache.set(id, { body, mimeType: mimeType.trim() || "image/jpeg", at: Date.now() });
  return id;
}

export function getCameraSnapshot(id: string): Entry | undefined {
  prune();
  const e = cache.get(id);
  if (!e) {
    return undefined;
  }
  if (Date.now() - e.at > TTL_MS) {
    cache.delete(id);
    return undefined;
  }
  return e;
}
