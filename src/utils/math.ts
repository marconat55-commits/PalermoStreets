import type { Rect, Vec2 } from '../game/types';

export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
export const lengthSq = (v: Vec2): number => v.x * v.x + v.y * v.y;
export const length = (v: Vec2): number => Math.hypot(v.x, v.y);
export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  return len > 1e-6 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
}
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
export const rectsIntersect = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
export const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);
