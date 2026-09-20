import type { AttackData } from '../types';

export function comboChainTime(attack: AttackData): number {
  return attack.startup + attack.active + attack.recovery * 0.35;
}
