import type { ModuleData } from '../types';

export type WalkProfile = Array<[number, number]>;

export function interpolateWalkProfile(samples: WalkProfile | undefined, worldX: number, fallback: number): number {
  if (!samples?.length) return fallback;
  if (worldX <= samples[0]![0]) return samples[0]![1];
  const last = samples[samples.length - 1]!;
  if (worldX >= last[0]) return last[1];
  for (let index = 1; index < samples.length; index += 1) {
    const right = samples[index]!;
    if (worldX > right[0]) continue;
    const left = samples[index - 1]!;
    const span = right[0] - left[0];
    if (span <= 0) return right[1];
    const progress = (worldX - left[0]) / span;
    return left[1] + (right[1] - left[1]) * progress;
  }
  return fallback;
}

export function resolveWalkBand(module: ModuleData, worldX: number, fallback: [number, number]): [number, number] {
  const top = interpolateWalkProfile(module.walk_top, worldX, fallback[0]);
  const bottom = interpolateWalkProfile(module.walk_bottom, worldX, fallback[1]);
  return top <= bottom ? [top, bottom] : fallback;
}

export interface WalkBandPoint {
  x: number;
  top: number;
  bottom: number;
}

export function sampleWalkBand(
  module: ModuleData,
  worldWidth: number,
  fallback: [number, number],
  step = 64,
): WalkBandPoint[] {
  const safeStep = Math.max(1, step);
  const points: WalkBandPoint[] = [];
  for (let x = 0; x < worldWidth; x += safeStep) {
    const [top, bottom] = resolveWalkBand(module, x, fallback);
    points.push({ x, top, bottom });
  }
  const [top, bottom] = resolveWalkBand(module, worldWidth, fallback);
  points.push({ x: worldWidth, top, bottom });
  return points;
}
