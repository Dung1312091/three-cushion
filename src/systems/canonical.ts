import type { SystemDefinition } from '../content/schema';
import type { TableProfile } from '../engine/table';
import type { CueStrike } from '../engine/types';
import { positionOf } from './numbering';

const DEG = Math.PI / 180;

/**
 * Canonical corner-5 (bộ 50) shot: the cue ball sits on the line from the start
 * value on the rail to the aim value on L2, ~30 cm into the table; running english
 * of `tips` tips (a > 0 is running for a ball heading up and right).
 */
export function corner5Shot(
  def: SystemDefinition,
  table: TableProfile,
  start: number,
  aim: number,
  tips: number,
  tipUnitR: number,
  V0: number,
): { cue: [number, number]; strike: CueStrike } | null {
  const D = table.L / 8;
  const off = table.diamondOffset;
  const s = positionOf(def.numbering.start, start);
  const a = positionOf(def.numbering.aim, aim);
  if (!s || !a) return null;
  const sp: [number, number] = s.cushion === 'L1' ? [s.diamond * D, -off] : [-off, s.diamond * D];
  const ap: [number, number] = [a.diamond * D, table.W + (start >= 50 ? off : 0)];
  const R = table.ballRadius;
  const dx = ap[0] - sp[0];
  const dy = ap[1] - sp[1];
  const len = Math.hypot(dx, dy);
  let cue: [number, number] = sp;
  for (let k = 0.05; k < 0.9; k += 0.01) {
    cue = [sp[0] + dx * k, sp[1] + dy * k];
    if (cue[0] > R + 0.06 && cue[1] > R + 0.06 && k * len > 0.3) break;
  }
  return {
    cue,
    strike: { phi: Math.atan2(ap[1] - cue[1], ap[0] - cue[0]), theta: 5 * DEG, a: Math.min(0.42, tips * tipUnitR), b: 0.12, V0 },
  };
}
