/**
 * Public types for the optional fleet-hive HTTP client.
 * Owners never see these ids — adapters fill them from ARC / config.
 */

export const DEFAULT_HIVE_URL = "http://127.0.0.1:6502";

export const HIVE_EVENT_SCHEMA = "agenticros.event.v1" as const;

export const HIVE_RECIPE_IDS = ["detect", "describe", "health"] as const;
export type HiveRecipeId = (typeof HIVE_RECIPE_IDS)[number];

export type HiveEventKind = "detection" | "caption" | "health" | "mission" | "note";

export interface HiveEvent {
  schema: typeof HIVE_EVENT_SCHEMA;
  robot_id: string;
  kind: HiveEventKind;
  topic: string;
  payload: unknown;
  ts: number;
}

export interface HiveRecipeCatalogEntry {
  id: HiveRecipeId;
  label: string;
  description: string;
  requiresCamera: boolean;
}

export const HIVE_RECIPE_CATALOG: readonly HiveRecipeCatalogEntry[] = [
  {
    id: "detect",
    label: "Detect objects on cameras",
    description: "Watch cameras and write detections + fleet facts. Never drives.",
    requiresCamera: true,
  },
  {
    id: "describe",
    label: "Describe what robots see",
    description: "Rate-limited captions into fleet memory. Never drives.",
    requiresCamera: true,
  },
  {
    id: "health",
    label: "Fleet health notes",
    description: "Watch robot_info / battery and write hive health notes.",
    requiresCamera: false,
  },
] as const;

export interface HiveMemoryItem {
  key: string;
  value: unknown;
}

export interface HiveStatus {
  enabled: true;
  reachable: boolean;
  message: string;
  url: string;
  identityId?: string;
  hiveId?: string;
  hiveName?: string;
  memberCount?: number;
  recordCount?: number;
  recipes: { id: HiveRecipeId; label: string; on: boolean; taskId?: string }[];
}

export interface HiveEnableResult {
  enabled: boolean;
  identityId: string;
  hiveId: string;
  message: string;
}

export interface HiveRecipeResult {
  id: HiveRecipeId;
  on: boolean;
  label: string;
  taskId?: string;
  message: string;
}

export interface HiveClient {
  readonly url: string;
  ensure(): Promise<HiveEnableResult>;
  remember(content: string, opts?: { key?: string; tags?: string[]; path?: string }): Promise<{ key: string }>;
  recall(query?: string, limit?: number): Promise<HiveMemoryItem[]>;
  forget(key?: string, query?: string): Promise<{ removed: number }>;
  status(): Promise<HiveStatus>;
  setRecipe(
    id: HiveRecipeId,
    on: boolean,
    bindings?: { robotId?: string; cameraTopic?: string; namespace?: string },
  ): Promise<HiveRecipeResult>;
}

export class HiveUnavailableError extends Error {
  readonly ownerMessage: string;
  constructor(ownerMessage: string, cause?: unknown) {
    super(ownerMessage);
    this.name = "HiveUnavailableError";
    this.ownerMessage = ownerMessage;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}
