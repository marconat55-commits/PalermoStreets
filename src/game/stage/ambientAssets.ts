import type { AmbientActorData } from '../types';

export function collectAmbientAssets(module: { ambient?: AmbientActorData[] }): string[] {
  const paths = new Set<string>();
  for (const actor of module.ambient ?? []) {
    if (actor.enabled === false || actor.kind !== 'sprite_loop') continue;
    for (const frame of actor.frames) paths.add(frame);
  }
  return [...paths];
}

export function frameAtTime(durations: number[], elapsed: number): number {
  const safeDurations = durations.map((duration) => Math.max(0.05, duration));
  const cycle = safeDurations.reduce((sum, duration) => sum + duration, 0);
  if (cycle <= 0 || safeDurations.length === 0) return 0;
  let cursor = ((elapsed % cycle) + cycle) % cycle;
  for (let index = 0; index < safeDurations.length; index += 1) {
    cursor -= safeDurations[index]!;
    if (cursor < 0) return index;
  }
  return safeDurations.length - 1;
}
