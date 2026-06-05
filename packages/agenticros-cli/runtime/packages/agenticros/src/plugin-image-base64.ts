/**
 * Normalize base64 for OpenClaw tool image blocks.
 * OpenClaw's sanitizeToolResultImages uses canonicalizeBase64(); strings must be
 * strict base64 (no whitespace) with length multiple of 4, or the image is dropped
 * and the UI/model may see broken data URLs.
 *
 * Logic aligned with openclaw/src/media/base64.ts canonicalizeBase64.
 */

function isBase64DataChar(code: number): boolean {
  return (
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a) ||
    (code >= 0x30 && code <= 0x39) ||
    code === 0x2b ||
    code === 0x2f
  );
}

function canonicalizeBase64Strict(base64: string): string | undefined {
  let cleaned = "";
  let padding = 0;
  let sawPadding = false;
  for (let i = 0; i < base64.length; i += 1) {
    const code = base64.charCodeAt(i);
    if (code <= 0x20) {
      continue;
    }
    if (code === 0x3d) {
      padding += 1;
      if (padding > 2) {
        return undefined;
      }
      sawPadding = true;
      cleaned += "=";
      continue;
    }
    if (sawPadding || !isBase64DataChar(code)) {
      return undefined;
    }
    cleaned += base64[i]!;
  }
  if (!cleaned || cleaned.length % 4 !== 0) {
    return undefined;
  }
  return cleaned;
}

/**
 * Strip optional data-URL prefix, remove whitespace, validate, then round-trip through Buffer
 * so the payload is canonical base64 OpenClaw accepts.
 */
export function normalizePluginToolImageBase64(input: string): string | undefined {
  let s = input.trim();
  const dataUrl = /^data:[^;]+;base64,(.*)$/is.exec(s);
  if (dataUrl) {
    s = (dataUrl[1] ?? "").trim();
  }
  s = s.replace(/\s/g, "");
  const canonical = canonicalizeBase64Strict(s);
  if (!canonical) {
    return undefined;
  }
  const buf = Buffer.from(canonical, "base64");
  if (buf.length === 0) {
    return undefined;
  }
  return buf.toString("base64");
}
