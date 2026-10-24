import { isShortCushion } from './table';
import type { BallId, CushionId, KissInfo, RuleOutcome, SimEvent } from './types';

export interface RuleContext {
  cue: BallId;
  firstObject?: BallId;
  secondObject?: BallId;
  cushions: number;
  scored: boolean;
  /** The cue ball reached the second object ball with fewer than 3 cushions. */
  failed: boolean;
}

/**
 * Incremental three-cushion rule tracker (§7). Fed every event in order.
 * A point: the cue ball contacts both object balls and, before contacting the
 * second one, has touched cushions at least 3 times (any cushions, repeats count).
 */
export class RuleTracker {
  readonly ctx: RuleContext;
  private seq: CushionId[] = [];
  private firstContact: 'ball' | 'rail' | undefined;
  private kisses: KissInfo[] = [];
  private ballBallIndex = 0;
  private tSecond: number | undefined;

  constructor(cue: BallId) {
    this.ctx = { cue, cushions: 0, scored: false, failed: false };
  }

  onEvent(e: SimEvent): void {
    const c = this.ctx;
    if (e.type === 'ball-cushion') {
      if (e.ball === c.cue && !c.secondObject) {
        c.cushions++;
        this.seq.push(e.cushion);
        if (!this.firstContact) this.firstContact = 'rail';
      }
      return;
    }
    if (e.type !== 'ball-ball') return;
    const idx = this.ballBallIndex++;
    const involvesCue = e.a === c.cue || e.b === c.cue;
    if (!involvesCue) {
      if (!c.secondObject) this.kisses.push({ t: e.t, pair: [e.a, e.b], kind: 'object-object', effect: 'neutral', ballBallIndex: idx });
      return;
    }
    const other = e.a === c.cue ? e.b : e.a;
    if (!this.firstContact) this.firstContact = 'ball';
    if (!c.firstObject) {
      c.firstObject = other;
    } else if (other !== c.firstObject && !c.secondObject) {
      c.secondObject = other;
      this.tSecond = e.t;
      c.scored = c.cushions >= 3;
      c.failed = !c.scored;
    } else if (!c.secondObject) {
      this.kisses.push({ t: e.t, pair: [c.cue, other], kind: 'cue-object-repeat', effect: 'neutral', ballBallIndex: idx });
    }
  }

  outcome(): RuleOutcome {
    const c = this.ctx;
    return {
      scored: c.scored,
      firstObject: c.firstObject,
      secondObject: c.secondObject,
      cushionsBeforeSecond: c.cushions,
      cueCushionSeq: [...this.seq],
      firstContact: this.firstContact ?? 'rail',
      kisses: this.kisses.map((k) => ({ ...k })),
      tSecond: this.tSecond,
    };
  }
}

export function evaluateRules(events: SimEvent[], cue: BallId): RuleOutcome {
  const tr = new RuleTracker(cue);
  for (const e of events) tr.onEvent(e);
  return tr.outcome();
}

/** "LSL", "SLS", … from the cue ball's first three cushions (§7). */
export function railCode(seq: CushionId[], n = 3): string {
  return seq
    .slice(0, n)
    .map((c) => (isShortCushion(c) ? 'S' : 'L'))
    .join('');
}

export function objectBalls(cue: BallId): [BallId, BallId] {
  if (cue === 'white') return ['yellow', 'red'];
  if (cue === 'yellow') return ['white', 'red'];
  return ['white', 'yellow'];
}
