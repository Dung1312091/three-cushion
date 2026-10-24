/** Display-layer unit conversions (engine stays in SI, §0.4). */

export const numVi = (x: number, digits = 1): string => {
  const v = Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x;
  return v.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: digits });
};

export const toDiamonds = (m: number, L: number): number => m / (L / 8);
export const fromDiamonds = (d: number, L: number): number => d * (L / 8);

export const pct = (p: number): string => `${Math.round(p * 100)}%`;

export const deg = (rad: number): number => (rad * 180) / Math.PI;
export const rad = (d: number): number => (d * Math.PI) / 180;

export const mm = (m: number): string => `${Math.round(m * 1000)} mm`;

export const BALL_NAME: Record<'white' | 'yellow' | 'red', string> = {
  white: 'Bi trắng',
  yellow: 'Bi vàng',
  red: 'Bi đỏ',
};

export const BALL_COLOR: Record<'white' | 'yellow' | 'red', string> = {
  white: 'var(--color-ball-white)',
  yellow: 'var(--color-ball-yellow)',
  red: 'var(--color-ball-red)',
};
