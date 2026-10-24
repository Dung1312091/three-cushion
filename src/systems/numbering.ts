import type { NumberingPoint } from '../content/schema';
import type { CushionId } from '../engine/types';

/** Piecewise-linear lookup in a [x, y] table, clamped at both ends. */
export function interpTable(points: Array<[number, number]>, x: number): number {
  if (points.length === 0) return 0;
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

/**
 * System value at a position along one cushion (diamond units, canonical frame).
 * Extrapolates at most `maxExtra` diamonds beyond the numbered range.
 */
export function valueAt(points: NumberingPoint[], cushion: CushionId, diamond: number, maxExtra = 0.75): number | null {
  const pts = points.filter((p) => p.cushion === cushion).sort((a, b) => a.diamond - b.diamond);
  if (pts.length < 2) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (diamond < first.diamond - maxExtra || diamond > last.diamond + maxExtra) return null;
  let i = 1;
  while (i < pts.length - 1 && diamond > pts[i].diamond) i++;
  const a = pts[i - 1];
  const b = pts[i];
  if (b.diamond === a.diamond) return a.value;
  return a.value + ((b.value - a.value) * (diamond - a.diamond)) / (b.diamond - a.diamond);
}

/** Inverse lookup: where along the rails a value sits (first matching span in listed order). */
export function positionOf(points: NumberingPoint[], value: number): { cushion: CushionId; diamond: number } | null {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.cushion !== b.cushion) continue;
    const lo = Math.min(a.value, b.value);
    const hi = Math.max(a.value, b.value);
    if (value >= lo && value <= hi) {
      const t = b.value === a.value ? 0 : (value - a.value) / (b.value - a.value);
      return { cushion: a.cushion, diamond: a.diamond + t * (b.diamond - a.diamond) };
    }
  }
  return null;
}

/** The 4 symmetries of the rectangle; systems are stored in one canonical orientation. */
export type Sym = 'id' | 'fx' | 'fy' | 'r180';
export const SYMS: Sym[] = ['id', 'fx', 'fy', 'r180'];

export function symPoint(s: Sym, x: number, y: number, L: number, W: number): [number, number] {
  switch (s) {
    case 'fx':
      return [L - x, y];
    case 'fy':
      return [x, W - y];
    case 'r180':
      return [L - x, W - y];
    default:
      return [x, y];
  }
}

export function symDir(s: Sym, dx: number, dy: number): [number, number] {
  switch (s) {
    case 'fx':
      return [-dx, dy];
    case 'fy':
      return [dx, -dy];
    case 'r180':
      return [-dx, -dy];
    default:
      return [dx, dy];
  }
}

export function symCushion(s: Sym, c: CushionId): CushionId {
  const flipS = s === 'fx' || s === 'r180';
  const flipL = s === 'fy' || s === 'r180';
  if (c === 'S1') return flipS ? 'S2' : 'S1';
  if (c === 'S2') return flipS ? 'S1' : 'S2';
  if (c === 'L1') return flipL ? 'L2' : 'L1';
  return flipL ? 'L1' : 'L2';
}

/** World point of a (cushion, diamond) reference at a given offset behind the nose (m). */
export function railPoint(c: CushionId, diamond: number, D: number, L: number, W: number, offset: number): [number, number] {
  switch (c) {
    case 'S1':
      return [-offset, diamond * D];
    case 'S2':
      return [L + offset, diamond * D];
    case 'L1':
      return [diamond * D, -offset];
    default:
      return [diamond * D, W + offset];
  }
}
