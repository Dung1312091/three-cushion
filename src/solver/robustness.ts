import { simulate } from '../engine/simulate';
import type { TableProfile } from '../engine/table';
import type { BallId, BallState, CueStrike } from '../engine/types';
import { DEG } from '../engine/vec';
import { normalTable, phiCdf, wilson } from './rng';
import { scores, type Counter } from './sweep';
import { SKILL_NOISE, type SkillLevel } from './types';

export interface Tolerance {
  phiDeg: [number, number];
  speedPct: [number, number];
  sideTips: [number, number];
}

const STEPS = [0.02, 0.05, 0.1, 0.2, 0.3];

/** Largest tested step on each side that still scores (§8.2 step 4). */
function scanSide(test: (k: number) => boolean): number {
  let ok = 0;
  for (const k of STEPS) {
    if (test(k)) ok = k;
    else break;
  }
  return ok;
}

export function tolerances(
  table: TableProfile,
  balls: BallState[],
  cue: BallId,
  strike: CueStrike,
  phiLo: number,
  phiHi: number,
  tipUnitR: number,
  c: Counter,
): Tolerance {
  const vUp = scanSide((k) => scores(table, balls, cue, { ...strike, V0: strike.V0 * (1 + k) }, c));
  const vDn = scanSide((k) => scores(table, balls, cue, { ...strike, V0: strike.V0 * (1 - k) }, c));
  const lim = (a: number): boolean => a * a + strike.b * strike.b <= 0.25;
  const aUp = scanSide((k) => lim(strike.a + k) && scores(table, balls, cue, { ...strike, a: strike.a + k }, c));
  const aDn = scanSide((k) => lim(strike.a - k) && scores(table, balls, cue, { ...strike, a: strike.a - k }, c));
  return {
    phiDeg: [(phiLo - strike.phi) / DEG, (phiHi - strike.phi) / DEG],
    speedPct: [-vDn * 100, vUp * 100],
    sideTips: [-aDn / tipUnitR, aUp / tipUnitR],
  };
}

/** P ≈ Pφ·PV·Pa from the tolerance windows (§8.2 step 5). */
export function quickProbability(tol: Tolerance, skill: SkillLevel, tipUnitR: number): number {
  const n = SKILL_NOISE[skill];
  const win = (lo: number, hi: number, s: number): number => phiCdf(hi / s) - phiCdf(lo / s);
  const pPhi = win(tol.phiDeg[0], tol.phiDeg[1], n.phiDeg);
  // The scans are coarse: treat a zero-width side as half a step.
  const pv = win(Math.min(tol.speedPct[0], -1), Math.max(tol.speedPct[1], 1), n.speedPct);
  const pa = win(Math.min(tol.sideTips[0] * tipUnitR, -0.01), Math.max(tol.sideTips[1] * tipUnitR, 0.01), n.tipR);
  return pPhi * pv * pa;
}

export interface MonteCarlo {
  pScore: number;
  pScoreCI: [number, number];
  kissRisk: number;
  final: Record<BallId, { x: number; y: number; ellipse: { rx: number; ry: number; rot: number } }>;
}

const MC_SAMPLES = 64;
let sharedNoise: Float64Array | null = null;

export function noisyStrike(base: CueStrike, skill: SkillLevel, z: ArrayLike<number>, o: number, limit: number): CueStrike {
  const n = SKILL_NOISE[skill];
  let a = base.a + z[o + 2] * n.tipR;
  let b = base.b + z[o + 3] * n.tipR;
  const rr = Math.hypot(a, b);
  if (rr > limit) {
    a *= limit / rr;
    b *= limit / rr;
  }
  return {
    phi: base.phi + z[o] * n.phiDeg * DEG,
    V0: Math.max(0.3, base.V0 * (1 + (z[o + 1] * n.speedPct) / 100)),
    a,
    b,
    theta: Math.max(0, base.theta + z[o + 4] * n.thetaDeg * DEG),
  };
}

/** 64 noisy samples with common random numbers (§8.2 step 6). */
export function monteCarlo(
  table: TableProfile,
  balls: BallState[],
  cue: BallId,
  strike: CueStrike,
  skill: SkillLevel,
  c: Counter,
  samples = MC_SAMPLES,
): MonteCarlo {
  if (!sharedNoise || sharedNoise.length < samples * 5) sharedNoise = normalTable(samples, 5);
  const z = sharedNoise;
  let ok = 0;
  let kissOut = 0;
  const acc = new Map<BallId, { sx: number; sy: number; sxx: number; syy: number; sxy: number }>();
  for (const b of balls) acc.set(b.id, { sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0 });
  const limit = table.physics.miscueLimit;
  for (let k = 0; k < samples; k++) {
    const st = noisyStrike(strike, skill, z, k * 5, limit);
    c.sims++;
    const res = simulate(table, balls, cue, st, { fast: true, recordSegments: false });
    if (res.rules.scored) ok++;
    else if (res.rules.kisses.length > 0) kissOut++;
    for (const f of res.final) {
      const a = acc.get(f.id)!;
      a.sx += f.r[0];
      a.sy += f.r[1];
      a.sxx += f.r[0] * f.r[0];
      a.syy += f.r[1] * f.r[1];
      a.sxy += f.r[0] * f.r[1];
    }
  }
  const final = {} as MonteCarlo['final'];
  for (const [id, a] of acc) {
    const mx = a.sx / samples;
    const my = a.sy / samples;
    const cxx = Math.max(0, a.sxx / samples - mx * mx);
    const cyy = Math.max(0, a.syy / samples - my * my);
    const cxy = a.sxy / samples - mx * my;
    // Eigen-decomposition of the 2×2 covariance → 1σ ellipse.
    const tr = cxx + cyy;
    const det = cxx * cyy - cxy * cxy;
    const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    const l1 = tr / 2 + disc;
    const l2 = Math.max(0, tr / 2 - disc);
    const rot = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    final[id] = { x: mx, y: my, ellipse: { rx: Math.sqrt(l1), ry: Math.sqrt(l2), rot } };
  }
  return { pScore: ok / samples, pScoreCI: wilson(ok, samples), kissRisk: kissOut / samples, final };
}
