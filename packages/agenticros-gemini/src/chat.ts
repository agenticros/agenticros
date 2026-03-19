/**
 * Gemini chat loop: generateContent with ROS2 tools, handle function calls, return final text.
 */

import type { Content } from "@google/genai";
import {
  createPartFromBase64,
  createPartFromFunctionResponse,
  createPartFromText,
  createUserContent,
} from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import type { AgenticROSConfig } from "@agenticros/core";
import { GEMINI_TOOLS } from "./tools.js";
import { executeTool } from "./tools.js";

/** Override with env GEMINI_MODEL (e.g. gemini-2.5-flash, gemini-2.0-flash). */
const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_TURNS = 20;

function resolveModel(explicit?: string): string {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  return explicit ?? (fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_MODEL);
}

export interface ChatOptions {
  apiKey?: string;
  model?: string;
  systemInstruction?: string;
}

/**
 * Run a single user message through Gemini with ROS2 tools. Repeats until the model
 * returns a final text response (no more function calls) or MAX_TURNS is reached.
 */
export async function chatWithRobot(
  userMessage: string,
  config: AgenticROSConfig,
  options: ChatOptions = {},
): Promise<string> {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("Gemini API key required. Set GEMINI_API_KEY or GOOGLE_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = resolveModel(options.model);

  const generateConfig = {
    tools: GEMINI_TOOLS,
    systemInstruction: options.systemInstruction ?? "You are a helpful assistant controlling a ROS2 robot. Use the provided tools to list topics, publish commands, read sensor data, call services, send action goals, get/set parameters, capture camera images, and read depth distance. Be concise and safe with velocity commands.",
  };

  let contents: Content[] = [createUserContent(userMessage)];
  let turns = 0;
  let lastToolOutputs: string[] = [];

  while (turns < MAX_TURNS) {
    turns++;
    let response;
    try {
      response = await ai.models.generateContent({
        model,
        contents,
        config: generateConfig,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        (message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.toLowerCase().includes("quota")) &&
        lastToolOutputs.length > 0
      ) {
        return (
          `${lastToolOutputs.join("\n")}\n\n` +
          "(Gemini quota hit while composing final response. Returning latest tool output directly.)"
        );
      }
      throw err;
    }

    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      const text = response.text?.trim();
      return text ?? "(No text response from model.)";
    }

    // Build model turn (so we can send it back in history). Use candidate content if available.
    const modelContent: Content = response.candidates?.[0]?.content ?? {
      role: "model",
      parts: functionCalls.map((fc) => ({ functionCall: { name: fc.name, args: fc.args ?? {}, id: fc.id } })),
    };

    // Execute each function call and build function response parts.
    const responseParts = [];
    lastToolOutputs = [];
    const additionalUserContents: Content[] = [];
    for (const fc of functionCalls) {
      const name = fc.name ?? "unknown";
      const args = (fc.args ?? {}) as Record<string, unknown>;
      const id = fc.id ?? `call_${turns}_${name}`;
      if (process.stderr?.write) {
        process.stderr.write(`[AgenticROS] Tool: ${name}(${JSON.stringify(args)})\n`);
      }
      let output: string;
      let parts: import("@google/genai").FunctionResponsePart[] | undefined;
      try {
        const result = await executeTool(name, args, config);
        output = result.output;
        parts = result.parts;
        if (result.inlineImage) {
          // Models that reject multimodal function responses can still reason over
          // image bytes when provided in a regular user multimodal turn.
          additionalUserContents.push(
            createUserContent([
              createPartFromText(`Image returned by tool ${name}. Use it to answer the user request.`),
              createPartFromBase64(result.inlineImage.data, result.inlineImage.mimeType),
            ]),
          );
        }
      } catch (err) {
        output = err instanceof Error ? err.message : String(err);
      }
      const part = createPartFromFunctionResponse(id, name, { output }, parts);
      responseParts.push(part);
      lastToolOutputs.push(output);
    }

    // Next turn: previous conversation + model's function-call turn + our function responses as user content.
    contents = [
      ...contents,
      modelContent,
      createUserContent(responseParts),
      ...additionalUserContents,
    ];
  }

  return "(Max turns reached; model did not return a final text response.)";
}
