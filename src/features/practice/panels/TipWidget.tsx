import { useRef } from 'react';
import { tipClock } from '@/solver/instruct';
import { numVi } from '@/lib/format';

export interface TipWidgetProps {
  a: number;
  b: number;
  tipUnitR: number;
  limit: number;
  onChange?: (a: number, b: number) => void;
  size?: number;
}

/** Cue-ball face (§13.5): 12 clock marks, 1/2/3-tip rings, red miscue ring, contact dot. Draggable when onChange is set. */
export function TipWidget({ a, b, tipUnitR, limit, onChange, size = 168 }: TipWidgetProps) {
  const ref = useRef<SVGSVGElement>(null);
  const editable = !!onChange;
  const { clock, tips } = tipClock(a, b, tipUnitR);

  const update = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !onChange) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2.4 - 1.2;
    const y = ((e.clientY - r.top) / r.height) * 2.4 - 1.2;
    let na = x;
    let nb = -y;
    const m = Math.hypot(na, nb);
    if (m > limit) {
      na = (na * limit) / m;
      nb = (nb * limit) / m;
    }
    onChange(Math.round(na * 100) / 100, Math.round(nb * 100) / 100);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!onChange) return;
    const step = e.shiftKey ? 0.05 : 0.01;
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    onChange(a + d[0], b + d[1]);
  };

  return (
    <figure className="flex flex-col items-center gap-1.5">
      <svg
        ref={ref}
        viewBox="-1.2 -1.2 2.4 2.4"
        width={size}
        height={size}
        role={editable ? 'slider' : 'img'}
        aria-label={`Điểm chạm: ${clock} giờ, ${numVi(tips)} tip`}
        aria-valuetext={`${clock} giờ, ${numVi(tips)} tip`}
        tabIndex={editable ? 0 : undefined}
        onKeyDown={onKey}
        className={editable ? 'cursor-crosshair touch-none rounded-full' : undefined}
        onPointerDown={(e) => {
          if (!editable) return;
          (e.target as Element).setPointerCapture(e.pointerId);
          update(e);
        }}
        onPointerMove={(e) => {
          if (editable && e.buttons) update(e);
        }}
      >
        <circle r={1} fill="#f4f3ec" stroke="rgba(0,0,0,0.25)" strokeWidth={0.02} />
        {[1, 2, 3].map((k) => (
          <circle key={k} r={k * tipUnitR} fill="none" stroke="#0e1a2b" strokeOpacity={0.22} strokeWidth={0.012} />
        ))}
        <circle r={limit} fill="none" stroke="#cc2936" strokeWidth={0.025} strokeDasharray="0.06 0.04" />
        {Array.from({ length: 12 }, (_, i) => {
          const ang = (i * Math.PI) / 6;
          const s = Math.sin(ang);
          const c = -Math.cos(ang);
          return <line key={i} x1={s * 0.88} y1={c * 0.88} x2={s * (i % 3 === 0 ? 0.74 : 0.8)} y2={c * (i % 3 === 0 ? 0.74 : 0.8)} stroke="#0e1a2b" strokeOpacity={0.45} strokeWidth={0.025} />;
        })}
        <line x1={-1} y1={0} x2={1} y2={0} stroke="#0e1a2b" strokeOpacity={0.1} strokeWidth={0.01} />
        <line x1={0} y1={-1} x2={0} y2={1} stroke="#0e1a2b" strokeOpacity={0.1} strokeWidth={0.01} />
        <circle cx={a} cy={-b} r={0.085} fill="#1d5bb8" stroke="#fff" strokeWidth={0.025} />
      </svg>
      <figcaption className="num text-lg font-semibold">
        {tips === 0 ? 'Giữa tâm' : `${numVi(clock)} giờ, ${numVi(tips)} tip`}
      </figcaption>
    </figure>
  );
}

/** Side view of the cue elevation. */
export function ElevationFigure({ deg }: { deg: number }) {
  const r = (deg * Math.PI) / 180;
  const x2 = -Math.cos(r) * 2.4;
  const y2 = -Math.sin(r) * 2.4;
  return (
    <figure className="flex flex-col items-center gap-1.5">
      <svg viewBox="-2.6 -1.6 3.4 2" width={150} height={88} role="img" aria-label={`Nâng cơ ${deg}°`}>
        <line x1={-2.6} y1={0.4} x2={0.8} y2={0.4} stroke="currentColor" strokeOpacity={0.35} strokeWidth={0.04} />
        <circle cx={0} cy={0} r={0.4} fill="#f4f3ec" />
        <line x1={-0.42 * Math.cos(r)} y1={-0.42 * Math.sin(r) * 0.2} x2={x2} y2={y2} stroke="#d9c3a0" strokeWidth={0.1} strokeLinecap="round" transform={`translate(0 ${-0.42 * Math.sin(r) * 0.8})`} />
      </svg>
      <figcaption className="num text-lg font-semibold">Nâng cơ {Math.round(deg)}°</figcaption>
    </figure>
  );
}
