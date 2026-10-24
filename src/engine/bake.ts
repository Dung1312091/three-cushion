import { evalMotion } from './motion';
import type { BallId, Segment, ShotResult, Vec3 } from './types';

export interface BakedShot {
  hz: number;
  tEnd: number;
  quats: Record<BallId, Float32Array>;
}

/**
 * Integrate ball orientations at `hz` for playback (§6.8):
 *   q ← normalize(dq(ω·dt) ⊗ q),  dq = [ω̂·sin(|ω|dt/2), cos(|ω|dt/2)]   (world frame → left multiply)
 * Quaternions are stored as [x, y, z, w].
 */
export function bake(result: ShotResult, hz = 120, initial?: Partial<Record<BallId, [number, number, number, number]>>): BakedShot {
  const N = Math.max(1, Math.ceil(result.tEnd * hz)) + 1;
  const dt = 1 / hz;
  const quats = {} as Record<BallId, Float32Array>;
  const byBall = new Map<BallId, Segment[]>();
  for (const s of result.segments) {
    const arr = byBall.get(s.ball) ?? [];
    arr.push(s);
    byBall.set(s.ball, arr);
  }
  const r: Vec3 = [0, 0, 0];
  const v: Vec3 = [0, 0, 0];
  const w: Vec3 = [0, 0, 0];
  for (const [ball, segs] of byBall) {
    const out = new Float32Array(N * 4);
    let [qx, qy, qz, qw] = initial?.[ball] ?? [0, 0, 0, 1];
    let si = 0;
    for (let k = 0; k < N; k++) {
      out[4 * k] = qx;
      out[4 * k + 1] = qy;
      out[4 * k + 2] = qz;
      out[4 * k + 3] = qw;
      const tm = (k + 0.5) * dt; // midpoint ω
      while (si < segs.length - 1 && segs[si].t1 <= tm) si++;
      const s = segs[si];
      const tc = Math.min(Math.max(tm, s.t0), s.t1);
      evalMotion(s.r0, s.v0, s.w0, s.acc, s.wAcc, tc - s.t0, r, v, w);
      if (tm > result.tEnd) continue;
      const wm = Math.hypot(w[0], w[1], w[2]);
      if (wm < 1e-9) continue;
      const half = 0.5 * wm * dt;
      const sn = Math.sin(half) / wm;
      const ax = w[0] * sn;
      const ay = w[1] * sn;
      const az = w[2] * sn;
      const aw = Math.cos(half);
      // (a ⊗ q)
      const nx = aw * qx + ax * qw + ay * qz - az * qy;
      const ny = aw * qy - ax * qz + ay * qw + az * qx;
      const nz = aw * qz + ax * qy - ay * qx + az * qw;
      const nw = aw * qw - ax * qx - ay * qy - az * qz;
      const len = Math.hypot(nx, ny, nz, nw);
      qx = nx / len;
      qy = ny / len;
      qz = nz / len;
      qw = nw / len;
    }
    quats[ball] = out;
  }
  return { hz, tEnd: result.tEnd, quats };
}
