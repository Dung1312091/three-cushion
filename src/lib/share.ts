import type { BallId, CueStrike } from '@/engine/types';
import type { TablePreset } from '@/engine/table';

/** Compact, URL-safe layout encoding for sharing (§14 Phase 5). Units: mm and centi-degrees. */
interface Wire {
  v: 1;
  p: TablePreset;
  c: BallId;
  b: [number, number, number, number, number, number];
  s?: [number, number, number, number, number];
}

const b64url = (s: string): string => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s: string): string => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export interface SharedLayout {
  preset: TablePreset;
  cue: BallId;
  balls: Record<BallId, { x: number; y: number }>;
  strike?: CueStrike;
}

export function encodeLayout(l: SharedLayout): string {
  const mm = (m: number): number => Math.round(m * 1000);
  const w: Wire = {
    v: 1,
    p: l.preset,
    c: l.cue,
    b: [mm(l.balls.white.x), mm(l.balls.white.y), mm(l.balls.yellow.x), mm(l.balls.yellow.y), mm(l.balls.red.x), mm(l.balls.red.y)],
  };
  if (l.strike) {
    const s = l.strike;
    w.s = [Math.round((s.phi * 18000) / Math.PI), Math.round((s.theta * 18000) / Math.PI), Math.round(s.a * 1000), Math.round(s.b * 1000), Math.round(s.V0 * 100)];
  }
  return b64url(JSON.stringify(w));
}

export function decodeLayout(code: string): SharedLayout | null {
  try {
    const w = JSON.parse(unb64url(code)) as Wire;
    if (w.v !== 1 || !Array.isArray(w.b) || w.b.length !== 6) return null;
    const m = (x: number): number => x / 1000;
    return {
      preset: w.p,
      cue: w.c,
      balls: {
        white: { x: m(w.b[0]), y: m(w.b[1]) },
        yellow: { x: m(w.b[2]), y: m(w.b[3]) },
        red: { x: m(w.b[4]), y: m(w.b[5]) },
      },
      strike: w.s
        ? { phi: (w.s[0] * Math.PI) / 18000, theta: (w.s[1] * Math.PI) / 18000, a: w.s[2] / 1000, b: w.s[3] / 1000, V0: w.s[4] / 100 }
        : undefined,
    };
  } catch {
    return null;
  }
}
