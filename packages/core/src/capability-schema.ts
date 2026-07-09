/**
 * Zod schemas for capability manifests (skill load / CLI publish).
 */

import { z } from "zod";

export const CapabilityFieldSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
  optional: z.boolean().optional(),
  default: z.unknown().optional(),
});

export const CapabilityImplementationSchema = z.union([
  z.object({ kind: z.literal("in_process") }),
  z.object({
    kind: z.literal("external_ros_node"),
    package: z.string().optional(),
    launch: z.string().optional(),
    action: z.string().optional(),
    service: z.string().optional(),
    topic: z.string().optional(),
    msg_type: z.string().optional(),
  }),
]);

export const CapabilitySchema = z.object({
  id: z.string().min(1),
  verb: z.string().min(1),
  description: z.string().default(""),
  inputs: z.record(CapabilityFieldSchema).optional(),
  outputs: z.record(CapabilityFieldSchema).optional(),
  preconditions: z.array(z.string()).optional(),
  interruptible: z.boolean().optional(),
  blocks_base: z.boolean().optional(),
  implementation: CapabilityImplementationSchema.optional(),
  tool: z.string().optional(),
});

export type ParsedCapability = z.infer<typeof CapabilitySchema>;

/**
 * Validate a raw capability object. Throws ZodError on failure.
 */
export function parseCapability(raw: unknown): ParsedCapability {
  return CapabilitySchema.parse(raw);
}

/**
 * Soft-validate: returns { ok, capability?, error? }.
 */
export function safeParseCapability(
  raw: unknown,
): { ok: true; capability: ParsedCapability } | { ok: false; error: string } {
  const result = CapabilitySchema.safeParse(raw);
  if (result.success) return { ok: true, capability: result.data };
  return { ok: false, error: result.error.message };
}
