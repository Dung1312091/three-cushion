/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import { bake } from '@/engine/bake';
import { restingBalls, sampleTrack, simulate, type SimResult } from '@/engine/simulate';
import { makeTable, type TableProfile } from '@/engine/table';
import type { BallId, BallState, CueStrike, RuleOutcome, SimEvent } from '@/engine/types';
import { classifyKisses } from '@/solver/classify';
import { contactOf } from '@/solver/instruct';
import { monteCarlo, tolerances } from '@/solver/robustness';
import { solveIter } from '@/solver/solve';
import type { Counter } from '@/solver/sweep';
import { scores } from '@/solver/sweep';
import type { BallContact, ShotOption, SkillLevel, SolveRequest, SolveStats } from '@/solver/types';

let cancelledEpoch = 0;

function tracksOf(res: SimResult, hz: number): Record<BallId, Float32Array> {
  const out = {} as Record<BallId, Float32Array>;
  for (const b of res.final) out[b.id] = sampleTrack(res, b.id, hz);
  return out;
}

export interface Prediction {
  tracks: Record<BallId, Float32Array>;
  rules: RuleOutcome;
  events: SimEvent[];
  tEnd: number;
  contact?: BallContact;
}

export interface Analysis {
  pScore: number;
  pScoreCI: [number, number];
  kissRisk: number;
  tolerance: { phiDeg: [number, number]; speedPct: [number, number]; sideTips: [number, number] };
}

export interface BenchStats {
  n: number;
  fast: { p50: number; p95: number };
  fine: { p50: number; p95: number };
  avgEvents: number;
}

const pctl = (xs: number[], p: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

const api = {
  simulateShot(table: TableProfile, balls: BallState[], cue: BallId, strike: CueStrike) {
    const result = simulate(table, balls, cue, strike, { recordSegments: true });
    result.rules.kisses = classifyKisses(table, balls, cue, strike, result);
    const baked = bake(result, 120);
    const tracks = tracksOf(result, 60);
    const buffers = [...Object.values(baked.quats), ...Object.values(tracks)].map((a) => a.buffer as ArrayBuffer);
    return Comlink.transfer({ result, baked, tracks }, buffers);
  },

  predict(table: TableProfile, balls: BallState[], cue: BallId, strike: CueStrike): Prediction {
    const result = simulate(table, balls, cue, strike, { recordSegments: true });
    const tracks = tracksOf(result, 30);
    const p: Prediction = { tracks, rules: result.rules, events: result.events.filter((e) => e.type !== 'transition'), tEnd: result.tEnd, contact: contactOf(table, result, cue) };
    return Comlink.transfer(p, Object.values(tracks).map((a) => a.buffer as ArrayBuffer));
  },

  async solve(req: SolveRequest, part: number, parts: number, epoch: number, onOption: (o: ShotOption) => void): Promise<SolveStats | null> {
    let last = Date.now();
    for (const y of solveIter(req, part, parts)) {
      if (cancelledEpoch >= epoch) return null;
      if (y.kind === 'option') onOption(y.option);
      else if (y.kind === 'done') return y.stats;
      if (Date.now() - last > 12) {
        await new Promise((r) => setTimeout(r, 0));
        last = Date.now();
      }
    }
    return null;
  },

  cancel(epoch: number) {
    cancelledEpoch = Math.max(cancelledEpoch, epoch);
  },

  /** "Phân tích độ chắc" for a manual strike (§8.4): φ window, tolerances and Monte Carlo. */
  analyze(table: TableProfile, balls: BallState[], cue: BallId, strike: CueStrike, skill: SkillLevel, tipUnitR: number): Analysis {
    const c: Counter = { sims: 0 };
    const deg = Math.PI / 180;
    const edge = (dir: 1 | -1): number => {
      if (!scores(table, balls, cue, strike, c)) return strike.phi;
      let inside = strike.phi;
      let step = 0.05 * deg;
      let outside = NaN;
      for (let i = 0; i < 40; i++) {
        const p = inside + dir * step;
        if (scores(table, balls, cue, { ...strike, phi: p }, c)) {
          inside = p;
          step *= 1.6;
        } else {
          outside = p;
          break;
        }
      }
      if (Number.isNaN(outside)) return inside;
      for (let i = 0; i < 10; i++) {
        const m = 0.5 * (inside + outside);
        if (scores(table, balls, cue, { ...strike, phi: m }, c)) inside = m;
        else outside = m;
      }
      return inside;
    };
    const lo = edge(-1);
    const hi = edge(1);
    const tolerance = tolerances(table, balls, cue, strike, lo, hi, tipUnitR, c);
    const mc = monteCarlo(table, balls, cue, strike, skill, c);
    return { pScore: mc.pScore, pScoreCI: mc.pScoreCI, kissRisk: mc.kissRisk, tolerance };
  },

  bench(n = 1000): BenchStats {
    const table = makeTable('UMB_MATCH');
    const balls = restingBalls(table, { white: { x: 0.7, y: 0.4 }, yellow: { x: 2.2, y: 1.0 }, red: { x: 1.4, y: 0.9 } });
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const shots: CueStrike[] = Array.from({ length: n }, () => ({
      phi: rnd() * 2 * Math.PI,
      theta: 0.087,
      a: (rnd() - 0.5) * 0.6,
      b: (rnd() - 0.5) * 0.6,
      V0: 1.5 + rnd() * 4.5,
    }));
    const fast: number[] = [];
    const fine: number[] = [];
    let events = 0;
    for (const s of shots) {
      const t0 = performance.now();
      const r = simulate(table, balls, 'white', s, { fast: true, recordSegments: false });
      fast.push(performance.now() - t0);
      events += r.events.length;
    }
    for (const s of shots.slice(0, Math.min(200, n))) {
      const t0 = performance.now();
      const r = simulate(table, balls, 'white', s, { recordSegments: true });
      bake(r, 120);
      fine.push(performance.now() - t0);
    }
    return {
      n,
      fast: { p50: pctl(fast, 0.5), p95: pctl(fast, 0.95) },
      fine: { p50: pctl(fine, 0.5), p95: pctl(fine, 0.95) },
      avgEvents: events / n,
    };
  },
};

export type SimApi = typeof api;
Comlink.expose(api);
