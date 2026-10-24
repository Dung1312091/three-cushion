import { DEFAULT_PHYSICS, type PhysicsParams } from './params';
import type { BallId, CushionId } from './types';

export type TablePreset = 'UMB_MATCH' | 'MID_2540' | 'KR_DOMESTIC_MID' | 'HALF_MATCH' | 'SMALL' | 'CUSTOM';
export type ClothState = 'new_fast' | 'normal' | 'worn';

export interface TableCalibration {
  steps: Array<'roll' | 'system-50-30-20' | 'manual'>;
  fitted: Partial<PhysicsParams>;
  rmsDiamonds: number;
  samples: number;
  playsLongShortDiamonds: number;
  fittedAt: string;
}

export interface TableProfile {
  id: string;
  name: string;
  preset: TablePreset;
  L: number;
  W: number;
  cushionHeight: number;
  ballRadius: number;
  ballMass: number;
  diamondOffset: number;
  heated: boolean;
  cloth: ClothState;
  physics: PhysicsParams;
  calibration?: TableCalibration;
}

interface PresetSpec {
  L: number;
  W: number;
  cushionHeight: number;
  ballDiameter: number;
  ballMass: number;
  /** [CHƯA KIỂM CHỨNG] flags surfaced in the UI */
  unverified?: string;
}

export const PRESETS: Record<Exclude<TablePreset, 'CUSTOM'>, PresetSpec> = {
  UMB_MATCH: { L: 2.84, W: 1.42, cushionHeight: 0.037, ballDiameter: 0.0615, ballMass: 0.21 },
  MID_2540: { L: 2.54, W: 1.27, cushionHeight: 0.037, ballDiameter: 0.0615, ballMass: 0.21, unverified: 'Chiều cao băng cho bàn VN' },
  KR_DOMESTIC_MID: { L: 2.448, W: 1.224, cushionHeight: 0.04, ballDiameter: 0.0655, ballMass: 0.25, unverified: 'Khối lượng bi ngoại suy' },
  HALF_MATCH: { L: 2.3, W: 1.15, cushionHeight: 0.037, ballDiameter: 0.0615, ballMass: 0.21 },
  SMALL: { L: 2.1, W: 1.05, cushionHeight: 0.037, ballDiameter: 0.0615, ballMass: 0.21 },
};

export const PRESET_ORDER: Array<Exclude<TablePreset, 'CUSTOM'>> = [
  'UMB_MATCH',
  'MID_2540',
  'KR_DOMESTIC_MID',
  'HALF_MATCH',
  'SMALL',
];

/** §5.2 — starting physics by cloth state; calibration overrides these. */
export function physicsForCloth(cloth: ClothState, heated: boolean): PhysicsParams {
  if (cloth === 'new_fast' && heated) return { ...DEFAULT_PHYSICS, muSlide: 0.15, muRoll: 0.006 };
  if (cloth === 'worn' || !heated) {
    return { ...DEFAULT_PHYSICS, muSlide: 0.22, muRoll: 0.011, eCushion: DEFAULT_PHYSICS.eCushion - 0.03 };
  }
  return { ...DEFAULT_PHYSICS };
}

export function makeTable(
  preset: Exclude<TablePreset, 'CUSTOM'> = 'UMB_MATCH',
  opts: { cloth?: ClothState; heated?: boolean; name?: string; id?: string } = {},
): TableProfile {
  const p = PRESETS[preset];
  const cloth = opts.cloth ?? 'normal';
  const heated = opts.heated ?? true;
  return {
    id: opts.id ?? `preset:${preset}`,
    name: opts.name ?? preset,
    preset,
    L: p.L,
    W: p.W,
    cushionHeight: p.cushionHeight,
    ballRadius: p.ballDiameter / 2,
    ballMass: p.ballMass,
    diamondOffset: 0.078,
    heated,
    cloth,
    physics: physicsForCloth(cloth, heated),
  };
}

/** Physics actually used for a table: preset physics overridden by calibration. */
export function effectivePhysics(t: TableProfile): PhysicsParams {
  return t.calibration ? { ...t.physics, ...t.calibration.fitted } : t.physics;
}

/** Diamond spacing D = L/8 (carom tables are 2:1). */
export const diamondSize = (t: Pick<TableProfile, 'L'>): number => t.L / 8;

/** Contact angle sinθc = (h − R)/R for the cushion nose (§6.5.2). */
export function cushionContactSin(t: TableProfile): number {
  const p = effectivePhysics(t);
  if (p.cushionContactSin !== undefined) return p.cushionContactSin;
  return Math.max(0, Math.min(0.9, (t.cushionHeight - t.ballRadius) / t.ballRadius));
}

/** Inward normal (pointing into the cushion) for each cushion. */
export const CUSHION_NORMAL: Record<CushionId, [number, number]> = {
  S1: [-1, 0],
  S2: [1, 0],
  L1: [0, -1],
  L2: [0, 1],
};

export const isShortCushion = (c: CushionId): boolean => c === 'S1' || c === 'S2';

/** Break position (§5.3): red on foot spot, opponent on head spot, cue on head string. */
export function breakPositions(t: TableProfile, cue: BallId): Record<BallId, { x: number; y: number }> {
  const offset = 0.1825 * (t.L / 2.84);
  const other: BallId = cue === 'white' ? 'yellow' : 'white';
  const res = {} as Record<BallId, { x: number; y: number }>;
  res.red = { x: (3 * t.L) / 4, y: t.W / 2 };
  res[other] = { x: t.L / 4, y: t.W / 2 };
  res[cue] = { x: t.L / 4, y: t.W / 2 + offset };
  return res;
}
