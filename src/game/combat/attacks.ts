import type { AttackData } from '../types';

export const PUNCH_LEFT: AttackData = {
  name: 'punch_left', damage: 14, startup: 0.11, active: 0.10, recovery: 0.18,
  rangeX: 92, rangeY: 54, knockbackX: 170, knockbackY: 0, furyGain: 7, hitStop: 0.045, shake: 3,
};
export const PUNCH_RIGHT: AttackData = {
  name: 'punch_right', damage: 20, startup: 0.12, active: 0.12, recovery: 0.24,
  rangeX: 108, rangeY: 58, knockbackX: 250, knockbackY: 0, furyGain: 10, hitStop: 0.060, shake: 5,
};
export const COMBO_FINISHER: AttackData = {
  name: 'combo_finisher', damage: 27, startup: 0.14, active: 0.13, recovery: 0.27,
  rangeX: 116, rangeY: 66, knockbackX: 360, knockbackY: 0, furyGain: 13, hitStop: 0.078, shake: 8,
  knockdown: true,
};
export const KICK_RIGHT: AttackData = {
  name: 'kick_right', damage: 30, startup: 0.20, active: 0.14, recovery: 0.34,
  rangeX: 132, rangeY: 62, knockbackX: 390, knockbackY: 0, furyGain: 15, hitStop: 0.085, shake: 9,
  knockdown: true,
};
export const SUPER: AttackData = {
  name: 'super', damage: 52, startup: 0.18, active: 0.34, recovery: 0.38,
  rangeX: 158, rangeY: 74, knockbackX: 560, knockbackY: 0, furyGain: 0, hitStop: 0.115, shake: 15,
  knockdown: true, multiHit: true,
};
export const AIR_ATTACK: AttackData = {
  name: 'air_attack', damage: 26, startup: 0.10, active: 0.16, recovery: 0.18,
  rangeX: 126, rangeY: 58, knockbackX: 330, knockbackY: 0, furyGain: 12, hitStop: 0.072, shake: 7,
  knockdown: true,
};
export const GRAB_STRIKE: AttackData = {
  name: 'grab_strike', damage: 18, startup: 0.10, active: 0.12, recovery: 0.18,
  rangeX: 76, rangeY: 72, knockbackX: 0, knockbackY: 0, furyGain: 8, hitStop: 0.060, shake: 5,
};
export const THROW: AttackData = {
  name: 'throw', damage: 34, startup: 0.18, active: 0.12, recovery: 0.32,
  rangeX: 92, rangeY: 78, knockbackX: 470, knockbackY: 0, furyGain: 16, hitStop: 0.090, shake: 11,
  knockdown: true,
};
export const LIGHT_COMBO = [PUNCH_LEFT, PUNCH_RIGHT, COMBO_FINISHER] as const;
export const ENEMY_ATTACK: AttackData = {
  name: 'attack', damage: 10, startup: 0.48, active: 0.12, recovery: 0.56,
  rangeX: 84, rangeY: 56, knockbackX: 175, knockbackY: 0, furyGain: 0, hitStop: 0.05, shake: 3,
};
export const ENEMY_HEAVY: AttackData = {
  name: 'heavy', damage: 16, startup: 0.70, active: 0.15, recovery: 0.80,
  rangeX: 100, rangeY: 64, knockbackX: 250, knockbackY: 0, furyGain: 0, hitStop: 0.07, shake: 6,
  knockdown: true,
};
export const attackTotal = (attack: AttackData): number => attack.startup + attack.active + attack.recovery;
export const canAcquireAttackTarget = (attack: AttackData, hitCount: number): boolean =>
  Boolean(attack.multiHit) || hitCount === 0;
