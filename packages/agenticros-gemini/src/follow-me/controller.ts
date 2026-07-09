/**
 * Follower P-controller ported from agenticros_follow_me/follower_controller.py.
 *
 * Given a target person's 3D position (x = lateral metres, z = depth metres),
 * compute a smoothed, deadzoned, clamped Twist command.
 */

export interface ControllerConfig {
  targetDistance: number;
  maxLinearVel: number;
  maxAngularVel: number;
  kpDistance: number;
  kpAngular: number;
  distanceDeadzone: number;
  angularDeadzone: number;
  smoothingFactor: number;
  watchdogTimeoutMs: number;
}

export const DEFAULT_CONTROLLER_CONFIG: ControllerConfig = {
  targetDistance: 1.0,
  maxLinearVel: 0.5,
  maxAngularVel: 1.0,
  kpDistance: 0.5,
  kpAngular: 1.5,
  distanceDeadzone: 0.05,
  angularDeadzone: 0.05,
  smoothingFactor: 0.3,
  watchdogTimeoutMs: 500,
};

export interface Twist {
  linearX: number;
  angularZ: number;
}

export interface TargetSample {
  /** Lateral offset in metres (positive = right of camera centre). */
  x: number;
  /** Forward depth in metres. */
  z: number;
  confidence: number;
}

export class FollowerController {
  readonly config: ControllerConfig;
  private smoothedLinear = 0;
  private smoothedAngular = 0;
  private lastDetectionMs = 0;
  private lastTwist: Twist = { linearX: 0, angularZ: 0 };

  constructor(config: Partial<ControllerConfig> = {}) {
    this.config = { ...DEFAULT_CONTROLLER_CONFIG, ...config };
  }

  setTargetDistance(d: number): void {
    this.config.targetDistance = Math.max(0.3, Math.min(5.0, d));
  }

  reset(): void {
    this.smoothedLinear = 0;
    this.smoothedAngular = 0;
    this.lastTwist = { linearX: 0, angularZ: 0 };
    this.lastDetectionMs = Date.now();
  }

  /** Compute next twist. Pass null when no person is detected this tick. */
  update(target: TargetSample | null): Twist {
    const now = Date.now();
    if (!target) {
      if (now - this.lastDetectionMs > this.config.watchdogTimeoutMs) {
        this.smoothedLinear = 0;
        this.smoothedAngular = 0;
        this.lastTwist = { linearX: 0, angularZ: 0 };
        return this.lastTwist;
      }
      return this.lastTwist;
    }
    this.lastDetectionMs = now;

    let distErr = target.z - this.config.targetDistance;
    // angular error: pointing right (positive x) should turn right (negative angular_z)
    let angErr = -Math.atan2(target.x, Math.max(target.z, 0.1));

    if (Math.abs(distErr) < this.config.distanceDeadzone) distErr = 0;
    if (Math.abs(angErr) < this.config.angularDeadzone) angErr = 0;

    let linearCmd = this.config.kpDistance * distErr;
    let angularCmd = this.config.kpAngular * angErr;

    linearCmd = clamp(linearCmd, -this.config.maxLinearVel, this.config.maxLinearVel);
    angularCmd = clamp(angularCmd, -this.config.maxAngularVel, this.config.maxAngularVel);

    const a = this.config.smoothingFactor;
    this.smoothedLinear = a * linearCmd + (1 - a) * this.smoothedLinear;
    this.smoothedAngular = a * angularCmd + (1 - a) * this.smoothedAngular;

    this.lastTwist = { linearX: this.smoothedLinear, angularZ: this.smoothedAngular };
    return this.lastTwist;
  }

  getLastTwist(): Twist {
    return this.lastTwist;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
