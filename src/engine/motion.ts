import type { PhysicsParams } from './params';
import type { MotionState, Vec3 } from './types';

/**
 * Motion on the cloth (§6.3). Between events every ball follows
 *   r(τ) = r0 + v0·τ + ½·acc·τ²,  v(τ) = v0 + acc·τ,  ω(τ) = ω0 + wAcc·τ
 * with ω_z clamped at zero once its decay reaches it.
 *
 * Sign note (ADR-003): with u = v + R·(k̂ × ω) the friction torque gives
 * dω/dt = +(5μs·g / 2R)·(k̂ × û). This makes du/dt = −(7/2)μs·g·û, so the slip
 * decays and t_slide→roll = 2|u0|/(7μs·g) as the spec requires.
 */

const V_EPS = 1e-6;
const U_EPS = 1e-6;
const W_EPS = 1e-4;

export interface MotionCoeffs {
  acc: Vec3;
  wAcc: Vec3;
  /** Time until the next state transition (Infinity when stationary). */
  tTrans: number;
  next: MotionState;
}

export function slip(v: Vec3, w: Vec3, R: number): Vec3 {
  return [v[0] - R * w[1], v[1] + R * w[0], 0];
}

export function classifyState(v: Vec3, w: Vec3, R: number): MotionState {
  const sp = Math.hypot(v[0], v[1]);
  const u = slip(v, w, R);
  const uMag = Math.hypot(u[0], u[1]);
  if (sp < V_EPS && Math.hypot(w[0], w[1]) * R < V_EPS) {
    return Math.abs(w[2]) > W_EPS ? 'spinning' : 'stationary';
  }
  return uMag < U_EPS ? 'rolling' : 'sliding';
}

/** Force the angular velocity to satisfy the state's kinematic constraint. */
export function normalizeState(state: MotionState, v: Vec3, w: Vec3, R: number): void {
  v[2] = 0;
  if (state === 'rolling') {
    w[0] = -v[1] / R;
    w[1] = v[0] / R;
  } else if (state === 'spinning' || state === 'stationary') {
    v[0] = 0;
    v[1] = 0;
    w[0] = 0;
    w[1] = 0;
    if (state === 'stationary') w[2] = 0;
  }
}

function spinZDecel(wz: number, p: PhysicsParams): number {
  if (Math.abs(wz) < W_EPS) return 0;
  return wz > 0 ? -p.spinDecel : p.spinDecel;
}

export function motionCoeffs(state: MotionState, v: Vec3, w: Vec3, R: number, p: PhysicsParams): MotionCoeffs {
  const g = p.g;
  switch (state) {
    case 'sliding': {
      const u = slip(v, w, R);
      const uMag = Math.hypot(u[0], u[1]);
      const ux = u[0] / uMag;
      const uy = u[1] / uMag;
      const f = p.muSlide * g;
      const k = (5 * f) / (2 * R);
      return {
        acc: [-f * ux, -f * uy, 0],
        // k̂ × û = (−û_y, û_x)
        wAcc: [-k * uy, k * ux, spinZDecel(w[2], p)],
        tTrans: (2 * uMag) / (7 * f),
        next: 'rolling',
      };
    }
    case 'rolling': {
      const sp = Math.hypot(v[0], v[1]);
      const f = p.muRoll * g;
      const ax = (-f * v[0]) / sp;
      const ay = (-f * v[1]) / sp;
      return {
        acc: [ax, ay, 0],
        wAcc: [-ay / R, ax / R, spinZDecel(w[2], p)],
        tTrans: sp / f,
        next: 'spinning',
      };
    }
    case 'spinning':
      return {
        acc: [0, 0, 0],
        wAcc: [0, 0, spinZDecel(w[2], p)],
        tTrans: Math.abs(w[2]) / p.spinDecel,
        next: 'stationary',
      };
    default:
      return { acc: [0, 0, 0], wAcc: [0, 0, 0], tTrans: Infinity, next: 'stationary' };
  }
}

/** Evaluate the closed-form motion τ seconds after (r0, v0, ω0). Writes into the out tuples. */
export function evalMotion(
  r0: Vec3,
  v0: Vec3,
  w0: Vec3,
  acc: Vec3,
  wAcc: Vec3,
  tau: number,
  outR: Vec3,
  outV: Vec3,
  outW: Vec3,
): void {
  const h = 0.5 * tau * tau;
  outR[0] = r0[0] + v0[0] * tau + acc[0] * h;
  outR[1] = r0[1] + v0[1] * tau + acc[1] * h;
  outR[2] = r0[2];
  outV[0] = v0[0] + acc[0] * tau;
  outV[1] = v0[1] + acc[1] * tau;
  outV[2] = 0;
  outW[0] = w0[0] + wAcc[0] * tau;
  outW[1] = w0[1] + wAcc[1] * tau;
  const wz = w0[2] + wAcc[2] * tau;
  outW[2] = (w0[2] > 0 && wz < 0) || (w0[2] < 0 && wz > 0) ? 0 : wz;
}
