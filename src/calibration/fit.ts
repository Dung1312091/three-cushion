import type { SystemDefinition } from '../content/schema';
import type { PhysicsParams } from '../engine/params';
import { restingBalls, sampleTrack, simulate } from '../engine/simulate';
import { effectivePhysics, type TableProfile } from '../engine/table';
import { corner5Shot } from '../systems/canonical';
import { valueAt } from '../systems/numbering';

/** Table copy whose physics are `base` overridden by `p` (and no stored calibration). */
function withPhysics(t: TableProfile, p: Partial<PhysicsParams>): TableProfile {
  return { ...t, physics: { ...effectivePhysics(t), ...p }, calibration: undefined };
}

function golden(f: (x: number) => number, lo: number, hi: number, iters = 22): number {
  const g = (Math.sqrt(5) - 1) / 2;
  let a = lo;
  let b = hi;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  let fc = f(c);
  let fd = f(d);
  for (let i = 0; i < iters; i++) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - g * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + g * (b - a);
      fd = f(d);
    }
  }
  return (a + b) / 2;
}

export interface RollSample {
  /** Where the ball stopped, in diamonds from the S1 (starting) short rail. */
  stopDiamonds: number;
  /** Stopwatch time from strike to stop. */
  seconds: number;
}

/** Lag shot from S1 straight to S2 and back; returns distance travelled and the time the ball stopped rolling. */
function lag(t: TableProfile, V0: number): { dist: number; tStop: number } {
  const R = t.ballRadius;
  const res = simulate(t, restingBalls(t, { white: { x: R + 0.005, y: t.W / 2 } }), 'white', { phi: 0, theta: 0, a: 0, b: 0, V0 }, { fast: true });
  const tr = sampleTrack(res, 'white', 60);
  let dist = 0;
  for (let i = 2; i < tr.length; i += 2) dist += Math.hypot(tr[i] - tr[i - 2], tr[i + 1] - tr[i - 1]);
  let tStop = res.tEnd;
  for (const e of res.events) if (e.type === 'transition' && e.from === 'rolling') tStop = e.t;
  return { dist, tStop };
}

/** Step 1 (§12): fit μr so that the simulated lag reaching the reported stop matches the stopwatch time. */
export function fitRoll(table: TableProfile, samples: RollSample[]): { muRoll: number; rmsSeconds: number } {
  const D = table.L / 8;
  const R = table.ballRadius;
  const timeFor = (mu: number, s: RollSample): number => {
    const t = withPhysics(table, { muRoll: mu });
    const target = table.L - 2 * R - 0.005 + (table.L - R - s.stopDiamonds * D);
    let lo = 0.3;
    let hi = 8;
    for (let i = 0; i < 26; i++) {
      const mid = 0.5 * (lo + hi);
      if (lag(t, mid).dist < target) lo = mid;
      else hi = mid;
    }
    return lag(t, 0.5 * (lo + hi)).tStop;
  };
  const loss = (mu: number) => samples.reduce((acc, s) => acc + (timeFor(mu, s) - s.seconds) ** 2, 0) / samples.length;
  const muRoll = golden(loss, 0.003, 0.025, 18);
  return { muRoll, rmsSeconds: Math.sqrt(loss(muRoll)) };
}

/** Simulated arrival value of the 50-30-20 test shot (bộ 50 numbering), or null if the path is not L-S-L. */
export function arrival502030(table: TableProfile, def: SystemDefinition, tipUnitR: number, V0: number): number | null {
  const shot = corner5Shot(def, table, 50, 30, 2, tipUnitR, V0);
  if (!shot) return null;
  const res = simulate(table, restingBalls(table, { white: { x: shot.cue[0], y: shot.cue[1] } }), 'white', shot.strike, { recordSegments: false });
  const hits = res.cueInfo.cushionHits;
  if (hits.length < 3 || hits[0].cushion !== 'L2' || hits[1].cushion !== 'S2' || hits[2].cushion !== 'L1') return null;
  return valueAt(def.numbering.arrival, 'L1', hits[2].pos[0] / (table.L / 8), 2);
}

export interface SystemFit {
  eCushion: number;
  muCushion: number;
  rmsDiamonds: number;
  /** + = the table plays long (ball arrives further than the default model predicts), in diamonds. */
  playsLongShortDiamonds: number;
  simulatedDefault: number | null;
  simulatedFitted: number | null;
}

/** Step 2 (§12): coarse grid + golden-section on e_c, μw. Loss = mean (sim − actual)² in diamonds (10 points ≈ 1 diamond). */
export function fit502030(table: TableProfile, def: SystemDefinition, actual: number[], tipUnitR: number, V0: number): SystemFit {
  const p0 = effectivePhysics(table);
  const simulatedDefault = arrival502030(table, def, tipUnitR, V0);
  const loss = (e: number, mu: number): number => {
    const v = arrival502030(withPhysics(table, { eCushion: e, muCushion: mu }), def, tipUnitR, V0);
    if (v === null) return 1e6;
    // Mild pull toward the defaults so the 2-parameter fit stays well-posed.
    const reg = 4 * ((e - p0.eCushion) ** 2 + (mu - p0.muCushion) ** 2);
    return actual.reduce((acc, a) => acc + ((v - a) / 10) ** 2, 0) / actual.length + reg;
  };
  let best = { e: p0.eCushion, mu: p0.muCushion, l: loss(p0.eCushion, p0.muCushion) };
  for (let e = 0.62; e <= 0.92; e += 0.05) {
    for (let mu = 0.1; mu <= 0.23; mu += 0.03) {
      const l = loss(e, mu);
      if (l < best.l) best = { e, mu, l };
    }
  }
  const e = golden((x) => loss(x, best.mu), Math.max(0.55, best.e - 0.06), Math.min(0.95, best.e + 0.06), 14);
  const mu = golden((x) => loss(e, x), Math.max(0.05, best.mu - 0.04), Math.min(0.3, best.mu + 0.04), 12);
  const simulatedFitted = arrival502030(withPhysics(table, { eCushion: e, muCushion: mu }), def, tipUnitR, V0);
  const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
  const rms = simulatedFitted === null ? NaN : Math.sqrt(actual.reduce((acc, a) => acc + ((simulatedFitted - a) / 10) ** 2, 0) / actual.length);
  return {
    eCushion: e,
    muCushion: mu,
    rmsDiamonds: rms,
    playsLongShortDiamonds: simulatedDefault === null ? 0 : (mean - simulatedDefault) / 10,
    simulatedDefault,
    simulatedFitted,
  };
}
