import type { BallId } from '@/engine/types';
import { THICKNESS, thicknessKey, type Side } from '../vocab';

const FILL: Record<BallId, string> = { white: 'var(--color-ball-white)', yellow: 'var(--color-ball-yellow)', red: 'var(--color-ball-red)' };

/**
 * The contact as the player sees it from behind the cue ball: the object ball, the cue ball laid over it
 * at the aimed offset (2(1 − fraction) radii), and the cue-ball centre line.
 */
export function ThicknessFigure({ fraction, side, object, cue, width = 150 }: { fraction: number; side: Side; object: BallId; cue: BallId; width?: number }) {
  const dx = (side === 'trái' ? -1 : 1) * 2 * (1 - fraction);
  const key = thicknessKey(fraction);
  return (
    <figure className="flex flex-col items-center gap-1.5">
      <svg viewBox="-3.2 -1.35 6.4 2.7" width={width} height={(width * 2.7) / 6.4} role="img" aria-label={`Độ dày ${THICKNESS[key].name}`}>
        <circle r={1} style={{ fill: FILL[object] }} stroke="rgba(0,0,0,0.3)" strokeWidth={0.04} />
        <circle cx={dx} r={1} style={{ fill: FILL[cue] }} fillOpacity={0.55} stroke="var(--fg)" strokeOpacity={0.7} strokeWidth={0.05} strokeDasharray="0.14 0.08" />
        <line x1={dx} y1={-1.3} x2={dx} y2={1.3} stroke="var(--accent)" strokeWidth={0.06} />
        <circle r={0.08} fill="var(--fg)" fillOpacity={0.6} />
      </svg>
      <figcaption className="text-xs text-muted">Nhìn từ sau bi cái</figcaption>
    </figure>
  );
}
