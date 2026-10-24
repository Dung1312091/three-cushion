import { findDrill, findSystem } from '@/content/loader';
import { restingBalls, sampleTrack, simulate } from '@/engine/simulate';
import { makeTable, type TablePreset, type TableProfile } from '@/engine/table';
import type { BallId, CueStrike } from '@/engine/types';
import { speedLevel } from '@/solver/instruct';
import { corner5Shot } from '@/systems/canonical';
import { decodeLayout } from '@/lib/share';
import type { Layout } from './store';

export interface PracticeLoad {
  table?: TableProfile;
  cue: BallId;
  balls: Layout;
  strike?: CueStrike;
  title?: string;
}

const DEG = Math.PI / 180;

function fromDrill(id: string): PracticeLoad | null {
  const d = findDrill(id);
  if (!d) return null;
  const table = makeTable(d.table);
  const D = table.L / 8;
  const balls = {} as Layout;
  for (const b of ['white', 'yellow', 'red'] as BallId[]) balls[b] = { x: d.balls[b].x * D, y: d.balls[b].y * D };
  const s = d.strike;
  return {
    table,
    cue: d.cue,
    balls,
    strike: s ? { phi: s.phiDeg * DEG, theta: s.thetaDeg * DEG, a: s.a, b: s.b, V0: s.V0 } : undefined,
    title: d.title,
  };
}

/** V0 giving a "medium" force (level ≈ 5) on this table — the speed bộ 50 assumes. */
export function mediumSpeed(table: TableProfile): number {
  let best = 3;
  let bestErr = Infinity;
  for (let v = 1.5; v <= 6; v += 0.25) {
    const err = Math.abs(speedLevel(table, v, 5 * DEG) - 5);
    if (err < bestErr) {
      bestErr = err;
      best = v;
    }
  }
  return best;
}

/** Build the canonical corner-5 shot from calculator values, with object balls placed off the cue path. */
function fromSystem(params: URLSearchParams, tipUnitR: number): PracticeLoad | null {
  const def = findSystem(params.get('sys') ?? '');
  if (!def || def.family !== 'corner5_subtractive') return null;
  const start = Number(params.get('start') ?? 50);
  const aim = Number(params.get('aim') ?? 30);
  const tips = Number(params.get('tips') ?? def.base.spinTips);
  const table = makeTable('UMB_MATCH');
  const D = table.L / 8;
  const shot = corner5Shot(def, table, start, aim, tips, tipUnitR, mediumSpeed(table));
  if (!shot) return null;
  const { cue, strike } = shot;
  // Park the object balls where the cue ball does not go.
  const solo = simulate(table, restingBalls(table, { white: { x: cue[0], y: cue[1] } }), 'white', strike);
  const tr = sampleTrack(solo, 'white', 60);
  const cands: Array<{ x: number; y: number; d: number }> = [];
  for (let gx = 0.5; gx <= 7.5; gx += 0.5) {
    for (let gy = 0.5; gy <= 3.5; gy += 0.5) {
      const x = gx * D;
      const y = gy * D;
      let d = Infinity;
      for (let i = 0; i < tr.length; i += 2) d = Math.min(d, Math.hypot(tr[i] - x, tr[i + 1] - y));
      if (Math.hypot(x - cue[0], y - cue[1]) > 0.2) cands.push({ x, y, d });
    }
  }
  cands.sort((p, q) => q.d - p.d);
  const first = cands[0];
  const second = cands.find((c) => Math.hypot(c.x - first.x, c.y - first.y) > 0.25) ?? cands[1];
  return {
    table,
    cue: 'white',
    balls: { white: { x: cue[0], y: cue[1] }, yellow: { x: first.x, y: first.y }, red: { x: second.x, y: second.y } },
    strike,
    title: `${def.names.vi}: đầu ${start}, ngắm ${aim}`,
  };
}

export function loadFromParams(params: URLSearchParams, tipUnitR: number): PracticeLoad | null {
  const drill = params.get('drill');
  if (drill) return fromDrill(drill);
  if (params.get('sys')) return fromSystem(params, tipUnitR);
  const code = params.get('l');
  if (code) {
    const l = decodeLayout(code);
    if (!l) return null;
    const table = l.preset !== 'CUSTOM' ? makeTable(l.preset as Exclude<TablePreset, 'CUSTOM'>) : undefined;
    return { table, cue: l.cue, balls: l.balls, strike: l.strike };
  }
  return null;
}
