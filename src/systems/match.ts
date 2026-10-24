import type { SystemDefinition } from '../content/schema';
import type { CushionId } from '../engine/types';
import { bo50Correction } from './bo50';
import { SYMS, symCushion, symDir, symPoint, valueAt } from './numbering';

export interface SystemMatch {
  systemId: string;
  name: string;
  start: number;
  correction: number;
  aim: number;
  predicted: number;
  simulated: number;
  text: string;
}

interface Geo {
  L: number;
  W: number;
  D: number;
  offset: number;
}

/** First intersection of a ray with the start rails (L1 / S1 diamond lines, canonical frame). */
function backwardStart(cx: number, cy: number, dx: number, dy: number, g: Geo): { cushion: CushionId; diamond: number } | null {
  let best = Infinity;
  let res: { cushion: CushionId; diamond: number } | null = null;
  // Backward ray: p = c − s·d, s > 0
  if (dy > 1e-9) {
    const s = (cy + g.offset) / dy;
    const x = cx - s * dx;
    if (s > 0 && x >= -g.offset && x <= g.L + g.offset && s < best) {
      best = s;
      res = { cushion: 'L1', diamond: x / g.D };
    }
  }
  if (dx > 1e-9) {
    const s = (cx + g.offset) / dx;
    const y = cy - s * dy;
    if (s > 0 && y >= -g.offset && y <= g.W + g.offset && s < best) {
      res = { cushion: 'S1', diamond: y / g.D };
    }
  }
  return res;
}

const round = (x: number): number => Math.round(x);
const signed = (x: number): string => (x >= 0 ? `+ ${round(x)}` : `− ${round(-x)}`);

/**
 * §10.5 — compare a rail-first L-S-L shot with the Corner-5 ("bộ 50") prediction.
 * Only the corner5_subtractive family is matched for now (Plus / cúp numbering is still draft).
 */
export function matchSystem(
  def: SystemDefinition,
  table: { L: number; W: number; diamondOffset: number },
  cue: [number, number],
  phi: number,
  hits: Array<{ cushion: CushionId; pos: [number, number] }>,
): SystemMatch | undefined {
  if (def.family !== 'corner5_subtractive' || hits.length < 3) return undefined;
  const g: Geo = { L: table.L, W: table.W, D: table.L / 8, offset: table.diamondOffset };
  const aimCushion = def.numbering.aim[0]?.cushion ?? 'L2';
  const arrCushion = def.numbering.arrival[0]?.cushion ?? 'L1';
  for (const s of SYMS) {
    const seq = hits.slice(0, 3).map((h) => symCushion(s, h.cushion));
    if (seq[0] !== aimCushion || seq[1] !== 'S2' || seq[2] !== arrCushion) continue;
    const [cx, cy] = symPoint(s, cue[0], cue[1], g.L, g.W);
    const [dx, dy] = symDir(s, Math.cos(phi), Math.sin(phi));
    const st = backwardStart(cx, cy, dx, dy, g);
    if (!st) return undefined;
    const start = valueAt(def.numbering.start, st.cushion, st.diamond);
    if (start === null) return undefined;
    const threshold = typeof def.aimReference === 'object' ? def.aimReference.mixedThreshold : null;
    const through = def.aimReference === 'through_diamond' || (threshold !== null && start >= threshold);
    const yLine = g.W + (through ? g.offset : 0);
    if (dy <= 1e-9) return undefined;
    const ax = cx + ((yLine - cy) / dy) * dx;
    const aim = valueAt(def.numbering.aim, aimCushion, ax / g.D);
    const [hx] = symPoint(s, hits[2].pos[0], hits[2].pos[1], g.L, g.W);
    const simulated = valueAt(def.numbering.arrival, arrCushion, hx / g.D, 1.5);
    if (aim === null || simulated === null) return undefined;
    const correction = bo50Correction(start, def);
    const predicted = start + correction - aim;
    const name = def.names.vi;
    return {
      systemId: def.id,
      name,
      start,
      correction,
      aim,
      predicted,
      simulated,
      text: `${name}: ${round(start)} ${signed(correction)} − ${round(aim)} = ${round(predicted)} · Mô phỏng: về ${round(simulated)}`,
    };
  }
  return undefined;
}
