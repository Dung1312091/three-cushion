import type { BallId } from '@/engine/types';
import { numVi } from '@/lib/format';
import { tipClock } from '@/solver/instruct';
import type { BallContact, HumanInstruction } from '@/solver/types';

/**
 * Club vocabulary for instructions: named thickness, cue-ball contact names, cue angle, bridge and
 * delivery. The numbers (fraction, deflection, tips) come from the engine; the thresholds that turn
 * them into words are coaching heuristics. [CẦN HLV DUYỆT — docs/OPEN_QUESTIONS.md]
 */

export const BALL_VI: Record<BallId, string> = { white: 'bi trắng', yellow: 'bi vàng', red: 'bi đỏ' };
export type Side = 'trái' | 'phải';

// ---------- Bi mục tiêu: độ dày ----------

export type ThicknessKey = 'full' | '3/4' | '1/2' | '1/4' | 'thin';

export const THICKNESS: Record<ThicknessKey, { fraction: number; name: string; short: string; note: string }> = {
  full: { fraction: 1, name: 'Nguyên trái', short: 'Nguyên', note: 'Truyền gần hết lực cho bi mục tiêu; bi cái dừng, đi theo hay giật lùi tùy điểm chạm.' },
  '3/4': { fraction: 0.75, name: '3/4 trái', short: '3/4', note: 'Bi mục tiêu bị đẩy đi mạnh.' },
  '1/2': { fraction: 0.5, name: '1/2 trái', short: '1/2', note: 'Độ dày tiêu chuẩn, dễ cảm nhất.' },
  '1/4': { fraction: 0.25, name: '1/4 trái', short: '1/4', note: 'Bi mục tiêu nhận ít lực hơn, bi cái giữ được nhiều tốc độ.' },
  thin: { fraction: 0.1, name: 'Đánh mỏng', short: 'Mỏng', note: 'Hai mép bi chỉ sượt qua nhau; bi cái giữ gần hết tốc độ.' },
};

export function thicknessKey(fraction: number): ThicknessKey {
  if (fraction >= 0.875) return 'full';
  if (fraction >= 0.625) return '3/4';
  if (fraction >= 0.375) return '1/2';
  if (fraction >= 0.15) return '1/4';
  return 'thin';
}

const KEY_LABEL: Record<ThicknessKey, string> = { full: 'đầy', '3/4': '3/4', '1/2': '1/2', '1/4': '1/4', thin: '' };

/** "1/2 trái", plus the finer eighth when it differs ("≈ 3/8"). */
export function thicknessName(fraction: number, label: string): { key: ThicknessKey; name: string; exact?: string } {
  const key = thicknessKey(fraction);
  return { key, name: THICKNESS[key].name, exact: label !== KEY_LABEL[key] && label !== 'đầy' ? label : undefined };
}

/** Where the cue-ball centre points, by the aim offset k = 2(1 − fraction) ball radii from the object centre. */
export type AimVariant = 'center' | 'near-center' | 'mid' | 'near-edge' | 'edge' | 'outside-bit' | 'outside-half' | 'graze';

export function aimVariant(fraction: number): AimVariant {
  const k = Math.round(2 * (1 - fraction) * 4) / 4;
  if (k <= 0) return 'center';
  if (k <= 0.25) return 'near-center';
  if (k <= 0.5) return 'mid';
  if (k <= 0.75) return 'near-edge';
  if (k <= 1) return 'edge';
  if (k <= 1.25) return 'outside-bit';
  if (k <= 1.5) return 'outside-half';
  return 'graze';
}

export function aimPointText(fraction: number, side: Side, ball: BallId): string {
  const b = BALL_VI[ball];
  const edge = `mép ${side} ${b}`;
  switch (aimVariant(fraction)) {
    case 'center':
      return `Ngắm tâm bi cái thẳng vào tâm ${b}.`;
    case 'near-center':
      return `Ngắm tâm bi cái hơi lệch sang ${side} tâm ${b}.`;
    case 'mid':
      return `Ngắm tâm bi cái vào giữa tâm và ${edge}.`;
    case 'near-edge':
      return `Ngắm tâm bi cái vào gần ${edge}.`;
    case 'edge':
      return `Ngắm tâm bi cái đúng ${edge}.`;
    case 'outside-bit':
      return `Ngắm tâm bi cái ra ngoài ${edge} một chút.`;
    case 'outside-half':
      return `Ngắm tâm bi cái ra ngoài ${edge} nửa bán kính bi.`;
    default:
      return `Ngắm cho mép bi cái sượt nhẹ ${edge}.`;
  }
}

/** What happened right after the contact, measured on the simulated path. */
export function afterContactLines(c: BallContact): string[] {
  const deg = Math.round(c.cueDeflectDeg);
  const cue =
    c.cueAfter === 'stop'
      ? 'Bi cái gần như dừng tại chỗ.'
      : c.cueAfter === 'back'
        ? `Bi cái giật ngược lại (lệch ${deg}° so với hướng đánh).`
        : deg < 5
          ? 'Bi cái gần như đi thẳng theo hướng cũ.'
          : `Bi cái tách ${deg}° so với hướng đánh.`;
  const name = BALL_VI[c.object];
  const obj = c.objectTravelL < 0.15 ? `${capital(name)} chỉ nhúc nhích một chút.` : `${capital(name)} lăn khoảng ${numVi(c.objectTravelL, 1)} chiều dài bàn.`;
  return [cue, obj];
}

/** Cue direction φ that gives the wanted thickness on a resting object ball (ghost-ball geometry, no squirt). */
export function aimPhi(cue: { x: number; y: number }, obj: { x: number; y: number }, R: number, fraction: number, side: Side): number {
  const dx = obj.x - cue.x;
  const dy = obj.y - cue.y;
  const D = Math.hypot(dx, dy);
  const delta = Math.asin(Math.min(1, (2 * R * (1 - fraction)) / Math.max(D, 1e-9)));
  // 'trái' = the cue ball passes on the left of the object centre (crossZ < 0 in contactOf).
  return Math.atan2(dy, dx) + (side === 'trái' ? delta : -delta);
}

// ---------- Bi cái: điểm chạm & ép phê ----------

export interface SpinInfo {
  /** "Cu-lê + ép phê phải mức 2 (thuận)" */
  name: string;
  clock: number;
  tips: number;
  vertical?: 'cule' | 'tro';
  side?: Side;
  /** Ép phê level by clock sector: 1 giờ/11 giờ = 1 … 4 giờ/8 giờ = 4. */
  level?: 1 | 2 | 3 | 4;
  english?: HumanInstruction['english'];
  /** "2 giờ, sâu 2 tip" */
  where: string;
  effects: string[];
}

export function spinOf(a: number, b: number, tipUnitR: number, english?: HumanInstruction['english'], ballFirst = true): SpinInfo {
  const { clock, tips } = tipClock(a, b, tipUnitR);
  const ua = a / tipUnitR;
  const ub = b / tipUnitR;
  const vertical = ub >= 0.5 ? 'cule' : ub <= -0.5 ? 'tro' : undefined;
  const side: Side | undefined = Math.abs(ua) >= 0.5 ? (ua > 0 ? 'phải' : 'trái') : undefined;
  let level: SpinInfo['level'];
  if (side) {
    const hours = clock <= 6 ? clock : 12 - clock;
    level = Math.min(4, Math.max(1, Math.round(hours))) as SpinInfo['level'];
  }
  const eng = side && english && english !== 'không' ? english : undefined;

  const parts: string[] = [];
  if (vertical === 'cule') parts.push('Cu-lê');
  if (vertical === 'tro') parts.push('Trô');
  if (side) parts.push(`${parts.length ? 'ép' : 'Ép'} phê ${side} mức ${level}${eng ? ` (${eng})` : ''}`);
  const name = parts.length ? parts.join(' + ') : 'Đánh tâm bi';

  const effects: string[] = [];
  if (!vertical && !side) effects.push('Bi lăn tự nhiên, không thêm xoáy phụ khi chạm băng.');
  if (vertical === 'cule') effects.push(ballFirst ? 'Cu-lê: chạm bi xong, bi cái bị kéo bẻ về phía trước.' : 'Cu-lê: bi cái xoáy tiến, giữ đà về phía trước.');
  if (vertical === 'tro') effects.push(ballFirst ? 'Trô: chạm bi xong, bi cái bị kéo giật về sau.' : 'Trô: bi cái xoáy ngược về sau.');
  if (side) {
    if (eng === 'thuận') effects.push('Ép phê thuận: chạm băng bật ra mở rộng, bi chạy dài.');
    else if (eng === 'nghịch') effects.push('Ép phê nghịch: chạm băng bật ra gắt lại, góc hẹp hơn.');
    else effects.push(`Ép phê ${side}: đổi góc bật băng, đường bi bo cong.`);
  }
  const where = tips === 0 ? 'Giữa tâm' : `${numVi(clock)} giờ, sâu ${numVi(tips)} tip`;
  return { name, clock, tips, vertical, side, level, english: eng, where, effects };
}

// ---------- Cơ: góc đặt cơ, cầu tay, ra cơ ----------

export type CueAngleKey = 'flat' | 'low' | 'raised' | 'high' | 'vertical';

export function cueAngleOf(deg: number): { key: CueAngleKey; text: string; note?: string } {
  const d = Math.round(deg);
  if (d < 3) return { key: 'flat', text: 'Cơ song song mặt bàn' };
  if (d < 12) return { key: 'low', text: `Cơ gần song song, nâng nhẹ ${d}°` };
  if (d <= 35) return { key: 'raised', text: `Chúi đuôi cơ lên ${d}°`, note: 'Dùng khi cần trô bén hoặc gài lực.' };
  if (d <= 45) return { key: 'high', text: `Nâng cao đuôi cơ ${d}°` };
  return { key: 'vertical', text: `Dựng cơ ${d}° (mát-xê)`, note: 'Ép bi cái chạy theo đường cong gấp khúc.' };
}

export type BridgeKey = 'kin' | 'mo' | 'dung';

export function bridgeOf(level: number, stroke: HumanInstruction['stroke'], vertical?: 'cule' | 'tro'): { key: BridgeKey; name: string; why: string } {
  if (stroke === 'masse') return { key: 'dung', name: 'Cầu tay dựng cao', why: 'Giữ cơ dựng đứng ổn định khi mát-xê.' };
  if (level >= 6) return { key: 'kin', name: 'Cầu tay kín', why: 'Lực mạnh: ngón trỏ vòng qua thân cơ để cơ không bị lệch.' };
  if (vertical === 'cule') return { key: 'kin', name: 'Cầu tay kín', why: 'Đánh culê: ngón trỏ vòng giữ cơ đi thẳng.' };
  if (level <= 3) return { key: 'mo', name: 'Cầu tay mở', why: 'Cú nhẹ, cần ngắm thật chuẩn.' };
  return { key: 'kin', name: 'Cầu tay kín', why: 'Giữ cơ chắc, ra cơ thẳng.' };
}

export type DeliveryKey = 'follow' | 'punch';

export function deliveryOf(stroke: HumanInstruction['stroke'], spin: Pick<SpinInfo, 'tips' | 'vertical'>, kissRisk = 0): { key: DeliveryKey; name: string; why: string } {
  const hasSpin = spin.tips > 0;
  // A follow or draw contact needs the cue to travel through the ball, so only a plain stun is punched.
  if (stroke === 'dan' && !spin.vertical) return { key: 'punch', name: 'Đánh mổ (dằn)', why: 'Phát lực nhanh, dừng cơ ngay khi vừa chạm bi cái.' };
  if (kissRisk >= 0.2) return { key: 'punch', name: 'Đánh mổ', why: 'Ngắt lực để tránh bi cái bị đá.' };
  return {
    key: 'follow',
    name: 'Thọc sâu',
    why: hasSpin ? 'Đẩy mũi cơ xuyên qua bi cái để ép phê ăn đậm, bi chạy mượt.' : 'Đẩy mũi cơ xuyên qua bi cái cho bi chạy mượt, không đứng sớm.',
  };
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
