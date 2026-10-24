import { motionCoeffs, slip } from '../engine/motion';
import { strikeBall } from '../engine/resolve/cue';
import { simulate, type SimResult, sampleTrack } from '../engine/simulate';
import { effectivePhysics, type TableProfile } from '../engine/table';
import type { BallId, BallState, CueStrike, CushionId } from '../engine/types';
import { DEG } from '../engine/vec';
import type { HumanInstruction, ShotFamily, SystemMatch } from './types';

export const DEFAULT_TIP_UNIT_R = 0.15;

const BALL_VI: Record<BallId, string> = { white: 'bi trắng', yellow: 'bi vàng', red: 'bi đỏ' };
export const CUSHION_VI: Record<CushionId, string> = {
  S1: 'băng ngắn trái',
  S2: 'băng ngắn phải',
  L1: 'băng dài dưới',
  L2: 'băng dài trên',
};

const THICK_LABELS: Array<[number, string]> = [
  [1 / 8, '1/8'],
  [1 / 4, '1/4'],
  [3 / 8, '3/8'],
  [1 / 2, '1/2'],
  [5 / 8, '5/8'],
  [3 / 4, '3/4'],
  [7 / 8, '7/8'],
  [1, 'đầy'],
];

export function thicknessLabel(fraction: number): string {
  let best = THICK_LABELS[0];
  for (const l of THICK_LABELS) if (Math.abs(l[0] - fraction) < Math.abs(best[0] - fraction)) best = l;
  return best[1];
}

/** "Giờ" + tip (§9): 12 = top, 3 = right. */
export function tipClock(a: number, b: number, tipUnitR = DEFAULT_TIP_UNIT_R): { clock: number; tips: number } {
  const ang = Math.atan2(a, b) / DEG;
  let clock = Math.round(((ang / 30 + 12) % 12) * 2) / 2;
  if (clock === 0) clock = 12;
  return { clock, tips: Math.round((Math.hypot(a, b) / tipUnitR) * 2) / 2 };
}

const levelCache = new Map<string, number>();

/**
 * Force level = table lengths travelled by a centre-hit ball sent along the
 * table (cushion losses included), rounded to 1–10. [CẦN HLV DUYỆT thang lực]
 */
export function speedLevel(table: TableProfile, V0: number, theta: number): number {
  const key = `${table.id}|${table.L}|${V0.toFixed(2)}|${theta.toFixed(3)}|${JSON.stringify(table.calibration?.fitted ?? {})}`;
  const hit = levelCache.get(key);
  if (hit !== undefined) return hit;
  const R = table.ballRadius;
  const ball: BallState = { id: 'white', r: [R + 0.02, table.W / 2, R], v: [0, 0, 0], w: [0, 0, 0], s: 'stationary' };
  const res = simulate(table, [ball], 'white', { phi: 0, theta, a: 0, b: 0, V0 }, { fast: true });
  const tr = sampleTrack(res, 'white', 30);
  let d = 0;
  for (let i = 2; i < tr.length; i += 2) d += Math.hypot(tr[i] - tr[i - 2], tr[i + 1] - tr[i - 1]);
  const level = Math.max(1, Math.min(10, Math.round(d / table.L)));
  levelCache.set(key, level);
  return level;
}

function strokeOf(strike: CueStrike, slidingAtImpact: boolean): HumanInstruction['stroke'] {
  const th = strike.theta / DEG;
  if (th > 45) return 'masse';
  if (th > 20 && Math.abs(strike.b) < 0.15) return 'bo';
  if (strike.b > 0.2) return 'cule';
  if (strike.b < -0.2) return 'tro';
  if (Math.abs(strike.b) <= 0.2 && slidingAtImpact) return 'dan';
  return 'thuong';
}

export const STROKE_VI: Record<HumanInstruction['stroke'], string> = {
  thuong: 'đánh thường',
  cule: 'culê',
  tro: 'trô',
  dan: 'dằn',
  masse: 'mát-xê',
  bo: 'cú bổ',
};

const fmt1 = (x: number): string => (Math.abs(x) < 0.05 ? 0 : x).toFixed(1).replace('.', ',');

/** Diamond reading of the aim line on a cushion, through the diamond on the rail top or on the nose. */
export function aimDiamond(table: TableProfile, from: [number, number], phi: number, cushion: CushionId, through: boolean): number {
  const off = through ? table.diamondOffset : 0;
  const D = table.L / 8;
  const dx = Math.cos(phi);
  const dy = Math.sin(phi);
  if (cushion === 'L1' || cushion === 'L2') {
    const yl = cushion === 'L2' ? table.W + off : -off;
    return (from[0] + ((yl - from[1]) / dy) * dx) / D;
  }
  const xl = cushion === 'S2' ? table.L + off : -off;
  return (from[1] + ((xl - from[0]) / dx) * dy) / D;
}

export function buildInstruction(
  table: TableProfile,
  balls: BallState[],
  cue: BallId,
  strike: CueStrike,
  res: SimResult,
  family: ShotFamily,
  system: SystemMatch | undefined,
  tipUnitR = DEFAULT_TIP_UNIT_R,
): HumanInstruction {
  const cueBall = balls.find((b) => b.id === cue)!;
  const from: [number, number] = [cueBall.r[0], cueBall.r[1]];
  const firstObject = res.rules.firstObject;
  const aim: HumanInstruction['aim'] = { mode: family.firstContact === 'ball' ? 'ball-first' : 'rail-first' };

  const hit = res.cueInfo.firstObjectHit;
  let slidingAtImpact = false;
  if (family.firstContact === 'ball' && hit) {
    const nx = hit.objPos[0] - hit.cuePos[0];
    const ny = hit.objPos[1] - hit.cuePos[1];
    const nl = Math.hypot(nx, ny);
    const vl = Math.hypot(hit.vIn[0], hit.vIn[1]);
    const cosCut = (hit.vIn[0] * nx + hit.vIn[1] * ny) / (nl * vl);
    const sinCut = Math.sqrt(Math.max(0, 1 - cosCut * cosCut));
    const fraction = 1 - sinCut;
    const crossZ = hit.vIn[0] * ny - hit.vIn[1] * nx;
    aim.ghostBall = { x: hit.cuePos[0], y: hit.cuePos[1] };
    aim.thickness = { fraction, label: thicknessLabel(fraction), side: crossZ < 0 ? 'trái' : 'phải' };
    const p = effectivePhysics(table);
    const o = strikeBall(strike, table.ballRadius, table.ballMass, p);
    const u = slip(o.v, o.w, table.ballRadius);
    const tSlide = Math.hypot(u[0], u[1]) > 1e-6 ? motionCoeffs('sliding', o.v, o.w, table.ballRadius, p).tTrans : 0;
    slidingAtImpact = hit.t < tSlide;
  } else {
    const h = res.cueInfo.cushionHits[0];
    if (h) {
      const through = !system || system.start >= 50;
      const maxD = h.cushion === 'L1' || h.cushion === 'L2' ? 8 : 4;
      const diamond = Math.min(maxD, Math.max(0, aimDiamond(table, from, strike.phi, h.cushion, through)));
      aim.railPoint = { cushion: h.cushion, diamond, throughDiamond: through };
    }
    if (system) aim.systemNumber = { systemId: system.systemId, value: Math.round(system.aim) };
  }

  const { clock, tips } = tipClock(strike.a, strike.b, tipUnitR);
  const level = speedLevel(table, strike.V0, strike.theta);
  const stroke = strokeOf(strike, slidingAtImpact);
  const english: HumanInstruction['english'] =
    family.english === 'running' ? 'thuận' : family.english === 'reverse' ? 'nghịch' : 'không';
  const elevationDeg = Math.round(strike.theta / DEG);

  const target = firstObject ? BALL_VI[firstObject] : 'bi mục tiêu';
  let aimText: string;
  if (aim.thickness) aimText = `chạm ${aim.thickness.side} ${aim.thickness.label} ${target}`;
  else if (aim.railPoint) {
    aimText = `ngắm ${CUSHION_VI[aim.railPoint.cushion]}, nút ${fmt1(aim.railPoint.diamond)} (${aim.railPoint.throughDiamond ? 'xuyên nút' : 'trước mặt nút'})`;
    if (aim.systemNumber) aimText += `, bộ số ${aim.systemNumber.value}`;
  } else aimText = 'theo đường ngắm trên bàn';

  const arrival = res.cueInfo.cushionHits[2];
  const arrivalText = arrival ? `, về ${CUSHION_VI[arrival.cushion]}` : '';
  const tipText = tips === 0 ? 'giữa tâm' : `${fmt1(clock).replace(',0', '')} giờ ${fmt1(tips).replace(',0', '')} tip`;
  const summaryVi =
    `Đánh ${family.firstContact === 'ball' ? 'bi trước' : 'băng trước'} vào ${target}: ${aimText}, ` +
    `điểm chạm ${tipText} (ép phê ${english}), nâng cơ ${elevationDeg}°, lực ${level}/10. ` +
    `Bi cái đi ${family.labelVi}${family.railCode ? ` (${family.railCode.split('').join('-')})` : ''}${arrivalText}.`;

  return {
    aim,
    tip: { clock, tips, a: strike.a, b: strike.b },
    elevationDeg,
    speed: { V0: strike.V0, level, levelLabel: `lực ${level}/10 (~${level} chiều dài bàn)` },
    stroke,
    english,
    summaryVi,
  };
}
