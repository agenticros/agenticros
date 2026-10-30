/**
 * Robot ID / API token store for Corebrum Synapse cloud (cloud.corebrum.com).
 *
 * Primary store: configstore('synapse').
 * Legacy: if keys are missing, copy once from configstore('robotics').
 */

import Configstore from "configstore";

export const CLOUD_REST = "https://cloud.corebrum.com";
export const CLOUD_WSS = "wss://cloud.corebrum.com";

const primary = new Configstore("synapse");
const legacy = new Configstore("robotics");

function migrateKey(key) {
  const current = primary.get(key);
  if (current) return current;
  const fromLegacy = legacy.get(key);
  if (fromLegacy) {
    primary.set(key, fromLegacy);
    return fromLegacy;
  }
  return undefined;
}

export function getRobotId() {
  return migrateKey("ROBOT_ID");
}

export function getApiToken() {
  return migrateKey("API_TOKEN");
}

export function setRobotId(id) {
  primary.set("ROBOT_ID", id);
  return id;
}

export function setApiToken(token) {
  primary.set("API_TOKEN", token);
  return token;
}

/**
 * Create a new robot id via the cloud portal when none is stored.
 */
export async function ensureRobotId() {
  let id = getRobotId();
  if (id) return id;
  const response = await fetch(`${CLOUD_REST}/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  if (!data?.id) {
    throw new Error("Failed to create robot id from cloud.corebrum.com");
  }
  return setRobotId(data.id);
}

/**
 * Fetch robot details (compute, camera) from the portal.
 */
export async function fetchRobotDetails() {
  const robotId = getRobotId();
  const apiToken = getApiToken();
  if (!robotId || !apiToken) {
    return { camera: undefined, compute: undefined };
  }
  try {
    const response = await fetch(`${CLOUD_REST}/robot/${robotId}`, {
      headers: {
        "Content-Type": "application/json",
        api_token: apiToken,
      },
    });
    const data = await response.json();
    return {
      camera: data.camera && data.camera !== "" ? data.camera : undefined,
      compute: data.compute && data.compute !== "" ? data.compute : undefined,
    };
  } catch {
    return { camera: undefined, compute: undefined };
  }
}
