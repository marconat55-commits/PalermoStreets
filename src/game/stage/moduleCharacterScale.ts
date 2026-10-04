import type { ModuleData } from '../types';

/** Shared visual scale for every fighter in one module. Gameplay ranges stay in world units. */
export function moduleCharacterScale(module: Pick<ModuleData, 'character_scale'>): number {
  return Math.max(0.8, Math.min(1.2, module.character_scale ?? 1));
}
