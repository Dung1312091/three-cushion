import type { PhysicsParams } from '../params';
import type { Vec3 } from '../types';

/** Alciatore's speed-dependent ball–ball friction (TP A.14). */
export const ballFriction = (vRel: number): number => 0.009951 + 0.108 * Math.exp(-1.088 * vRel);

/**
 * Frictional inelastic ball–ball collision (§6.5.1), after
 * pooltool `physics/resolve/ball_ball/frictional_inelastic` (Apache-2.0, see NOTICE.md).
 * Mutates the velocity / angular-velocity tuples. Returns the approach speed along the normal.
 */
export function resolveBallBall(
  ri: Vec3,
  vi: Vec3,
  wi: Vec3,
  rj: Vec3,
  vj: Vec3,
  wj: Vec3,
  R: number,
  m: number,
  p: PhysicsParams,
  withFriction = true,
): number {
  let nx = rj[0] - ri[0];
  let ny = rj[1] - ri[1];
  const d = Math.hypot(nx, ny);
  nx /= d;
  ny /= d;
  const vin = vi[0] * nx + vi[1] * ny;
  const vjn = vj[0] * nx + vj[1] * ny;
  const approach = vin - vjn;
  if (approach <= 0) return 0;

  // Slip at the contact point before the impulse: s = (v_i + ω_i × Rn) − (v_j + ω_j × (−Rn)).
  // ω × (R n) with n = (nx, ny, 0) → R·(−ω_z·ny, ω_z·nx, ω_x·ny − ω_y·nx)
  const sx = vi[0] - R * wi[2] * ny - (vj[0] + R * wj[2] * ny);
  const sy = vi[1] + R * wi[2] * nx - (vj[1] - R * wj[2] * nx);
  const sz = R * (wi[0] * ny - wi[1] * nx) + R * (wj[0] * ny - wj[1] * nx);
  const sn = sx * nx + sy * ny;
  const tx = sx - sn * nx;
  const ty = sy - sn * ny;
  const tz = sz;
  const sMag = Math.sqrt(tx * tx + ty * ty + tz * tz);

  const e = p.eBall;
  const vin2 = 0.5 * ((1 - e) * vin + (1 + e) * vjn);
  const vjn2 = 0.5 * ((1 + e) * vin + (1 - e) * vjn);
  const dvi = vin2 - vin;
  const dvj = vjn2 - vjn;
  vi[0] += dvi * nx;
  vi[1] += dvi * ny;
  vj[0] += dvj * nx;
  vj[1] += dvj * ny;

  if (withFriction && sMag > 1e-9) {
    const dpn = m * Math.abs(dvi);
    const Pt = Math.min(ballFriction(sMag) * dpn, (m * sMag) / 7);
    const px = (-Pt * tx) / sMag;
    const py = (-Pt * ty) / sMag;
    const pz = (-Pt * tz) / sMag;
    vi[0] += px / m;
    vi[1] += py / m;
    vj[0] -= px / m;
    vj[1] -= py / m;
    const I = 0.4 * m * R * R;
    // (R n) × P = R·(ny·pz, −nx·pz, nx·py − ny·px); identical torque for j: (−Rn) × (−P).
    const ax = (R * ny * pz) / I;
    const ay = (-R * nx * pz) / I;
    const az = (R * (nx * py - ny * px)) / I;
    wi[0] += ax;
    wi[1] += ay;
    wi[2] += az;
    wj[0] += ax;
    wj[1] += ay;
    wj[2] += az;
  }
  vi[2] = 0;
  vj[2] = 0;
  return approach;
}
