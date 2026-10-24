import type { TableProfile } from '../engine/table';
import type { BallId } from '../engine/types';

type P = { x: number; y: number };

function railGap(p: P, t: TableProfile): number {
  return Math.min(p.x, t.L - p.x, p.y, t.W - p.y) - t.ballRadius;
}

/** Distance from point c to segment ab. */
function segDist(c: P, a: P, b: P): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(c.x - (a.x + t * dx), c.y - (a.y + t * dy));
}

/**
 * Position-play heuristic 0..1 for the leave after the shot (§8.2 step 7).
 * Weights are placeholders [CẦN HLV DUYỆT].
 */
export function leaveScore(t: TableProfile, final: Record<BallId, P>, cue: BallId): number {
  const ids = Object.keys(final) as BallId[];
  const objs = ids.filter((id) => id !== cue);
  if (objs.length < 2 || !final[cue]) return 0.5;
  const c = final[cue];
  const o1 = final[objs[0]];
  const o2 = final[objs[1]];
  const R = t.ballRadius;
  let s = 0.4;
  const dObj = Math.hypot(o1.x - o2.x, o1.y - o2.y);
  if (dObj < 0.5) s += 0.25;
  else if (dObj < 0.9) s += 0.1;
  for (const o of [o1, o2]) if (railGap(o, t) > R + 0.01) s += 0.08;
  // Blocked line from the cue ball to an object ball.
  const blocked = segDist(o2, c, o1) < 2 * R || segDist(o1, c, o2) < 2 * R;
  if (!blocked) s += 0.1;
  // Frozen cue ball (on a rail or touching a ball).
  if (railGap(c, t) < 0.01 || Math.hypot(c.x - o1.x, c.y - o1.y) < 2 * R + 0.01 || Math.hypot(c.x - o2.x, c.y - o2.y) < 2 * R + 0.01) s -= 0.2;
  // Three balls lined up along a rail.
  const nearX = [c, o1, o2].every((p) => Math.abs(p.y - c.y) < 2 * R) && railGap(c, t) < 0.15;
  const nearY = [c, o1, o2].every((p) => Math.abs(p.x - c.x) < 2 * R) && railGap(c, t) < 0.15;
  if (nearX || nearY) s -= 0.15;
  return Math.max(0, Math.min(1, s));
}
