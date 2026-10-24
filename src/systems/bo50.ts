import type { SystemDefinition } from '../content/schema';
import { interpTable } from './numbering';

/** §10.2 — correction by start value (single source, [CẦN HLV DUYỆT]). */
export const BO50_START_CORRECTION: Array<[number, number]> = [
  [20, -6],
  [30, -4],
  [35, -3],
  [40, -2],
  [45, -1],
  [50, 0],
  [60, 3],
  [70, 5],
  [80, 8],
  [90, 10],
  [100, 13],
];

/** Points per tip of english beyond the base 2 tips (Hàn/Atlas: 1 tip ≈ 7). [CẦN HLV DUYỆT] */
export const POINTS_PER_TIP = 7;

function startTable(def?: SystemDefinition): Array<[number, number]> {
  const c = def?.corrections.find((x) => x.variable === 'start');
  return c ? (c.points as Array<[number, number]>) : BO50_START_CORRECTION;
}

export function bo50Correction(start: number, def?: SystemDefinition): number {
  return interpTable(startTable(def), start);
}

/** Aim = Start + Correction(Start) − Arrival. bo50Aim(30, 20) = 6, bo50Aim(70, 30) = 45. */
export function bo50Aim(start: number, arrival: number, def?: SystemDefinition): number {
  return start + bo50Correction(start, def) - arrival;
}

export function bo50Arrival(start: number, aim: number, def?: SystemDefinition): number {
  return start + bo50Correction(start, def) - aim;
}

/** Shift of the arrival value when using a different amount of english than the base 2 tips. */
export function bo50TipShift(tips: number, baseTips = 2): number {
  return (tips - baseTips) * POINTS_PER_TIP;
}
