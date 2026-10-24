import type { PhysicsParams } from '../../params';
import { CUSHION_NORMAL } from '../../table';
import type { CushionId, Vec3 } from '../../types';
import { impulseLocal } from './impulse';
import { mathavanLocal } from './mathavan';

export function restitution(p: PhysicsParams, vPerp: number): number {
  if (p.cushionRestitutionModel === 'speedPoly') {
    return Math.max(0.4, 0.5 + 0.257 * vPerp - 0.044 * vPerp * vPerp);
  }
  return p.eCushion;
}

/**
 * Resolve a ball–cushion impact in world coordinates (mutates v, w).
 * Returns the incoming speed perpendicular to the cushion.
 */
export function resolveCushion(
  cushion: CushionId,
  v: Vec3,
  w: Vec3,
  R: number,
  m: number,
  sinT: number,
  p: PhysicsParams,
  fast: boolean,
): number {
  const [nx, ny] = CUSHION_NORMAL[cushion];
  // Local frame: y' = n (into the cushion), x' = y' × z = (ny, −nx, 0).
  const xx = ny;
  const xy = -nx;
  const lv: Vec3 = [v[0] * xx + v[1] * xy, v[0] * nx + v[1] * ny, v[2]];
  const lw: Vec3 = [w[0] * xx + w[1] * xy, w[0] * nx + w[1] * ny, w[2]];
  const speedIn = lv[1];
  if (speedIn <= 0) return 0;
  const cosT = Math.sqrt(1 - sinT * sinT);
  const e = restitution(p, speedIn);
  if (p.cushionModel === 'impulse' || speedIn < 1e-3) {
    impulseLocal(lv, lw, R, m, { sinT, cosT, muW: p.muCushion, e });
  } else {
    // 'han2005' is a Phase 4 comparison model; until then it falls back to Mathavan.
    mathavanLocal(lv, lw, R, m, {
      sinT,
      cosT,
      muS: p.muSlide,
      muW: p.muCushion,
      e,
      steps: fast ? p.mathavanStepsFast : p.mathavanStepsFine,
    });
  }
  // Never leave the ball moving into the cushion.
  if (lv[1] > -1e-6) lv[1] = -Math.max(1e-6, 0.05 * e * speedIn);
  v[0] = lv[0] * xx + lv[1] * nx;
  v[1] = lv[0] * xy + lv[1] * ny;
  v[2] = 0;
  w[0] = lw[0] * xx + lw[1] * nx;
  w[1] = lw[0] * xy + lw[1] * ny;
  w[2] = lw[2];
  return speedIn;
}
