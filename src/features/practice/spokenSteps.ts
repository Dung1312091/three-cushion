import type { BallId } from '@/engine/types';
import { CUSHION_VI } from '@/solver/instruct';
import type { ShotOption } from '@/solver/types';
import { numVi } from '@/lib/format';
import { numClips } from '@/lib/voiceClips';
import { aimPointText, aimVariant, BALL_VI, bridgeOf, cueAngleOf, deliveryOf, spinOf, THICKNESS, thicknessKey, type AimVariant, type CueAngleKey, type Side, type ThicknessKey } from './vocab';

const BALL_CLIP: Record<BallId, string> = { white: 'ball-white', yellow: 'ball-yellow', red: 'ball-red' };
const SIDE_CLIP: Record<Side, string> = { trái: 'trai', phải: 'phai' };
const THICK_CLIP: Record<ThicknessKey, string> = { full: 'thick-full', '3/4': 'thick-3-4', '1/2': 'thick-1-2', '1/4': 'thick-1-4', thin: 'thick-thin' };

const FRACTION_SPEECH: Record<string, string> = {
  '1/8': 'một phần tám',
  '1/4': 'một phần tư',
  '3/8': 'ba phần tám',
  '1/2': 'nửa',
  '5/8': 'năm phần tám',
  '3/4': 'ba phần tư',
  '7/8': 'bảy phần tám',
};

/** Turn display text into something a Vietnamese TTS voice reads naturally. */
export function speechify(text: string): string {
  return text
    .replace(/\s\+\s/g, ', ')
    .replace(/\b([LS])-([LS])-([LS])\b/g, (_, a: string, b: string, c: string) => [a, b, c].map((x) => (x === 'L' ? 'dài' : 'ngắn')).join(', '))
    .replace(/\b([1357])\/([248])\b/g, (m) => FRACTION_SPEECH[m] ?? m)
    .replace(/(\d+)\/10\b/g, '$1 trên 10')
    .replace(/(\d+(?:,\d+)?)\s?°/g, '$1 độ')
    .replace(/(\d),(\d)/g, '$1 phẩy $2');
}

export interface SpokenStep {
  label: string;
  /** Shown on screen. */
  text: string;
  /** Sent to the browser speech engine. */
  speech: string;
  /** Pre-recorded clip keys (public/voice) used when the speech engine is unavailable. */
  clips: string[];
}

/** Clip sequence for aimPointText — keep the two in step. */
function aimClips(v: AimVariant, side: Side, ball: BallId): string[] {
  const s = SIDE_CLIP[side];
  const b = BALL_CLIP[ball];
  switch (v) {
    case 'center':
      return ['ngam-tam-bi-cai', 'aim-center', b];
    case 'near-center':
      return ['ngam-tam-bi-cai', 'aim-near-center', s, 'tam', b];
    case 'mid':
      return ['ngam-tam-bi-cai', 'aim-mid', s, b];
    case 'near-edge':
      return ['ngam-tam-bi-cai', 'aim-near-edge', s, b];
    case 'edge':
      return ['ngam-tam-bi-cai', 'aim-edge', s, b];
    case 'outside-bit':
      return ['ngam-tam-bi-cai', 'aim-outside', s, b, 'mot-chut'];
    case 'outside-half':
      return ['ngam-tam-bi-cai', 'aim-outside', s, b, 'nua-ban-kinh'];
    default:
      return ['aim-graze', s, b];
  }
}

function angleClips(key: CueAngleKey, deg: number): string[] {
  const n = [...numClips(deg, 0), 'do'];
  if (key === 'flat') return ['co-song-song'];
  if (key === 'low') return ['co-gan-song-song', 'nang-nhe', ...n];
  if (key === 'raised') return ['chui-duoi-co', ...n];
  if (key === 'high') return ['nang-cao-duoi-co', ...n];
  return ['dung-co', ...n, 'stroke-masse'];
}

/** The instruction as an ordered checklist a player can follow by ear at the table. */
export function spokenSteps(o: ShotOption, tipUnitR: number): SpokenStep[] {
  const ins = o.instruction;
  const steps: Array<{ label: string; text: string; clips: string[] }> = [];
  const ball = o.firstObject;
  const ballFirst = o.family.firstContact === 'ball';

  steps.push({
    label: 'Mục tiêu',
    text: `${ballFirst ? 'Đánh bi trước' : 'Đánh băng trước'}, chạm ${BALL_VI[ball]} đầu tiên.`,
    clips: [ballFirst ? 'danh-bi-truoc' : 'danh-bang-truoc', 'cham', BALL_CLIP[ball], 'dau-tien'],
  });

  if (ins.aim.thickness) {
    const { fraction, side } = ins.aim.thickness;
    const key = thicknessKey(fraction);
    const full = key === 'full';
    steps.push({
      label: 'Bi mục tiêu',
      text: `${THICKNESS[key].name}${full ? ' vào' : `, chạm bên ${side}`} ${BALL_VI[ball]}. ${aimPointText(fraction, side, ball)}`,
      clips: [THICK_CLIP[key], ...(full ? ['vao'] : ['cham-ben', SIDE_CLIP[side]]), BALL_CLIP[ball], ...aimClips(aimVariant(fraction), side, ball)],
    });
  } else if (ins.aim.railPoint) {
    const r = ins.aim.railPoint;
    let text = `Ngắm ${CUSHION_VI[r.cushion]}, nút ${numVi(r.diamond)}, ${r.throughDiamond ? 'xuyên nút' : 'trước mặt nút'}.`;
    const clips = ['ngam', `cushion-${r.cushion}`, 'nut', ...numClips(r.diamond), r.throughDiamond ? 'xuyen-nut' : 'truoc-mat-nut'];
    if (ins.aim.systemNumber) {
      text += ` Theo bộ số là ${ins.aim.systemNumber.value}.`;
      clips.push('theo-bo-so', ...numClips(ins.aim.systemNumber.value, 0));
    }
    steps.push({ label: 'Ngắm băng', text, clips });
  } else {
    steps.push({ label: 'Ngắm', text: 'Ngắm theo đường trên bàn.', clips: ['ngam-theo-duong'] });
  }

  const spin = spinOf(ins.tip.a, ins.tip.b, tipUnitR, ins.english, ballFirst);
  if (spin.tips === 0) {
    steps.push({ label: 'Bi cái', text: 'Đánh giữa tâm bi cái, không ép phê.', clips: ['giua-tam'] });
  } else {
    const clips: string[] = [];
    if (spin.vertical === 'cule') clips.push('cule');
    if (spin.vertical === 'tro') clips.push('tro');
    if (spin.side) {
      clips.push('ep-phe', SIDE_CLIP[spin.side], 'muc', ...numClips(spin.level ?? 1, 0));
      if (spin.english) clips.push(spin.english === 'thuận' ? 'thuan' : 'nghich');
    }
    if (!spin.vertical && !spin.side) clips.push('danh-tam-bi');
    clips.push(...numClips(spin.clock), 'gio', 'sau', ...numClips(spin.tips), 'tip');
    steps.push({ label: 'Bi cái', text: `${spin.name}: ${spin.where}.`, clips });
  }

  const angle = cueAngleOf(ins.elevationDeg);
  const bridge = bridgeOf(ins.speed.level, ins.stroke, spin.vertical);
  const delivery = deliveryOf(ins.stroke, spin, o.kissRisk);
  steps.push({
    label: 'Cơ',
    text: `${angle.text}. ${bridge.name}, ${delivery.name.toLowerCase()}.`,
    clips: [...angleClips(angle.key, ins.elevationDeg), `cau-tay-${bridge.key}`, delivery.key === 'follow' ? 'thoc-sau' : 'danh-mo'],
  });
  steps.push({ label: 'Lực', text: `Lực ${ins.speed.level}/10.`, clips: ['luc', ...numClips(ins.speed.level, 0), 'tren-muoi'] });

  if (o.family.railCode) {
    const code = o.family.railCode.split('');
    steps.push({
      label: 'Đường bi',
      text: `Bi cái chạm băng ${code.join('-')}, rồi tới bi thứ hai.`,
      clips: ['bi-cai-cham-bang', ...code.map((c) => (c === 'L' ? 'dai' : 'ngan')), 'roi-toi-bi-2'],
    });
  }

  return steps.map((s) => ({ ...s, speech: speechify(s.text) }));
}
