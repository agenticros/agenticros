/**
 * Gemini chat loop: generateContent with ROS2 tools, handle function calls, return final text.
 */

import type { Content } from "@google/genai";
import { createPartFromFunctionResponse, createUserContent } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import type { AgenticROSConfig } from "@agenticros/core";
import { GEMINI_TOOLS } from "./tools.js";
import { executeTool } from "./tools.js";

const DEFAULT_MODEL = "gemini-2.0-flash";
const MAX_TURNS = 20;

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
  const model = options.model ?? DEFAULT_MODEL;

  const generateConfig = {
    tools: GEMINI_TOOLS,
    systemInstruction: options.systemInstruction ?? "You are a helpful assistant controlling a ROS2 robot. Use the provided tools to list topics, publish commands, read sensor data, call services, send action goals, get/set parameters, capture camera images, and read depth distance. Be concise and safe with velocity commands.",
  };

  let contents: Content[] = [createUserContent(userMessage)];
  let turns = 0;

  while (turns < MAX_TURNS) {
    turns++;
    const response = await ai.models.generateContent({
      model,
      contents,
      config: generateConfig,
    });

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
      } catch (err) {
        output = err instanceof Error ? err.message : String(err);
      }
      const part = createPartFromFunctionResponse(id, name, { output }, parts);
      responseParts.push(part);
    }

    // Next turn: previous conversation + model's function-call turn + our function responses as user content.
    contents = [
      ...contents,
      modelContent,
      createUserContent(responseParts),
    ];
  }

  return "(Max turns reached; model did not return a final text response.)";
}
