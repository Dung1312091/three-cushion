import { simulate, type SimOptions } from '../engine/simulate';
import type { TableProfile } from '../engine/table';
import type { BallId, BallState, CueStrike } from '../engine/types';
import { DEG } from '../engine/vec';

export interface Counter {
  sims: number;
}

const solverExit: SimOptions['earlyExit'] = (e, ctx) => {
  if (ctx.scored || ctx.failed) return 'stop';
  if (e.type === 'transition' && e.ball === ctx.cue && (e.to === 'spinning' || e.to === 'stationary')) return 'stop';
  return 'continue';
};

/** Fast scoring check used throughout the search (§8.2 step 2). */
export function scores(table: TableProfile, balls: BallState[], cue: BallId, strike: CueStrike, c: Counter): boolean {
  c.sims++;
  return simulate(table, balls, cue, strike, { fast: true, recordSegments: false, earlyExit: solverExit }).rules.scored;
}

/** Stroke presets swept over φ (V0 m/s, a, b in R). θ is fixed at 5° (§8.2 step 2). */
export const PRESETS: Array<{ V0: number; a: number; b: number }> = (() => {
  const out: Array<{ V0: number; a: number; b: number }> = [];
  for (const V0 of [3.5, 2.5, 4.5, 5.5]) {
    for (const a of [0.3, -0.3, 0]) {
      for (const b of [0.2, -0.2]) out.push({ V0, a, b });
    }
  }
  return out;
})();

export const DEFAULT_THETA = 5 * DEG;

/**
 * φ grid: the full circle every 0.5°, plus 0.1° steps across each object ball's
 * angular span (ball-first seeds: thickness from 1/8 to full on both sides).
 */
export function phiGrid(balls: BallState[], cue: BallId, R: number): number[] {
  const set: number[] = [];
  for (let k = 0; k < 720; k++) set.push(k * 0.5 * DEG);
  const c = balls.find((b) => b.id === cue);
  if (c) {
    for (const o of balls) {
      if (o.id === cue) continue;
      const dx = o.r[0] - c.r[0];
      const dy = o.r[1] - c.r[1];
      const d = Math.hypot(dx, dy);
      const center = Math.atan2(dy, dx);
      const half = Math.asin(Math.min(1, (2 * R) / d)) + 0.3 * DEG;
      for (let x = -half; x <= half; x += 0.1 * DEG) {
        let p = center + x;
        p = ((p % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        set.push(p);
      }
    }
  }
  set.sort((a, b) => a - b);
  const out: number[] = [];
  for (const p of set) if (out.length === 0 || p - out[out.length - 1] > 1e-6) out.push(p);
  return out;
}

export interface PhiWindow {
  lo: number;
  hi: number;
  center: number;
  preset: { V0: number; a: number; b: number };
}

/** Group consecutive scoring φ samples into windows and bisect both edges to 0.02° (§8.2 step 3). */
export function findWindows(
  table: TableProfile,
  balls: BallState[],
  cue: BallId,
  grid: number[],
  preset: { V0: number; a: number; b: number },
  c: Counter,
): PhiWindow[] {
  const mk = (phi: number): CueStrike => ({ phi, theta: DEFAULT_THETA, a: preset.a, b: preset.b, V0: preset.V0 });
  const flags = grid.map((phi) => scores(table, balls, cue, mk(phi), c));
  const n = grid.length;
  const out: PhiWindow[] = [];
  let i = 0;
  while (i < n) {
    if (!flags[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n && flags[j + 1]) j++;
    const refine = (inside: number, outside: number): number => {
      let a = inside;
      let b = outside;
      for (let it = 0; it < 8 && Math.abs(b - a) > 0.02 * DEG; it++) {
        const m = 0.5 * (a + b);
        if (scores(table, balls, cue, mk(m), c)) a = m;
        else b = m;
      }
      return a;
    };
    const lo = i > 0 ? refine(grid[i], grid[i - 1]) : grid[i];
    const hi = j < n - 1 ? refine(grid[j], grid[j + 1]) : grid[j];
    let center = 0.5 * (lo + hi);
    if (!scores(table, balls, cue, mk(center), c)) center = grid[Math.floor((i + j) / 2)];
    out.push({ lo, hi, center, preset });
    i = j + 1;
  }
  return out;
}
