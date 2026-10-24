import type { Vec3 } from '../../types';

export interface MathavanParams {
  sinT: number;
  cosT: number;
  /** Ball–cloth sliding friction μs. */
  muS: number;
  /** Ball–cushion friction μw. */
  muW: number;
  /** Coefficient of restitution e_c. */
  e: number;
  /** Number of impulse steps over the compression (N). */
  steps: number;
}

/**
 * Mathavan, Jackson & Parkin (2010) cushion model, integrated over the normal
 * impulse P (§6.5.2). Ported from pooltool `mathavan_2010` (Apache-2.0).
 * Operates in the cushion frame: y' points INTO the cushion, z up. Mutates v, w.
 */
export function mathavanLocal(v: Vec3, w: Vec3, R: number, m: number, cp: MathavanParams): void {
  let vx = v[0];
  let vy = v[1];
  let wx = w[0];
  let wy = w[1];
  let wz = w[2];
  if (vy <= 0) return;
  const { sinT: s, cosT: c, muS, muW } = cp;
  const dP = Math.max((m * vy) / cp.steps, 1e-9);
  const kv = dP / m;
  const kw = (5 * dP) / (2 * m * R);

  const step = (): void => {
    // Slip at the cushion contact I and at the cloth contact C.
    const xI = vx + wy * R * s - wz * R * c;
    const yI = -vy * s + wx * R;
    const xC = vx - wy * R;
    const yC = vy + wx * R;
    const nI = Math.hypot(xI, yI);
    const nC = Math.hypot(xC, yC);
    const cphi = nI > 1e-12 ? xI / nI : 0;
    const sphi = nI > 1e-12 ? yI / nI : 0;
    const cphi2 = nC > 1e-12 ? xC / nC : 0;
    const sphi2 = nC > 1e-12 ? yC / nC : 0;
    const k = muS * (s + muW * sphi * c);
    vx -= kv * (muW * cphi + k * cphi2);
    vy -= kv * (c - muW * s * sphi + k * sphi2);
    wx -= kw * (muW * sphi + k * sphi2);
    wy -= kw * (muW * cphi * s - k * cphi2);
    wz += kw * (muW * cphi * c);
  };

  let Wc = 0;
  let guard = 0;
  const maxIter = cp.steps * 20 + 1000;
  while (vy > 0 && guard++ < maxIter) {
    const vyBefore = vy;
    step();
    Wc += dP * Math.abs(vyBefore) * c;
  }
  const target = cp.e * cp.e * Wc;
  let Wr = 0;
  guard = 0;
  while (Wr < target && guard++ < maxIter) {
    step();
    Wr += dP * Math.abs(vy) * c;
  }
  v[0] = vx;
  v[1] = vy;
  w[0] = wx;
  w[1] = wy;
  w[2] = wz;
}
