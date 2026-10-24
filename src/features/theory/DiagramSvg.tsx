import { line } from 'd3-shape';
import { Crosshair } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { findDrill, findSystem, type DrillEntry } from '@/content/loader';
import { BALL_COLOR } from '@/lib/format';
import { Ball, TableSvg, sy } from './TableSvg';

const pathOf = line<{ x: number; y: number }>()
  .x((p) => p.x)
  .y((p) => p.y);

const STROKE: Record<string, string> = {
  white: '#ffffff',
  yellow: 'var(--color-ball-yellow)',
  red: '#ff6b77',
};

function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

export function DrillDiagram({ drill, showLink = true, animate = true }: { drill: DrillEntry; showLink?: boolean; animate?: boolean }) {
  const [ref, inView] = useInView<HTMLElement>();
  const paths = drill.paths ?? drill.computedPaths ?? [];
  const overlay = drill.annotations.find((a) => a.type === 'systemOverlay');
  const system = overlay && overlay.type === 'systemOverlay' ? findSystem(overlay.systemId) : undefined;
  const drawn = !animate || inView;
  return (
    <figure ref={ref} className="my-6">
      <TableSvg title={drill.title ?? drill.caption ?? drill.id} system={system} className="w-full" overlay={
        drill.annotations.map((a, i) =>
          a.type === 'label' ? (
            <text key={i} x={a.at.x} y={sy(a.at.y)} fontSize={0.2} fill="#fff" fontWeight={600} textAnchor="middle" paintOrder="stroke" stroke="rgba(0,0,0,0.55)" strokeWidth={0.05}>
              {a.text}
            </text>
          ) : null,
        )
      }>
        {paths.map((p, i) => (
          <path
            key={`${p.ball}-${i}`}
            d={pathOf(p.points) ?? ''}
            fill="none"
            stroke={STROKE[p.ball]}
            strokeWidth={p.style === 'solid' ? 0.045 : 0.035}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={p.style === 'dashed' ? undefined : 1}
            strokeDashoffset={p.style === 'dashed' ? undefined : drawn ? 0 : 1}
            opacity={p.style === 'dashed' ? (drawn ? 0.85 : 0) : 1}
            style={{ transition: `stroke-dashoffset 1.6s cubic-bezier(.3,.1,.2,1) ${i * 0.15}s, opacity .6s ease ${0.8 + i * 0.1}s` }}
          />
        ))}
        {drill.annotations.map((a, i) =>
          a.type === 'arrow' ? (
            <line key={`ar${i}`} x1={a.from.x} y1={a.from.y} x2={a.to.x} y2={a.to.y} stroke="#fff" strokeWidth={0.03} strokeDasharray="0.08 0.06" />
          ) : null,
        )}
        {(['white', 'yellow', 'red'] as const).map((id) => (
          <Ball key={id} x={drill.balls[id].x} y={drill.balls[id].y} color={BALL_COLOR[id]} />
        ))}
      </TableSvg>
      {(drill.caption || showLink) && (
        <figcaption className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 text-sm text-muted">
          {drill.caption && <span className="max-w-[60ch]">{drill.caption}</span>}
          {showLink && (
            <Link to={`/phong-tap?drill=${drill.id}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent">
              <Crosshair size={16} aria-hidden="true" /> Mở trong phòng tập
            </Link>
          )}
        </figcaption>
      )}
    </figure>
  );
}

export function Diagram({ id }: { id: string }) {
  const drill = findDrill(id);
  if (!drill) return null;
  return <DrillDiagram drill={drill} />;
}
