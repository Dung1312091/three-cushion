import { ballBallTime, cushionTime } from './events';
import { classifyState, evalMotion, motionCoeffs, normalizeState } from './motion';
import { resolveBallBall } from './resolve/ballBall';
import { strikeBall } from './resolve/cue';
import { resolveCushion } from './resolve/cushion';
import { RuleTracker, type RuleContext } from './rules';
import { cushionContactSin, effectivePhysics, type TableProfile } from './table';
import type { BallId, BallState, CueStrike, CushionId, MotionState, Segment, ShotResult, SimEvent, Vec3 } from './types';

export const MAX_EVENTS = 400;
export const MAX_TIME = 60;

export interface SimOptions {
  /** Coarse Mathavan steps (solver). */
  fast?: boolean;
  earlyExit?: (e: SimEvent, ctx: RuleContext) => 'continue' | 'stop';
  recordSegments?: boolean;
  /** Indices (in detection order) of ball–ball contacts to let pass through (kiss analysis, §7). */
  disableBallBall?: number[];
  /** Turn off ball–ball friction (throw) — used by physics tests. */
  noThrow?: boolean;
}

/** Extra contact detail used by the solver for instructions and system matching. */
export interface CueContactInfo {
  cushionHits: Array<{ t: number; cushion: CushionId; pos: [number, number]; vIn: [number, number]; wz: number }>;
  firstObjectHit?: { t: number; other: BallId; cuePos: [number, number]; objPos: [number, number]; vIn: [number, number] };
}

export type SimResult = ShotResult & { cueInfo: CueContactInfo };

interface Live {
  id: BallId;
  state: MotionState;
  t0: number;
  tTrans: number;
  r0: Vec3;
  v0: Vec3;
  w0: Vec3;
  acc: Vec3;
  wAcc: Vec3;
  // scratch: state at the current loop time
  r: Vec3;
  v: Vec3;
  w: Vec3;
}

function open(live: Live, t: number, r: Vec3, v: Vec3, w: Vec3, state: MotionState, table: TableProfile, p: ReturnType<typeof effectivePhysics>): void {
  const R = table.ballRadius;
  r[2] = R;
  normalizeState(state, v, w, R);
  const mc = motionCoeffs(state, v, w, R, p);
  live.state = state;
  live.t0 = t;
  live.tTrans = t + mc.tTrans;
  live.r0 = [r[0], r[1], r[2]];
  live.v0 = [v[0], v[1], v[2]];
  live.w0 = [w[0], w[1], w[2]];
  live.acc = mc.acc;
  live.wAcc = mc.wAcc;
}

function at(live: Live, t: number): void {
  evalMotion(live.r0, live.v0, live.w0, live.acc, live.wAcc, t - live.t0, live.r, live.v, live.w);
}

function toSegment(live: Live, t1: number): Segment {
  return {
    ball: live.id,
    t0: live.t0,
    t1,
    state: live.state,
    r0: live.r0,
    v0: live.v0,
    w0: live.w0,
    acc: live.acc,
    wAcc: live.wAcc,
  };
}

const translating = (s: MotionState): boolean => s === 'sliding' || s === 'rolling';

export function simulate(
  table: TableProfile,
  balls: BallState[],
  cue: BallId,
  strike: CueStrike,
  opts: SimOptions = {},
): SimResult {
  const p = effectivePhysics(table);
  const R = table.ballRadius;
  const m = table.ballMass;
  const { L, W } = table;
  const sinT = cushionContactSin(table);
  const record = opts.recordSegments ?? true;
  const disabled = opts.disableBallBall ? new Set(opts.disableBallBall) : null;
  const ghosts = new Set<number>();

  const n = balls.length;
  const lives: Live[] = balls.map((b) => ({
    id: b.id,
    state: 'stationary',
    t0: 0,
    tTrans: Infinity,
    r0: [b.r[0], b.r[1], R],
    v0: [0, 0, 0],
    w0: [0, 0, 0],
    acc: [0, 0, 0],
    wAcc: [0, 0, 0],
    r: [b.r[0], b.r[1], R],
    v: [b.v[0], b.v[1], 0],
    w: [b.w[0], b.w[1], b.w[2]],
  }));
  for (const lv of lives) {
    const st = classifyState(lv.v, lv.w, R);
    open(lv, 0, lv.r, lv.v, lv.w, st, table, p);
  }

  const segments: Segment[] = [];
  const events: SimEvent[] = [];
  const tracker = new RuleTracker(cue);
  const cueInfo: CueContactInfo = { cushionHits: [] };
  let t = 0;
  let truncated = false;
  let stopped = false;
  let ballBallCount = 0;

  const emit = (e: SimEvent): boolean => {
    events.push(e);
    tracker.onEvent(e);
    if (opts.earlyExit && opts.earlyExit(e, tracker.ctx) === 'stop') {
      stopped = true;
      return true;
    }
    return false;
  };

  const cueIdx = lives.findIndex((l) => l.id === cue);
  if (cueIdx >= 0) {
    const cl = lives[cueIdx];
    const out = strikeBall(strike, R, m, p);
    if (record) segments.push(toSegment(cl, 0));
    const v: Vec3 = out.v;
    const w: Vec3 = out.w;
    const r: Vec3 = [cl.r0[0], cl.r0[1], R];
    open(cl, 0, r, v, w, classifyState(v, w, R), table, p);
    emit({ t: 0, type: 'strike', ball: cue });
  }

  const pairKey = (i: number, j: number): number => i * 8 + j;

  while (!stopped) {
    if (events.length >= MAX_EVENTS) {
      truncated = true;
      break;
    }
    let best = Infinity;
    let kind = 0; // 1 transition, 2 cushion, 3 ball-ball
    let bi = -1;
    let bj = -1;
    let bc: CushionId | null = null;

    for (let i = 0; i < n; i++) {
      const lv = lives[i];
      if (lv.state !== 'stationary' && lv.tTrans < best) {
        best = lv.tTrans;
        kind = 1;
        bi = i;
      }
    }
    for (let i = 0; i < n; i++) at(lives[i], t);

    if (ghosts.size > 0) {
      for (const key of [...ghosts]) {
        const i = Math.floor(key / 8);
        const j = key % 8;
        const a = lives[i].r;
        const b = lives[j].r;
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 2 * R + 1e-6) ghosts.delete(key);
      }
    }

    for (let i = 0; i < n; i++) {
      const lv = lives[i];
      if (!translating(lv.state)) continue;
      const hi = Math.min(lv.tTrans, best) - t;
      if (hi <= 0) continue;
      const c = cushionTime(lv.r, lv.v, lv.acc, R, L, W, hi);
      if (c.cushion && t + c.tau < best) {
        best = t + c.tau;
        kind = 2;
        bi = i;
        bc = c.cushion;
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const li = lives[i];
        const lj = lives[j];
        if (!translating(li.state) && !translating(lj.state)) continue;
        if (ghosts.has(pairKey(i, j))) continue;
        const hi = Math.min(best, li.tTrans, lj.tTrans) - t;
        if (hi <= 0) continue;
        const tau = ballBallTime(li.r, li.v, li.acc, lj.r, lj.v, lj.acc, R, hi);
        if (t + tau < best) {
          best = t + tau;
          kind = 3;
          bi = i;
          bj = j;
        }
      }
    }

    if (best === Infinity) break;
    if (best > MAX_TIME) {
      truncated = true;
      t = MAX_TIME;
      break;
    }
    t = best;

    if (kind === 1) {
      const lv = lives[bi];
      at(lv, t);
      if (record) segments.push(toSegment(lv, t));
      const from = lv.state;
      let to: MotionState;
      if (from === 'sliding') {
        to = Math.hypot(lv.v[0], lv.v[1]) < 1e-6 ? classifyState([0, 0, 0], [0, 0, lv.w[2]], R) : 'rolling';
      } else if (from === 'rolling') {
        lv.v[0] = 0;
        lv.v[1] = 0;
        to = Math.abs(lv.w[2]) > 1e-4 ? 'spinning' : 'stationary';
      } else {
        to = 'stationary';
      }
      open(lv, t, lv.r, lv.v, lv.w, to, table, p);
      if (emit({ t, type: 'transition', ball: lv.id, from, to })) break;
    } else if (kind === 2 && bc) {
      const lv = lives[bi];
      at(lv, t);
      if (record) segments.push(toSegment(lv, t));
      const vIn: [number, number] = [lv.v[0], lv.v[1]];
      const wz = lv.w[2];
      const speedIn = resolveCushion(bc, lv.v, lv.w, R, m, sinT, p, !!opts.fast);
      // Snap onto the contact line to avoid drift through the cushion.
      if (bc === 'S1') lv.r[0] = R;
      else if (bc === 'S2') lv.r[0] = L - R;
      else if (bc === 'L1') lv.r[1] = R;
      else lv.r[1] = W - R;
      open(lv, t, lv.r, lv.v, lv.w, classifyState(lv.v, lv.w, R), table, p);
      const pos: [number, number] =
        bc === 'S1' ? [0, lv.r[1]] : bc === 'S2' ? [L, lv.r[1]] : bc === 'L1' ? [lv.r[0], 0] : [lv.r[0], W];
      if (lv.id === cue) cueInfo.cushionHits.push({ t, cushion: bc, pos, vIn, wz });
      if (emit({ t, type: 'ball-cushion', ball: lv.id, cushion: bc, pos, speedIn })) break;
    } else if (kind === 3) {
      const li = lives[bi];
      const lj = lives[bj];
      at(li, t);
      at(lj, t);
      const idx = ballBallCount++;
      if (disabled && disabled.has(idx)) {
        ghosts.add(pairKey(bi, bj));
        continue;
      }
      if (record) {
        segments.push(toSegment(li, t));
        segments.push(toSegment(lj, t));
      }
      const viIn: [number, number] = [li.v[0], li.v[1]];
      const vjIn: [number, number] = [lj.v[0], lj.v[1]];
      const rel = resolveBallBall(li.r, li.v, li.w, lj.r, lj.v, lj.w, R, m, p, !opts.noThrow);
      open(li, t, li.r, li.v, li.w, classifyState(li.v, li.w, R), table, p);
      open(lj, t, lj.r, lj.v, lj.w, classifyState(lj.v, lj.w, R), table, p);
      const pos: [number, number] = [(li.r[0] + lj.r[0]) / 2, (li.r[1] + lj.r[1]) / 2];
      if (!cueInfo.firstObjectHit && (li.id === cue || lj.id === cue)) {
        const cueL = li.id === cue ? li : lj;
        const objL = li.id === cue ? lj : li;
        cueInfo.firstObjectHit = {
          t,
          other: objL.id,
          cuePos: [cueL.r[0], cueL.r[1]],
          objPos: [objL.r[0], objL.r[1]],
          vIn: li.id === cue ? viIn : vjIn,
        };
      }
      if (emit({ t, type: 'ball-ball', a: li.id, b: lj.id, pos, relSpeed: rel })) break;
    }
  }

  const final: BallState[] = lives.map((lv) => {
    at(lv, t);
    if (record) segments.push(toSegment(lv, t));
    return { id: lv.id, r: [lv.r[0], lv.r[1], R], v: [lv.v[0], lv.v[1], 0], w: [lv.w[0], lv.w[1], lv.w[2]], s: lv.state };
  });

  if (record) segments.sort((a, b) => (a.ball === b.ball ? a.t0 - b.t0 : a.ball < b.ball ? -1 : 1));

  return { events, segments, final, tEnd: t, rules: tracker.outcome(), truncated, cueInfo };
}

const tmpR: Vec3 = [0, 0, 0];
const tmpV: Vec3 = [0, 0, 0];
const tmpW: Vec3 = [0, 0, 0];

/** Closed-form state of a ball inside a segment (clamped to the segment's time span). */
export function evalBall(seg: Segment, t: number): { r: Vec3; v: Vec3; w: Vec3 } {
  const tc = Math.min(Math.max(t, seg.t0), seg.t1);
  evalMotion(seg.r0, seg.v0, seg.w0, seg.acc, seg.wAcc, tc - seg.t0, tmpR, tmpV, tmpW);
  return { r: [tmpR[0], tmpR[1], tmpR[2]], v: [tmpV[0], tmpV[1], 0], w: [tmpW[0], tmpW[1], tmpW[2]] };
}

/** Write the position of `ball` at time t into out (x, y). Segments must be sorted (simulate does). */
export function positionAt(segs: Segment[], t: number, out: [number, number]): void {
  let seg = segs[0];
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].t0 <= t) seg = segs[i];
    else break;
  }
  const tc = Math.min(Math.max(t, seg.t0), seg.t1);
  const tau = tc - seg.t0;
  out[0] = seg.r0[0] + seg.v0[0] * tau + 0.5 * seg.acc[0] * tau * tau;
  out[1] = seg.r0[1] + seg.v0[1] * tau + 0.5 * seg.acc[1] * tau * tau;
}

export function segmentsOf(result: ShotResult, ball: BallId): Segment[] {
  return result.segments.filter((s) => s.ball === ball);
}

/** Uniformly sampled track [x0, y0, x1, y1, …] of one ball. */
export function sampleTrack(result: ShotResult, ball: BallId, hz: number): Float32Array {
  const segs = segmentsOf(result, ball);
  const N = Math.max(1, Math.floor(result.tEnd * hz) + 1);
  const out = new Float32Array(2 * (N + 1));
  const p: [number, number] = [0, 0];
  if (segs.length === 0) return out;
  for (let k = 0; k <= N; k++) {
    const t = Math.min(k / hz, result.tEnd);
    positionAt(segs, t, p);
    out[2 * k] = p[0];
    out[2 * k + 1] = p[1];
  }
  return out;
}

/** Build stationary ball states from xy positions. */
export function restingBalls(table: TableProfile, pos: Partial<Record<BallId, { x: number; y: number }>>): BallState[] {
  const out: BallState[] = [];
  for (const id of ['white', 'yellow', 'red'] as BallId[]) {
    const p = pos[id];
    if (!p) continue;
    out.push({ id, r: [p.x, p.y, table.ballRadius], v: [0, 0, 0], w: [0, 0, 0], s: 'stationary' });
  }
  return out;
}
