import type { PhysicsParams } from '../params';
import type { CueStrike, Vec3 } from '../types';
import { cross, rotZ, unit } from '../vec';

export interface CueOutcome {
  v: Vec3;
  w: Vec3;
  /** Contact point on the cue ball, relative to its centre. */
  rQ: Vec3;
  /** Unit vector along the cue (pointing from butt to tip). */
  cueDir: Vec3;
  /** Squirt deflection actually applied (rad, + = to the shooter's left). */
  squirt: number;
}

/** Cue frame for a strike: ĉ along the cue, r̂ to the shooter's right, û "up" ⟂ ĉ. */
export function cueFrame(phi: number, theta: number): { c: Vec3; right: Vec3; up: Vec3 } {
  const ct = Math.cos(theta);
  const c: Vec3 = [ct * Math.cos(phi), ct * Math.sin(phi), -Math.sin(theta)];
  const right = unit([c[1], -c[0], 0]); // ĉ × k̂
  const up = cross(right, c);
  return { c, right, up };
}

export function contactPoint(strike: Pick<CueStrike, 'phi' | 'theta' | 'a' | 'b'>, R: number): Vec3 {
  const { c, right, up } = cueFrame(strike.phi, strike.theta);
  const { a, b } = strike;
  const s = Math.sqrt(Math.max(0, 1 - a * a - b * b));
  return [
    R * (a * right[0] + b * up[0]) - R * s * c[0],
    R * (a * right[1] + b * up[1]) - R * s * c[1],
    R * (a * right[2] + b * up[2]) - R * s * c[2],
  ];
}

export function squirtAngle(a: number, massRatio: number): number {
  const aa = Math.abs(a);
  return Math.atan((2.5 * aa * Math.sqrt(Math.max(0, 1 - aa * aa))) / (1 + massRatio + 2.5 * (1 - aa * aa)));
}

/**
 * Instantaneous cue impulse (Alciatore TP A.30, 3D vector form, §6.2).
 * ADR-003: squirt rotates v toward the side opposite the english
 * (a > 0 → deflects to the shooter's left, i.e. +α counter-clockwise).
 */
export function strikeBall(strike: CueStrike, R: number, m: number, p: PhysicsParams): CueOutcome {
  const { c } = cueFrame(strike.phi, strike.theta);
  const rQ = contactPoint(strike, R);
  const I = 0.4 * m * R * R;
  const M = p.cueMass;
  const n2 = R * R * (strike.a * strike.a + strike.b * strike.b);
  const J = ((1 + p.tipRestitution) * M * strike.V0) / (1 + M / m + (M * n2) / I);
  const Jc: Vec3 = [J * c[0], J * c[1], J * c[2]];
  let v: Vec3 = [(J / m) * c[0], (J / m) * c[1], 0];
  const tq = cross(rQ, Jc);
  const w: Vec3 = [tq[0] / I, tq[1] / I, tq[2] / I];
  let squirt = 0;
  if (strike.a !== 0) {
    squirt = Math.sign(strike.a) * squirtAngle(strike.a, p.squirtMassRatio);
    v = rotZ(v, squirt);
  }
  return { v, w, rQ, cueDir: c, squirt };
}

export const isMiscue = (a: number, b: number, limit: number): boolean => a * a + b * b > limit * limit;
