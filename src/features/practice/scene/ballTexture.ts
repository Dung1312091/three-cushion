import { CanvasTexture, SRGBColorSpace } from 'three';

const cache = new Map<string, CanvasTexture>();

/**
 * Equirectangular texture with six dots (±x, ±y, ±z) so ball rotation is visible
 * during playback (§13.2 "bi 6 chấm").
 */
export function ballTexture(base: string, dot: string): CanvasTexture {
  const key = `${base}|${dot}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  g.fillStyle = dot;
  const r = 15;
  for (const u of [0, 0.25, 0.5, 0.75]) {
    const x = u * w;
    g.beginPath();
    // Slightly wider ellipse compensates the equirect stretch at the equator a little.
    g.ellipse(x, h / 2, r, r, 0, 0, Math.PI * 2);
    g.fill();
    if (u === 0) {
      g.beginPath();
      g.ellipse(w, h / 2, r, r, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Poles: a band at the top and bottom rows renders as a small cap on the sphere.
  g.fillRect(0, 0, w, 9);
  g.fillRect(0, h - 9, w, 9);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

export const BALL_BASE: Record<'white' | 'yellow' | 'red', [string, string]> = {
  white: ['#f4f3ec', '#c4202f'],
  yellow: ['#f2c230', '#c4202f'],
  red: ['#c9202f', '#f4f3ec'],
};
