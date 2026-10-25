import type { BallId } from '@/engine/types';
import { CUSHION_VI, STROKE_VI } from '@/solver/instruct';
import type { HumanInstruction, ShotOption } from '@/solver/types';
import { numVi } from '@/lib/format';
import { FRACTION_CLIP, numClips } from '@/lib/voiceClips';

const BALL_VI: Record<BallId, string> = { white: 'bi trắng', yellow: 'bi vàng', red: 'bi đỏ' };
const BALL_CLIP: Record<BallId, string> = { white: 'ball-white', yellow: 'ball-yellow', red: 'ball-red' };
const ENGLISH_CLIP: Record<HumanInstruction['english'], string> = { thuận: 'ep-phe-thuan', nghịch: 'ep-phe-nghich', không: 'ep-phe-khong' };

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

/** The instruction as an ordered checklist a player can follow by ear at the table. */
export function spokenSteps(o: ShotOption): SpokenStep[] {
  const ins = o.instruction;
  const steps: Array<{ label: string; text: string; clips: string[] }> = [];
  const ball = o.firstObject;

  steps.push({
    label: 'Mục tiêu',
    text: `${o.family.firstContact === 'ball' ? 'Đánh bi trước' : 'Đánh băng trước'}, chạm ${BALL_VI[ball]} đầu tiên.`,
    clips: [o.family.firstContact === 'ball' ? 'danh-bi-truoc' : 'danh-bang-truoc', 'cham', BALL_CLIP[ball], 'dau-tien'],
  });

  if (ins.aim.thickness) {
    const th = ins.aim.thickness;
    steps.push({
      label: 'Ngắm',
      text: `Ngắm chạm ${th.side} ${th.label} ${BALL_VI[ball]}.`,
      clips: ['ngam-cham', th.side === 'trái' ? 'trai' : 'phai', FRACTION_CLIP[th.label] ?? 'frac-1-2', BALL_CLIP[ball]],
    });
  } else if (ins.aim.railPoint) {
    const r = ins.aim.railPoint;
    let text = `Ngắm ${CUSHION_VI[r.cushion]}, nút ${numVi(r.diamond)}, ${r.throughDiamond ? 'xuyên nút' : 'trước mặt nút'}.`;
    const clips = ['ngam', `cushion-${r.cushion}`, 'nut', ...numClips(r.diamond), r.throughDiamond ? 'xuyen-nut' : 'truoc-mat-nut'];
    if (ins.aim.systemNumber) {
      text += ` Theo bộ số là ${ins.aim.systemNumber.value}.`;
      clips.push('theo-bo-so', ...numClips(ins.aim.systemNumber.value, 0));
    }
    steps.push({ label: 'Ngắm', text, clips });
  } else {
    steps.push({ label: 'Ngắm', text: 'Ngắm theo đường trên bàn.', clips: ['ngam-theo-duong'] });
  }

  steps.push(
    ins.tip.tips === 0
      ? { label: 'Điểm chạm', text: 'Đánh giữa tâm bi cái, không ép phê.', clips: ['giua-tam'] }
      : {
          label: 'Điểm chạm',
          text: `${numVi(ins.tip.clock)} giờ, ${numVi(ins.tip.tips)} tip, ép phê ${ins.english}.`,
          clips: [...numClips(ins.tip.clock), 'gio', ...numClips(ins.tip.tips), 'tip', ENGLISH_CLIP[ins.english]],
        },
  );

  steps.push({
    label: 'Cơ',
    text: `Nâng cơ ${ins.elevationDeg}°, ${STROKE_VI[ins.stroke]}.`,
    clips: ['nang-co', ...numClips(ins.elevationDeg, 0), 'do', `stroke-${ins.stroke}`],
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
