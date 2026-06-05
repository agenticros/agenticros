#!/usr/bin/env node
/**
 * Minimal Gemini API check (no ROS, no AgenticROS config).
 *
 *   export GEMINI_API_KEY="your-real-key"
 *   node scripts/smoke-api.mjs
 *
 * Run from packages/agenticros-gemini after: pnpm build
 * (This script resolves @google/genai from the package's node_modules.)
 */
import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
if (!key || key.trim() === "" || key === "YOUR_NEW_KEY_HERE") {
  console.error(
    "Set GEMINI_API_KEY (or GOOGLE_API_KEY) to a real key from https://aistudio.google.com/apikey",
  );
  process.exit(1);
}

const model = (process.env.GEMINI_MODEL ?? "gemini-2.5-flash").trim();
console.error(`[smoke-api] model=${model} (set GEMINI_MODEL to override)`);

const ai = new GoogleGenAI({ apiKey: key });
try {
  const r = await ai.models.generateContent({
    model,
    contents: "Reply with exactly one word: OK",
  });
  console.log("Gemini:", r.text?.trim() ?? "(no text)");
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
    console.error(
      "\nHTTP 429 / quota: free-tier limits for this model may be exhausted. Try:\n" +
        "  • Wait a minute and retry (see Retry-After in the error)\n" +
        "  • export GEMINI_MODEL=gemini-2.0-flash   # or another model your project allows\n" +
        "  • https://ai.google.dev/gemini-api/docs/rate-limits and Google AI Studio billing\n",
    );
  }
  throw e;
}
