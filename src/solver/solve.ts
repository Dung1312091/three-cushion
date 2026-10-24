import { simulate } from '../engine/simulate';
import type { BallId, CueStrike } from '../engine/types';
import { matchSystem } from '../systems/match';
import { classifyKisses, shotFamily } from './classify';
import { buildInstruction, DEFAULT_TIP_UNIT_R } from './instruct';
import { leaveScore } from './leave';
import { monteCarlo, quickProbability, tolerances } from './robustness';
import { DEFAULT_THETA, PRESETS, findWindows, phiGrid, type Counter, type PhiWindow } from './sweep';
import type { ShotOption, SolveRequest, SolveStats } from './types';
import { SKILL_NOISE } from './types';

export type SolveYield = { kind: 'tick' } | { kind: 'option'; option: ShotOption } | { kind: 'done'; stats: SolveStats };

/** Ranking score (§8.2 step 9). */
export function rankScore(o: Pick<ShotOption, 'pScore' | 'leaveScore' | 'kissRisk' | 'difficulty'>): number {
  return 0.6 * o.pScore + 0.2 * o.leaveScore - 0.15 * o.kissRisk - 0.05 * (o.difficulty / 5);
}

function difficultyOf(pBeginner: number): ShotOption['difficulty'] {
  if (pBeginner >= 0.6) return 1;
  if (pBeginner >= 0.4) return 2;
  if (pBeginner >= 0.25) return 3;
  if (pBeginner >= 0.1) return 4;
  return 5;
}

/** Keep at most `perFamily` options per (firstObject, railCode), best first. */
export function diversify(options: ShotOption[], max: number, perFamily = 2): ShotOption[] {
  const sorted = [...options].sort((a, b) => b.score - a.score);
  const count = new Map<string, number>();
  const out: ShotOption[] = [];
  for (const o of sorted) {
    const key = `${o.firstObject}|${o.family.firstContact}|${o.family.railCode}`;
    const n = count.get(key) ?? 0;
    if (n >= perFamily) continue;
    count.set(key, n + 1);
    out.push(o);
    if (out.length >= max) break;
  }
  return out;
}

const now = (): number => Date.now();

/**
 * Solver pipeline (§8.2) as a generator so a worker can yield to its event loop
 * (cancellation) and stream options as soon as they are ready.
 * `part`/`parts` split the stroke presets between workers.
 */
export function* solveIter(req: SolveRequest, part = 0, parts = 1): Generator<SolveYield> {
  const t0 = now();
  const deadline = t0 + req.budgetMs;
  const c: Counter = { sims: 0 };
  const { table, balls, cue } = req;
  const tipUnitR = req.tipUnitR ?? DEFAULT_TIP_UNIT_R;
  const grid = phiGrid(balls, cue, table.ballRadius);
  let partial = false;

  // 1–3. Sweep presets → φ windows.
  const windows: PhiWindow[] = [];
  for (let i = part; i < PRESETS.length; i += parts) {
    if (now() > deadline * 0.6 + t0 * 0.4) {
      partial = true;
      break;
    }
    windows.push(...findWindows(table, balls, cue, grid, PRESETS[i], c));
    yield { kind: 'tick' };
  }

  // Rank windows by their φ width under the requested skill (cheap proxy).
  const sPhi = SKILL_NOISE[req.skill].phiDeg * (Math.PI / 180);
  const pre = windows
    .map((w) => ({ w, p: Math.min(1, (w.hi - w.lo) / (4 * sPhi)) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 24);

  // 4–5. Tolerances + quick probability.
  type Cand = { strike: CueStrike; tol: ReturnType<typeof tolerances>; pQuick: number; pBeginner: number };
  const cands: Cand[] = [];
  for (const { w } of pre) {
    if (now() > deadline) {
      partial = true;
      break;
    }
    const strike: CueStrike = { phi: w.center, theta: DEFAULT_THETA, a: w.preset.a, b: w.preset.b, V0: w.preset.V0 };
    const tol = tolerances(table, balls, cue, strike, w.lo, w.hi, tipUnitR, c);
    cands.push({
      strike,
      tol,
      pQuick: quickProbability(tol, req.skill, tipUnitR),
      pBeginner: quickProbability(tol, 'beginner', tipUnitR),
    });
    yield { kind: 'tick' };
  }
  cands.sort((a, b) => b.pQuick - a.pQuick);

  // 6–8. Monte Carlo, leave, classification, instructions — stream each option.
  const familyLabels = req.familyLabels;
  const seen = new Map<string, number>();
  let emitted = 0;
  const limit = Math.max(4, Math.ceil((req.maxOptions * 2) / parts));
  for (const cd of cands) {
    if (emitted >= limit) break;
    if (now() > deadline + 400) {
      partial = true;
      break;
    }
    const res = simulate(table, balls, cue, cd.strike, { recordSegments: false });
    c.sims++;
    if (!res.rules.scored || !res.rules.firstObject) continue; // fine model disagrees with fast sweep
    const fam = shotFamily(res, familyLabels);
    const famKey = `${res.rules.firstObject}|${fam.firstContact}|${fam.railCode}`;
    if ((seen.get(famKey) ?? 0) >= 2) continue;
    seen.set(famKey, (seen.get(famKey) ?? 0) + 1);

    const mc = monteCarlo(table, balls, cue, cd.strike, req.skill, c);
    const kisses = classifyKisses(table, balls, cue, cd.strike, res);
    const kissOut = kisses.some((k) => k.effect === 'kiss-out' || k.effect === 'lucky');
    const finalPos = {} as Record<BallId, { x: number; y: number }>;
    for (const f of res.final) finalPos[f.id] = { x: f.r[0], y: f.r[1] };
    const leave = leaveScore(table, finalPos, cue);
    const cueBall = balls.find((b) => b.id === cue)!;
    let system;
    if (fam.firstContact === 'rail') {
      for (const def of req.systems ?? []) {
        system = matchSystem(def, table, [cueBall.r[0], cueBall.r[1]], cd.strike.phi, res.cueInfo.cushionHits);
        if (system) break;
      }
    }
    const difficulty = difficultyOf(cd.pBeginner);
    const kissRisk = Math.min(1, mc.kissRisk + (kissOut ? 0.1 : 0));
    const opt: ShotOption = {
      id: `${famKey}|${cd.strike.phi.toFixed(5)}|${cd.strike.V0}|${cd.strike.a}|${cd.strike.b}`,
      strike: cd.strike,
      firstObject: res.rules.firstObject,
      family: fam,
      system,
      pScore: mc.pScore,
      pScoreCI: mc.pScoreCI,
      kissRisk,
      tolerance: cd.tol,
      difficulty,
      leaveScore: leave,
      finalPositions: mc.final,
      instruction: buildInstruction(table, balls, cue, cd.strike, res, fam, system, tipUnitR),
      score: 0,
    };
    opt.score = rankScore(opt);
    emitted++;
    yield { kind: 'option', option: opt };
  }
  yield { kind: 'done', stats: { sims: c.sims, candidates: windows.length, elapsedMs: now() - t0, partial } };
}

/** Synchronous convenience wrapper (Node scripts). */
export function solve(req: SolveRequest): { options: ShotOption[]; stats: SolveStats } {
  const options: ShotOption[] = [];
  let stats: SolveStats = { sims: 0, candidates: 0, elapsedMs: 0, partial: false };
  for (const y of solveIter(req)) {
    if (y.kind === 'option') options.push(y.option);
    else if (y.kind === 'done') stats = y.stats;
  }
  return { options: diversify(options, req.maxOptions), stats };
}
