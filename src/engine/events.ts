import type { CushionId, Vec3 } from './types';
import { firstContactRoot } from './quartic';

const coef3: [number, number, number] = [0, 0, 0];
const coef5: [number, number, number, number, number] = [0, 0, 0, 0, 0];

/**
 * Earliest cushion contact for a ball within [0, hi] (§6.4). Each cushion gives a
 * quadratic in τ; only contacts where the ball moves INTO the cushion count.
 */
export function cushionTime(
  r: Vec3,
  v: Vec3,
  acc: Vec3,
  R: number,
  L: number,
  W: number,
  hi: number,
): { tau: number; cushion: CushionId | null } {
  let best = Infinity;
  let which: CushionId | null = null;
  const test = (c0: number, c1: number, c2: number, id: CushionId): void => {
    coef3[0] = c0;
    coef3[1] = c1;
    coef3[2] = c2;
    const t = firstContactRoot(coef3, 2, 0, Math.min(hi, best));
    if (t < best) {
      best = t;
      which = id;
    }
  };
  // f(τ) = distance from the ball centre to the contact line; contact when f crosses 0 downward.
  test(r[0] - R, v[0], 0.5 * acc[0], 'S1');
  test(L - R - r[0], -v[0], -0.5 * acc[0], 'S2');
  test(r[1] - R, v[1], 0.5 * acc[1], 'L1');
  test(W - R - r[1], -v[1], -0.5 * acc[1], 'L2');
  return { tau: best, cushion: which };
}

/**
 * Earliest ball–ball contact within [0, hi]: |Δr(τ)|² − 4R² = 0 with
 * Δr(τ) = Aτ² + Bτ + C (xy only).
 */
export function ballBallTime(
  ri: Vec3,
  vi: Vec3,
  ai: Vec3,
  rj: Vec3,
  vj: Vec3,
  aj: Vec3,
  R: number,
  hi: number,
): number {
  const Ax = 0.5 * (ai[0] - aj[0]);
  const Ay = 0.5 * (ai[1] - aj[1]);
  const Bx = vi[0] - vj[0];
  const By = vi[1] - vj[1];
  const Cx = ri[0] - rj[0];
  const Cy = ri[1] - rj[1];
  // Cheap reject: max reachable approach within hi.
  const dist = Math.hypot(Cx, Cy) - 2 * R;
  const reach = Math.hypot(Bx, By) * hi + Math.hypot(Ax, Ay) * hi * hi;
  if (dist > reach + 1e-9) return Infinity;
  coef5[4] = Ax * Ax + Ay * Ay;
  coef5[3] = 2 * (Ax * Bx + Ay * By);
  coef5[2] = Bx * Bx + By * By + 2 * (Ax * Cx + Ay * Cy);
  coef5[1] = 2 * (Bx * Cx + By * Cy);
  coef5[0] = Cx * Cx + Cy * Cy - 4 * R * R;
  return firstContactRoot(coef5, 4, 0, hi);
}
