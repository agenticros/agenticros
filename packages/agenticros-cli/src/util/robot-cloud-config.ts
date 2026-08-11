/**
 * Robot ID / API token for AgenticROS cloud (cloud.agenticros.com).
 *
 * Lives in the CLI package (with a direct `configstore` dependency) so
 * `agenticros id` / `set` / `connect` / `login` / `register` work from the
 * published npm binary without needing packages/agenticros-robot/node_modules.
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

/** Clear API_TOKEN; keeps ROBOT_ID. */
export function clearApiToken(): void {
  primary.delete("API_TOKEN");
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
  name?: string;
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
    if (!response.ok) return {};
    const data = (await response.json()) as {
      camera?: string;
      compute?: string;
      name?: string;
    };
    return {
      camera: data.camera && data.camera !== "" ? data.camera : undefined,
      compute: data.compute && data.compute !== "" ? data.compute : undefined,
      name: data.name && data.name !== "" ? data.name : undefined,
    };
  } catch {
    return {};
  }
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch(`${CLOUD_REST}/auth/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Failed to start device login (${response.status})${text ? `: ${text}` : ""}`,
    );
  }
  return (await response.json()) as DeviceCodeResponse;
}

export type DeviceTokenPollResult =
  | { status: "ready"; apiToken: string }
  | { status: "pending" }
  | { status: "slow_down"; interval?: number }
  | { status: "denied" }
  | { status: "expired" }
  | { status: "error"; message: string };

export async function pollDeviceToken(
  deviceCode: string,
): Promise<DeviceTokenPollResult> {
  const response = await fetch(`${CLOUD_REST}/auth/device/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    error_description?: string;
    api_token?: string;
    access_token?: string;
    interval?: number;
  };
  if (response.ok) {
    const token = data.api_token || data.access_token;
    if (!token) {
      return { status: "error", message: "Token response missing api_token" };
    }
    return { status: "ready", apiToken: token };
  }
  switch (data.error) {
    case "authorization_pending":
      return { status: "pending" };
    case "slow_down":
      return { status: "slow_down", interval: data.interval };
    case "access_denied":
      return { status: "denied" };
    case "expired_token":
      return { status: "expired" };
    default:
      return {
        status: "error",
        message: data.error_description || data.error || `HTTP ${response.status}`,
      };
  }
}

export interface CloudMe {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  githubLogin?: string | null;
  paidTier?: number;
  robotCount?: number;
  maxRobots?: number;
}

export async function fetchMe(): Promise<CloudMe | null> {
  const apiToken = getApiToken();
  if (!apiToken) return null;
  try {
    const response = await fetch(`${CLOUD_REST}/me`, {
      headers: {
        "Content-Type": "application/json",
        api_token: apiToken,
        Authorization: `Bearer ${apiToken}`,
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as CloudMe;
  } catch {
    return null;
  }
}

/** True when local ROBOT_ID is registered to the current account on ARC. */
export async function isCloudRobotRegistered(): Promise<boolean> {
  const robotId = getRobotId();
  const apiToken = getApiToken();
  if (!robotId || !apiToken) return false;
  try {
    const response = await fetch(`${CLOUD_REST}/robot/${robotId}`, {
      headers: {
        "Content-Type": "application/json",
        api_token: apiToken,
        Authorization: `Bearer ${apiToken}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export interface CreateCloudRobotFields {
  id: string;
  name: string;
  camera: string;
  compute: string;
  type?: string;
  wheelCount?: number;
  wheelDiameter?: number;
  wheelWidth?: number;
  wheelBetween?: number;
  cmdVel?: string;
  rosNamespace?: boolean;
  rosTopics?: Array<{ type: string; topic: string }>;
}

export async function createCloudRobot(
  fields: CreateCloudRobotFields,
): Promise<{ id: string; [key: string]: unknown }> {
  const apiToken = getApiToken();
  if (!apiToken) {
    throw new Error("No API token set. Run `agenticros login` first.");
  }
  const response = await fetch(`${CLOUD_REST}/robots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      api_token: apiToken,
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(fields),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    id?: string;
    [key: string]: unknown;
  };
  if (!response.ok) {
    throw new Error(data.error || `Failed to register robot (HTTP ${response.status})`);
  }
  return data as { id: string; [key: string]: unknown };
}

export function maskToken(token: string): string {
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 8)}…${token.slice(-4)}`;
}

/** Preset remote CLI actions accepted by POST /robot/:id/cli */
export const REMOTE_CLI_ACTIONS = [
  "start_motors",
  "stop_motors",
  "start_realsense",
  "stop_realsense",
  "start_camera",
  "stop_camera",
  "status",
] as const;

export type RemoteCliAction = (typeof REMOTE_CLI_ACTIONS)[number];

export function isRemoteCliAction(value: string): value is RemoteCliAction {
  return (REMOTE_CLI_ACTIONS as readonly string[]).includes(value);
}

function authHeaders(apiToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    api_token: apiToken,
    Authorization: `Bearer ${apiToken}`,
  };
}

/** List robot IDs registered to the current ARC account (`GET /myrobots`). */
export async function listMyRobots(): Promise<string[]> {
  const apiToken = getApiToken();
  if (!apiToken) {
    throw new Error("No API token set. Run `agenticros login` first.");
  }
  const response = await fetch(`${CLOUD_REST}/myrobots`, {
    headers: authHeaders(apiToken),
  });
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Failed to list robots (HTTP ${response.status})`);
  }
  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("Unexpected /myrobots response (expected array of ids)");
  }
  return data.map(String);
}

export interface RobotPresence {
  online: boolean;
  socketId?: string | null;
  lastSeen?: string | null;
}

/** Live presence for a robot (`GET /presence/:id`). */
export async function fetchRobotPresence(robotId: string): Promise<RobotPresence> {
  const apiToken = getApiToken();
  if (!apiToken) {
    throw new Error("No API token set. Run `agenticros login` first.");
  }
  const response = await fetch(`${CLOUD_REST}/presence/${robotId}`, {
    headers: authHeaders(apiToken),
  });
  if (!response.ok) {
    return { online: false };
  }
  const data = (await response.json()) as { online?: boolean; socketId?: string | null };
  return {
    online: Boolean(data.online),
    socketId: data.socketId,
  };
}

export interface RemoteCliResult {
  action: string;
  command?: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
  /** Parsed JSON from stdout when the command printed JSON (e.g. status --json). */
  result?: unknown;
}

/**
 * Run a preset CLI action on a remote online robot via
 * `POST /robot/:id/cli` → `{ action }`.
 */
export async function runRemoteCli(
  robotId: string,
  action: RemoteCliAction,
): Promise<RemoteCliResult> {
  const apiToken = getApiToken();
  if (!apiToken) {
    throw new Error("No API token set. Run `agenticros login` first.");
  }
  if (!isRemoteCliAction(action)) {
    throw new Error(
      `Unknown action "${action}". Supported: ${REMOTE_CLI_ACTIONS.join(", ")}`,
    );
  }

  const response = await fetch(`${CLOUD_REST}/robot/${robotId}/cli`, {
    method: "POST",
    headers: authHeaders(apiToken),
    body: JSON.stringify({ action }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    action?: string;
    command?: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    result?: unknown;
  };

  if (!response.ok) {
    const detail = data.message || data.error || `HTTP ${response.status}`;
    throw new Error(`Remote CLI failed: ${detail}`);
  }

  return {
    action: data.action || action,
    command: data.command,
    stdout: data.stdout || "",
    stderr: data.stderr || "",
    exitCode: typeof data.exitCode === "number" ? data.exitCode : 0,
    error: data.error,
    result: data.result,
  };
}
