/**
 * Merge a hive patch into a raw config object (no Zod). Used by the CLI
 * and hive_enable so adapters can write ~/.agenticros/config.json without
 * pulling transport deps beyond what's already imported.
 */

export interface HiveConfigPatch {
  enabled?: boolean;
  url?: string;
  identityId?: string;
  hiveId?: string;
  recipes?: {
    detect?: boolean;
    describe?: boolean;
    health?: boolean;
  };
}

export function mergeHiveConfig(
  raw: Record<string, unknown>,
  patch: HiveConfigPatch,
): Record<string, unknown> {
  const prev =
    raw.hive && typeof raw.hive === "object" && !Array.isArray(raw.hive)
      ? { ...(raw.hive as Record<string, unknown>) }
      : {};
  const next: Record<string, unknown> = { ...prev };
  if (patch.enabled !== undefined) next.enabled = patch.enabled;
  if (patch.url !== undefined) next.url = patch.url;
  if (patch.identityId !== undefined) next.identityId = patch.identityId;
  if (patch.hiveId !== undefined) next.hiveId = patch.hiveId;
  if (patch.recipes) {
    const prevRecipes =
      prev.recipes && typeof prev.recipes === "object" && !Array.isArray(prev.recipes)
        ? { ...(prev.recipes as Record<string, unknown>) }
        : {};
    next.recipes = { ...prevRecipes, ...patch.recipes };
  }
  return { ...raw, hive: next };
}
