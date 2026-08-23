/**
 * Differential-drive odometry shared by motor backends.
 *
 * ARC stores wheelDiameter / wheelBetween in millimeters. ROS odom is meters.
 * Pose is integrated on a timer (never only inside the cmd_vel callback).
 */

export const DEFAULT_TPR = 351;
export const DEFAULT_WHEEL_DIAMETER_MM = 64;
export const DEFAULT_WHEEL_BETWEEN_MM = 135;
export const ODOM_PERIOD_MS = 50;

/** 2-wheel, 4-wheel skid-steer, or unset (0) share the same left/right model. */
export function isDifferentialWheelCount(wheelCount) {
  const n = Number(wheelCount);
  return !Number.isFinite(n) || n === 0 || n === 2 || n === 4;
}

export function resolveTicksPerRevolution(cliTpr, configTpr) {
  const fromCli = Number(cliTpr);
  if (Number.isFinite(fromCli) && fromCli > 0) return fromCli;
  const fromConfig = Number(configTpr);
  if (Number.isFinite(fromConfig) && fromConfig > 0) return fromConfig;
  return DEFAULT_TPR;
}

/**
 * @param {object} [config]
 * @param {{ force?: boolean, tpr?: number }} [opts]
 */
export function loadKinematics(config = {}, opts = {}) {
  const force = opts.force === true;
  const diameterMmRaw = Number(config.wheelDiameter) || 0;
  const betweenMmRaw = Number(config.wheelBetween) || 0;
  const diameterMm =
    diameterMmRaw > 0 ? diameterMmRaw : force ? DEFAULT_WHEEL_DIAMETER_MM : 0;
  const betweenMm =
    betweenMmRaw > 0 ? betweenMmRaw : force ? DEFAULT_WHEEL_BETWEEN_MM : 0;
  const wheelCountRaw = Number(config.wheelCount);
  const wheelCount =
    Number.isFinite(wheelCountRaw) && wheelCountRaw > 0 ? wheelCountRaw : 0;
  const differential = isDifferentialWheelCount(wheelCount);
  const ticksPerRevolution = resolveTicksPerRevolution(
    opts.tpr,
    config.ticksPerRevolution,
  );

  return {
    wheelDiameterMm: diameterMm,
    wheelBetweenMm: betweenMm,
    wheelRadiusM: diameterMm / 2000,
    wheelTrackM: betweenMm / 1000,
    ticksPerRevolution,
    wheelCount,
    differential,
    valid: diameterMm > 0 && betweenMm > 0,
  };
}

export function shouldEnableOdom({ noOdom, odom, wheelDiameter, wheelBetween }) {
  if (noOdom) return false;
  if (odom) return true;
  return Number(wheelDiameter) > 0 && Number(wheelBetween) > 0;
}

/**
 * Parse motor-controller argv. Encoder mode is on only when `--encoderpins` is present
 * (do not treat an in-file pin default as "encoders wired").
 */
export function parseOdomCli(argv = process.argv) {
  const has = (flag) => argv.includes(flag);
  const valueAfter = (flag) => {
    const i = argv.indexOf(flag);
    if (i < 0) return undefined;
    const next = argv[i + 1];
    if (next == null || String(next).startsWith("-")) return undefined;
    return String(next);
  };

  const encoderRaw = valueAfter("--encoderpins");
  const tprRaw = valueAfter("--tpr");
  const tpr = tprRaw != null ? Number(tprRaw) : undefined;

  return {
    odom: has("--odom"),
    noOdom: has("--no-odom"),
    tpr: Number.isFinite(tpr) && tpr > 0 ? tpr : undefined,
    encoderPins: encoderRaw
      ? encoderRaw.split(",").map((s) => Number(s.trim()))
      : undefined,
    encoderEnabled: encoderRaw != null,
  };
}

/**
 * @param {{ config?: object, argv?: string[], log?: { warn?: Function } }} args
 */
export function resolveOdomSetup({ config = {}, argv = process.argv, log = console } = {}) {
  const cli = parseOdomCli(argv);
  const enabled = shouldEnableOdom({
    noOdom: cli.noOdom,
    odom: cli.odom,
    wheelDiameter: config.wheelDiameter,
    wheelBetween: config.wheelBetween,
  });
  if (!enabled) {
    return { enabled: false, mode: null, kinematics: null, encoderPins: undefined };
  }

  const kinematics = loadKinematics(config, { force: cli.odom, tpr: cli.tpr });
  if (!kinematics.valid) {
    return { enabled: false, mode: null, kinematics, encoderPins: undefined };
  }

  let mode = "cmd_vel";
  if (cli.encoderEnabled) {
    if (kinematics.differential) {
      mode = "encoder";
    } else {
      log.warn?.(
        `Odometry: wheelCount=${kinematics.wheelCount} is not 2 or 4; staying on cmd_vel dead-reckon`,
      );
    }
  }

  return {
    enabled: true,
    mode,
    kinematics,
    encoderPins: mode === "encoder" ? cli.encoderPins : undefined,
  };
}

export function quaternionFromEuler(roll, pitch, yaw) {
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  return {
    w: cy * cr * cp + sy * sr * sp,
    x: cy * sr * cp - sy * cr * sp,
    y: cy * cr * sp + sy * sr * cp,
    z: sy * cr * cp - cy * sr * sp,
  };
}

export function createOdomState() {
  return {
    x: 0,
    y: 0,
    th: 0,
    vx: 0,
    vy: 0,
    vth: 0,
    lastNs: null,
    pendingLeftTicks: 0,
    pendingRightTicks: 0,
    cmdVx: 0,
    cmdWz: 0,
  };
}

export function applyCmdVel(state, vx, wz) {
  state.cmdVx = Number(vx) || 0;
  state.cmdWz = Number(wz) || 0;
  return state;
}

export function applyTicks(state, dLeft, dRight) {
  state.pendingLeftTicks += Number(dLeft) || 0;
  state.pendingRightTicks += Number(dRight) || 0;
  return state;
}

function timeToNs(now) {
  if (now == null) return Date.now() * 1e6;
  if (typeof now === "bigint" || typeof now === "number") return Number(now);
  if (now.nanoseconds != null) return Number(now.nanoseconds);
  if (now.sec != null && now.nanosec != null) {
    return Number(now.sec) * 1e9 + Number(now.nanosec);
  }
  return Date.now() * 1e6;
}

function integratePose(state, ds, dth) {
  if (Math.abs(dth) < 1e-12) {
    state.x += ds * Math.cos(state.th);
    state.y += ds * Math.sin(state.th);
  } else {
    const x = state.x;
    const y = state.y;
    const th = state.th;
    const radius = ds / dth;
    const iccX = x - radius * Math.sin(th);
    const iccY = y + radius * Math.cos(th);
    state.x = Math.cos(dth) * (x - iccX) - Math.sin(dth) * (y - iccY) + iccX;
    state.y = Math.sin(dth) * (x - iccX) + Math.cos(dth) * (y - iccY) + iccY;
    state.th = th + dth;
    return;
  }
  state.th += dth;
}

/**
 * Integrate one timestep. `now` is rclnodejs Time, nanoseconds, or Date-like.
 * Encoder mode consumes pending ticks; cmd_vel mode uses the last commanded twist.
 */
export function integrate(state, kinematics, mode, now) {
  const nowNs = timeToNs(now);
  if (state.lastNs == null) {
    state.lastNs = nowNs;
    return state;
  }
  const dt = (nowNs - state.lastNs) / 1e9;
  state.lastNs = nowNs;
  if (!(dt > 0)) return state;

  let ds = 0;
  let dth = 0;
  if (mode === "encoder") {
    const { wheelRadiusM, wheelTrackM, ticksPerRevolution } = kinematics;
    const dl =
      (2 * Math.PI * wheelRadiusM * state.pendingLeftTicks) / ticksPerRevolution;
    const dr =
      (2 * Math.PI * wheelRadiusM * state.pendingRightTicks) / ticksPerRevolution;
    state.pendingLeftTicks = 0;
    state.pendingRightTicks = 0;
    ds = (dl + dr) / 2;
    dth = wheelTrackM > 0 ? (dr - dl) / wheelTrackM : 0;
  } else {
    ds = state.cmdVx * dt;
    dth = state.cmdWz * dt;
  }

  integratePose(state, ds, dth);
  state.vx = ds / dt;
  state.vy = 0;
  state.vth = dth / dt;
  return state;
}

function stampFromNow(now) {
  if (now && typeof now === "object" && (now.sec != null || now.nanosec != null)) {
    return { sec: Number(now.sec) || 0, nanosec: Number(now.nanosec) || 0 };
  }
  const ns = timeToNs(now);
  return { sec: Math.floor(ns / 1e9), nanosec: Math.floor(ns % 1e9) };
}

function publishMessages(odomPub, tfPub, state, stamp) {
  const q = quaternionFromEuler(0, 0, state.th);
  odomPub.publish({
    header: { stamp, frame_id: "odom" },
    child_frame_id: "base_link",
    pose: {
      pose: {
        position: { x: state.x, y: state.y, z: 0 },
        orientation: q,
      },
    },
    twist: {
      twist: {
        linear: { x: state.vx, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: state.vth },
      },
    },
  });
  tfPub.publish({
    transforms: [
      {
        header: { stamp, frame_id: "odom" },
        child_frame_id: "base_link",
        transform: {
          translation: { x: state.x, y: state.y, z: 0 },
          rotation: q,
        },
      },
    ],
  });
}

/**
 * @param {{ node?: object, odomTopic: string, kinematics: object, mode: 'cmd_vel'|'encoder' }} opts
 */
export function createOdometry({ node, odomTopic, kinematics, mode }) {
  const state = createOdomState();
  let odomPub = null;
  let tfPub = null;
  let timer = null;

  if (node && odomTopic) {
    odomPub = node.createPublisher("nav_msgs/msg/Odometry", odomTopic);
    tfPub = node.createPublisher("tf2_msgs/msg/TFMessage", "/tf");
  }

  const api = {
    mode,
    kinematics,
    odomTopic,
    setCmdVel(vx, wz) {
      applyCmdVel(state, vx, wz);
    },
    addTicks(dLeft, dRight) {
      applyTicks(state, dLeft, dRight);
    },
    getState() {
      return state;
    },
    tick(now) {
      const stampNow = now ?? node?.now?.();
      integrate(state, kinematics, mode, stampNow);
      if (odomPub && tfPub) {
        publishMessages(odomPub, tfPub, state, stampFromNow(stampNow ?? node?.now?.()));
      }
      return state;
    },
    start() {
      if (!node || timer) return timer;
      timer = node.createTimer(ODOM_PERIOD_MS, () => {
        api.tick(node.now());
      });
      return timer;
    },
    stop() {
      if (timer && typeof timer.cancel === "function") timer.cancel();
      timer = null;
    },
  };
  return api;
}
