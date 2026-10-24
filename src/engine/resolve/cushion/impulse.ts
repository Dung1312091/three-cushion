import type { Vec3 } from '../../types';

/**
 * Baseline cushion model: normal restitution + Coulomb friction at the cushion
 * contact point (capped at "no slip"). Very fast; used for debugging.
 * Local cushion frame: y' into the cushion, z up. Mutates v, w.
 */
export function impulseLocal(
  v: Vec3,
  w: Vec3,
  R: number,
  m: number,
  cp: { sinT: number; cosT: number; muW: number; e: number },
): void {
  const vn = v[1];
  if (vn <= 0) return;
  const { sinT: s, cosT: c } = cp;
  const Jn = m * (1 + cp.e) * vn;
  // Tangential slip of the contact point I = (0, R·c, R·s) along x'.
  const xI = v[0] + w[1] * R * s - w[2] * R * c;
  const Jt = Math.min(cp.muW * Jn, (2 / 7) * m * Math.abs(xI));
  const Px = xI !== 0 ? -Math.sign(xI) * Jt : 0;
  const Py = -Jn;
  v[0] += Px / m;
  v[1] += Py / m;
  const I = 0.4 * m * R * R;
  // r_I × P with r_I = (0, Rc, Rs), P = (Px, Py, 0)
  w[0] += (-R * s * Py) / I;
  w[1] += (R * s * Px) / I;
  w[2] += (-R * c * Px) / I;
}
