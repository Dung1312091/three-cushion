import type { ReactNode, SVGProps } from 'react';
import type { NumberingPoint, SystemDefinition } from '@/content/schema';

/** Table drawn in diamond units: play field 8 × 4, physics y up (flipped group). */
export const RAIL = 0.5;
export const BALL_R_D = 0.0866; // 30.75 mm / 355 mm
export const DIAMOND_OFFSET_D = 0.22; // 78 mm behind the nose
export const sy = (y: number): number => 4 - y;

export interface TableSvgProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Drawn in physics diamond coordinates (x right, y up). */
  children?: ReactNode;
  /** Drawn in SVG coordinates (use sy() for y) — for text that must not be mirrored. */
  overlay?: ReactNode;
  title: string;
  cloth?: string;
  system?: SystemDefinition;
}

export function TableSvg({ children, overlay, title, cloth = 'var(--color-cloth)', system, className, ...rest }: TableSvgProps) {
  const diamonds: Array<[number, number]> = [];
  for (let i = 1; i < 8; i++) {
    diamonds.push([i, -DIAMOND_OFFSET_D], [i, 4 + DIAMOND_OFFSET_D]);
  }
  for (let j = 1; j < 4; j++) {
    diamonds.push([-DIAMOND_OFFSET_D, j], [8 + DIAMOND_OFFSET_D, j]);
  }
  return (
    <svg viewBox={`${-RAIL} ${-RAIL} ${8 + 2 * RAIL} ${4 + 2 * RAIL}`} role="img" className={className} {...rest}>
      <title>{title}</title>
      <rect x={-RAIL} y={-RAIL} width={8 + 2 * RAIL} height={4 + 2 * RAIL} rx={0.22} fill="var(--color-rail)" />
      <rect x={-RAIL + 0.06} y={-RAIL + 0.06} width={8 + 2 * RAIL - 0.12} height={4 + 2 * RAIL - 0.12} rx={0.18} fill="none" stroke="var(--color-rail-light)" strokeWidth={0.03} />
      <rect x={-0.09} y={-0.09} width={8.18} height={4.18} rx={0.04} fill="var(--color-cloth-deep)" />
      <rect x={0} y={0} width={8} height={4} fill={cloth} />
      <g transform="matrix(1 0 0 -1 0 4)">
        {diamonds.map(([x, y]) => (
          <circle key={`${x}:${y}`} cx={x} cy={y} r={0.055} fill="var(--color-pearl)" />
        ))}
        {children}
      </g>
      {system && <SystemOverlay system={system} />}
      {overlay}
    </svg>
  );
}

function labelPos(p: NumberingPoint, ring: 'outer' | 'inner'): [number, number] {
  const off = ring === 'outer' ? DIAMOND_OFFSET_D + 0.17 : -0.2;
  switch (p.cushion) {
    case 'L1':
      return [p.diamond, sy(-off)];
    case 'L2':
      return [p.diamond, sy(4 + off)];
    case 'S1':
      return [-off, sy(p.diamond)];
    default:
      return [8 + off, sy(p.diamond)];
  }
}

/** Numbers of a system printed on the rail (start/aim) and just inside the nose (arrival). */
export function SystemOverlay({ system }: { system: SystemDefinition }) {
  const rows: Array<{ pts: NumberingPoint[]; ring: 'outer' | 'inner'; fill: string; key: string }> = [
    { pts: system.numbering.start, ring: 'outer', fill: 'var(--color-pearl)', key: 's' },
    { pts: system.numbering.aim, ring: 'outer', fill: 'var(--color-ball-yellow)', key: 'a' },
    { pts: system.numbering.arrival, ring: 'inner', fill: '#cfe0ff', key: 'r' },
  ];
  const seen = new Set<string>();
  return (
    <g fontFamily="var(--font-num)" fontWeight={600} fontSize={0.2} textAnchor="middle" dominantBaseline="central">
      {rows.flatMap((r) =>
        r.pts.map((p) => {
          const [x, y] = labelPos(p, r.ring);
          const k = `${r.ring}:${x.toFixed(2)}:${y.toFixed(2)}`;
          if (seen.has(k)) return null;
          seen.add(k);
          return (
            <text key={`${r.key}${k}`} x={x} y={y} fill={r.fill}>
              {p.value}
            </text>
          );
        }),
      )}
    </g>
  );
}

export function Ball({ x, y, color, ghost, r = BALL_R_D }: { x: number; y: number; color: string; ghost?: boolean; r?: number }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill={ghost ? 'none' : color}
      stroke={ghost ? color : 'rgba(0,0,0,0.35)'}
      strokeWidth={ghost ? 0.025 : 0.012}
      strokeDasharray={ghost ? '0.04 0.03' : undefined}
    />
  );
}
