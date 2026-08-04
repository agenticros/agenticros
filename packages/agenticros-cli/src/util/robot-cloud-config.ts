/**
 * Robot ID / API token for AgenticROS cloud (cloud.agenticros.com).
 *
 * Lives in the CLI package (with a direct `configstore` dependency) so
 * `agenticros id` / `set` / `connect` work from the published npm binary
 * without needing packages/agenticros-robot/node_modules.
 *
 * Primary store: configstore('agenticros').
 * Legacy: if keys are missing, copy once from configstore('robotics').
 */

import Configstore from "configstore";

export const CLOUD_REST = "https://cloud.agenticros.com";
export const CLOUD_WSS = "wss://cloud.agenticros.com";

const primary = new Configstore("agenticros");
const legacy = new Configstore("robotics");

function migrateKey(key: string): string | undefined {
  const current = primary.get(key) as string | undefined;
  if (current) return current;
  const fromLegacy = legacy.get(key) as string | undefined;
  if (fromLegacy) {
    primary.set(key, fromLegacy);
    return fromLegacy;
  }
  return undefined;
}

export function getRobotId(): string | undefined {
  return migrateKey("ROBOT_ID");
}

export function getApiToken(): string | undefined {
  return migrateKey("API_TOKEN");
}

export function setRobotId(id: string): string {
  primary.set("ROBOT_ID", id);
  return id;
}

export function setApiToken(token: string): string {
  primary.set("API_TOKEN", token);
  return token;
}

/** Create a new robot id via the cloud portal when none is stored. */
export async function ensureRobotId(): Promise<string> {
  const existing = getRobotId();
  if (existing) return existing;
  const response = await fetch(`${CLOUD_REST}/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = (await response.json()) as { id?: string };
  if (!data?.id) {
    throw new Error("Failed to create robot id from cloud.agenticros.com");
  }
  return setRobotId(data.id);
}

/** Fetch portal robot details (camera model, compute) when token+id are set. */
export async function fetchRobotDetails(): Promise<{
  camera?: string;
  compute?: string;
}> {
  const robotId = getRobotId();
  const apiToken = getApiToken();
  if (!robotId || !apiToken) {
    return {};
  }
  try {
    const response = await fetch(`${CLOUD_REST}/robot/${robotId}`, {
      headers: {
        "Content-Type": "application/json",
        api_token: apiToken,
      },
    });
    const data = (await response.json()) as { camera?: string; compute?: string };
    return {
      camera: data.camera && data.camera !== "" ? data.camera : undefined,
      compute: data.compute && data.compute !== "" ? data.compute : undefined,
    };
  } catch {
    return {};
  }
}
