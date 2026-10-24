import type { BallId } from '@/engine/types';
import { numVi } from '@/lib/format';
import { usePractice } from '../store';

const FILL: Record<BallId, string> = { white: '#f4f3ec', yellow: '#f2c230', red: '#c9202f' };
const ZOOM = 2.5;
const SIZE = 132;

/** Magnifier above the finger while dragging on touch screens, with the position read out in diamonds (§13.3). */
export function Loupe() {
  const drag = usePractice((s) => s.drag);
  const balls = usePractice((s) => s.balls);
  const table = usePractice((s) => s.table);
  if (!drag || !drag.touch) return null;
  const p = balls[drag.id];
  const D = table.L / 8;
  const R = table.ballRadius;
  // World half-extent shown: SIZE px at ZOOM × the table's on-screen scale ≈ 0.1 m.
  const half = 0.1 / (ZOOM / 2.5);
  const left = Math.min(window.innerWidth - SIZE - 8, Math.max(8, drag.clientX - SIZE / 2));
  const top = Math.max(8, drag.clientY - SIZE - 64);
  return (
    <div className="pointer-events-none fixed z-50" style={{ left, top, width: SIZE }} aria-hidden="true">
      <svg viewBox={`${p.x - half} ${-(p.y + half)} ${2 * half} ${2 * half}`} width={SIZE} height={SIZE} className="rounded-full border-2 border-white shadow-2xl">
        <defs>
          <clipPath id="loupe-clip">
            <circle cx={p.x} cy={-p.y} r={half} />
          </clipPath>
        </defs>
        <g clipPath="url(#loupe-clip)">
          <rect x={p.x - half} y={-(p.y + half)} width={2 * half} height={2 * half} fill="#4a2e1c" />
          <rect x={0} y={-table.W} width={table.L} height={table.W} fill="#1d5bb8" />
          {(Object.keys(balls) as BallId[]).map((id) => (
            <circle key={id} cx={balls[id].x} cy={-balls[id].y} r={R} fill={FILL[id]} stroke={id === drag.id ? '#fff' : 'rgba(0,0,0,.4)'} strokeWidth={0.0015} />
          ))}
          <line x1={p.x - 0.006} x2={p.x + 0.006} y1={-p.y} y2={-p.y} stroke="#0e1a2b" strokeWidth={0.001} />
          <line y1={-p.y - 0.006} y2={-p.y + 0.006} x1={p.x} x2={p.x} stroke="#0e1a2b" strokeWidth={0.001} />
        </g>
      </svg>
      <p className="num mt-1 rounded-md bg-ink/90 px-2 py-0.5 text-center text-sm font-semibold text-white">
        {numVi(p.x / D, 2)} × {numVi(p.y / D, 2)} nút
      </p>
    </div>
  );
}
