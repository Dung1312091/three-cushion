import type { Vec3 } from './types';

export const vec = (x = 0, y = 0, z = 0): Vec3 => [x, y, z];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm = (a: Vec3): number => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
export const normXY = (a: Vec3): number => Math.sqrt(a[0] * a[0] + a[1] * a[1]);
export const unit = (a: Vec3): Vec3 => {
  const n = norm(a);
  return n > 0 ? [a[0] / n, a[1] / n, a[2] / n] : [0, 0, 0];
};
export const copy = (a: Vec3): Vec3 => [a[0], a[1], a[2]];

/** k̂ × a  (k̂ = +z) */
export const kCross = (a: Vec3): Vec3 => [-a[1], a[0], 0];

/** Rotate a vector about +z by angle (rad). */
export const rotZ = (a: Vec3, ang: number): Vec3 => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [a[0] * c - a[1] * s, a[0] * s + a[1] * c, a[2]];
};

export const DEG = Math.PI / 180;
