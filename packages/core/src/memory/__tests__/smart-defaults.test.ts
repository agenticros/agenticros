/**
 * Unit tests for the mem0 embedder auto-detection.
 * Covers all three branches (Ollama / OpenAI / error) by injecting fetch and env.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { detectEmbedder } from "../mem0/provider.js";

test("smart-defaults: picks Ollama when 11434 responds OK", async () => {
  const fetchImpl: any = async () => ({ ok: true });
  const result = await detectEmbedder({
    fetchImpl,
    hasOpenAIKey: true, // even with OpenAI present, Ollama wins
  });
  assert.equal(result.provider, "ollama");
  assert.equal((result.config as any).model, "nomic-embed-text");
});

test("smart-defaults: falls through to OpenAI when Ollama unreachable", async () => {
  const fetchImpl: any = async () => {
    throw new Error("ECONNREFUSED");
  };
  const result = await detectEmbedder({
    fetchImpl,
    hasOpenAIKey: true,
  });
  assert.equal(result.provider, "openai");
  assert.equal((result.config as any).model, "text-embedding-3-small");
});

test("smart-defaults: throws actionable error when no embedder available", async () => {
  const fetchImpl: any = async () => {
    throw new Error("ECONNREFUSED");
  };
  await assert.rejects(
    () => detectEmbedder({ fetchImpl, hasOpenAIKey: false }),
    /needs an embedder/i,
  );
});

test("smart-defaults: Ollama HTTP error (non-OK) falls through to OpenAI", async () => {
  const fetchImpl: any = async () => ({ ok: false });
  const result = await detectEmbedder({ fetchImpl, hasOpenAIKey: true });
  assert.equal(result.provider, "openai");
});
