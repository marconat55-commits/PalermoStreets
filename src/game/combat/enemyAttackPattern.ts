import type { EnemyAttackPattern } from '../types';

export interface EnemyAttackSelection {
  slot: 'light' | 'heavy';
  nextSequence: number;
}

export function selectEnemyAttackSlot(
  pattern: EnemyAttackPattern,
  sequence: number,
  weightedHeavyChance: number,
  randomValue = Math.random(),
): EnemyAttackSelection {
  if (pattern === 'single') return { slot: 'light', nextSequence: sequence };
  if (pattern === 'alternate') {
    return { slot: sequence % 2 === 0 ? 'light' : 'heavy', nextSequence: sequence + 1 };
  }
  return { slot: randomValue < weightedHeavyChance ? 'heavy' : 'light', nextSequence: sequence };
}
