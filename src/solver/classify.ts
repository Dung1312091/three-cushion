import { railCode } from '../engine/rules';
import { simulate, type SimResult } from '../engine/simulate';
import { CUSHION_NORMAL, type TableProfile } from '../engine/table';
import type { BallId, BallState, CueStrike, KissInfo } from '../engine/types';
import type { ShotFamily } from './types';

export const DEFAULT_FAMILY_LABELS: Record<string, string> = {
  'rail+LSL': 'Thế sườn (bộ 50)',
  'rail+SLS': 'Cúp N-D-N',
  'rail+SLL': 'Plus (băng ngắn trước)',
  'rail+LLS': 'Hai băng dài',
  'rail+*': 'Băng trước',
  'ball+*': 'Bi trước',
};

/** Running vs reverse english at the cue ball's first cushion (§7). */
export function englishAtFirstRail(res: SimResult): ShotFamily['english'] {
  const h = res.cueInfo.cushionHits[0];
  if (!h || Math.abs(h.wz) < 3) return 'none';
  const [nx, ny] = CUSHION_NORMAL[h.cushion];
  const crossZ = nx * h.vIn[1] - ny * h.vIn[0];
  if (Math.abs(crossZ) < 1e-6) return 'none';
  return h.wz * crossZ < 0 ? 'running' : 'reverse';
}

export function shotFamily(res: SimResult, labels: Record<string, string> = DEFAULT_FAMILY_LABELS): ShotFamily {
  const fc = res.rules.firstContact;
  const code = railCode(res.rules.cueCushionSeq);
  const labelVi = labels[`${fc}+${code}`] ?? labels[`${fc}+*`] ?? DEFAULT_FAMILY_LABELS[`${fc}+*`];
  return { firstContact: fc, railCode: code, english: englishAtFirstRail(res), labelVi };
}

/** §7 — decide whether each kiss spoiled, saved or did not matter, by re-simulating without it. */
export function classifyKisses(
  table: TableProfile,
  balls: BallState[],
  cue: BallId,
  strike: CueStrike,
  res: SimResult,
): KissInfo[] {
  return res.rules.kisses.map((k) => {
    const alt = simulate(table, balls, cue, strike, { recordSegments: false, disableBallBall: [k.ballBallIndex] });
    let effect: KissInfo['effect'] = 'neutral';
    if (alt.rules.scored && !res.rules.scored) effect = 'kiss-out';
    else if (!alt.rules.scored && res.rules.scored) effect = 'lucky';
    return { ...k, effect };
  });
}
