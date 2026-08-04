/**
 * `agenticros register` — register this robot on AgenticROS Cloud.
 *
 * Mints/reuses local ROBOT_ID (same as `agenticros id`), prompts for required
 * name / camera / compute, then POST /robots with that id.
 */

import { confirm, input, select } from "@inquirer/prompts";

import { loginCommand } from "./cloud-auth.js";
import {
  CLOUD_REST,
  createCloudRobot,
  ensureRobotId,
  getApiToken,
  isCloudRobotRegistered,
} from "../util/robot-cloud-config.js";
import { dim, err, header, info, ok, warn } from "../util/logger.js";

export const CLOUD_CAMERA_CHOICES = [
  { name: "None", value: "None" },
  { name: "2D Camera", value: "2D" },
  { name: "RealSense D405", value: "D405" },
  { name: "RealSense D415", value: "D415" },
  { name: "RealSense D421", value: "D421" },
  { name: "RealSense D435", value: "D435" },
  { name: "RealSense D435i", value: "D435i" },
  { name: "RealSense D455", value: "D455" },
  { name: "RealSense D456", value: "D456" },
  { name: "RealSense D457", value: "D457" },
  { name: "RealSense D555", value: "D555" },
] as const;

export const CLOUD_COMPUTE_CHOICES = [
  { name: "Raspberry Pi", value: "Raspberry Pi" },
  { name: "Radxa", value: "Radxa" },
  { name: "Latte Panda", value: "Latte Panda" },
  { name: "Nvidia Orin", value: "Nvidia Orin" },
  { name: "Arduino", value: "Arduino" },
] as const;

export const CLOUD_TYPE_CHOICES = [
  { name: "AMR", value: "AMR" },
  { name: "AGV", value: "AGV" },
  { name: "Arm", value: "Arm" },
  { name: "Drone", value: "Drone" },
  { name: "Humanoid", value: "Humanoid" },
] as const;

export interface RegisterOptions {
  name?: string;
  camera?: string;
  compute?: string;
  type?: string;
  /** Skip optional advanced prompts. */
  defaults?: boolean;
  /** Non-interactive: fail instead of prompting login. */
  yes?: boolean;
}

export async function registerCommand(opts: RegisterOptions = {}): Promise<void> {
  header("Register robot on AgenticROS Cloud");

  if (!getApiToken()) {
    if (opts.yes) {
      err("Not logged in. Run `agenticros login` first.");
      process.exit(1);
    }
    const doLogin = await confirm({
      message: "Not logged in. Log in to AgenticROS Cloud now?",
      default: true,
    });
    if (!doLogin) {
      err("Login required to register a robot.");
      process.exit(1);
    }
    await loginCommand({});
    if (!getApiToken()) {
      err("Login did not store an API token.");
      process.exit(1);
    }
  }

  const id = await ensureRobotId();
  info(`Robot UUID (local + ARC): ${id}`);

  if (await isCloudRobotRegistered()) {
    const again =
      opts.yes ||
      (await confirm({
        message: "This robot is already registered. Update its cloud profile?",
        default: true,
      }));
    if (!again) {
      info("Leaving cloud robot unchanged.");
      return;
    }
  }

  const name =
    opts.name?.trim() ||
    (await input({
      message: "Robot name",
      validate: (v) => (v.trim() ? true : "Name is required"),
    })).trim();

  const camera =
    opts.camera?.trim() ||
    (await select({
      message: "Camera (required — selects camera stack)",
      choices: [...CLOUD_CAMERA_CHOICES],
      default: "None",
    }));

  const compute =
    opts.compute?.trim() ||
    (await select({
      message: "Compute (required — selects motor controller)",
      choices: [...CLOUD_COMPUTE_CHOICES],
      default: "Raspberry Pi",
    }));

  let type = opts.type?.trim() || "AMR";
  let rosNamespace = false;
  let cmdVel = "";
  let wheelCount = 0;
  let wheelDiameter = 0;
  let wheelWidth = 0;
  let wheelBetween = 0;

  const wantAdvanced =
    !opts.defaults &&
    !opts.yes &&
    (await confirm({
      message: "Configure advanced fields (type, wheels, namespace)?",
      default: false,
    }));

  if (wantAdvanced) {
    type = await select({
      message: "Robot type",
      choices: [...CLOUD_TYPE_CHOICES],
      default: "AMR",
    });
    rosNamespace = await confirm({
      message: "Use ROS2 topic namespacing?",
      default: false,
    });
    cmdVel = (
      await input({
        message: "cmd_vel topic override (empty = default)",
        default: "",
      })
    ).trim();
    wheelCount = await optionalInt("Wheel count", 0);
    wheelDiameter = await optionalInt("Wheel diameter (mm)", 0);
    wheelWidth = await optionalInt("Wheel width (mm)", 0);
    wheelBetween = await optionalInt("Distance between wheels (mm)", 0);
  }

  if (!name || !camera || !compute) {
    err("name, camera, and compute are required.");
    process.exit(1);
  }

  info("Registering on AgenticROS Cloud…");
  try {
    const robot = await createCloudRobot({
      id,
      name,
      camera,
      compute,
      type,
      rosNamespace,
      cmdVel,
      wheelCount,
      wheelDiameter,
      wheelWidth,
      wheelBetween,
    });
    ok(`Registered robot "${name}" (${robot.id}).`);
    dim(`  camera=${camera}  compute=${compute}`);
    dim(`  ${CLOUD_REST}/robots`);
    ok("Local ROBOT_ID and ARC share this UUID — connect / motors will use it.");
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    if (String(e).includes("limit")) {
      warn("Upgrade your plan on the Pricing page, or remove a robot in the portal.");
    }
    process.exit(1);
  }
}

async function optionalInt(message: string, fallback: number): Promise<number> {
  const raw = await input({
    message: `${message} (empty = ${fallback})`,
    default: String(fallback),
  });
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}
