import type { AttackData } from '../types';

export const PUNCH_LEFT: AttackData = {
  name: 'punch_left', damage: 14, startup: 0.11, active: 0.10, recovery: 0.18,
  rangeX: 92, rangeY: 54, knockbackX: 170, knockbackY: 0, furyGain: 7, hitStop: 0.045, shake: 3,
};
export const PUNCH_RIGHT: AttackData = {
  name: 'punch_right', damage: 20, startup: 0.12, active: 0.12, recovery: 0.24,
  rangeX: 108, rangeY: 58, knockbackX: 250, knockbackY: 0, furyGain: 10, hitStop: 0.060, shake: 5,
};
/** Third beat of Marco's arcade chain: a compact Muay Thai elbow before the roundhouse finisher. */
export const COMBO_ELBOW: AttackData = {
  name: 'combo_elbow', animation: 'muay_elbow', damage: 17, startup: 0.09, active: 0.11, recovery: 0.18,
  rangeX: 112, rangeY: 66, knockbackX: 230, knockbackY: 0, furyGain: 8, hitStop: 0.065, shake: 6,
};
/** Backward-compatible export retained for older tooling. */
export const COMBO_KICK = COMBO_ELBOW;
export const COMBO_FINISHER: AttackData = {
  name: 'combo_finisher', damage: 29, startup: 0.14, active: 0.14, recovery: 0.27,
  rangeX: 152, rangeY: 70, knockbackX: 560, knockbackY: 0, furyGain: 14, hitStop: 0.098, shake: 12,
  knockdown: true, launchVelocity: 460,
};
export const RUN_ATTACK: AttackData = {
  name: 'run_attack', animation: 'combo_finisher', damage: 30, startup: 0.10, active: 0.15, recovery: 0.26,
  rangeX: 154, rangeY: 70, knockbackX: 620, knockbackY: 0, furyGain: 0, hitStop: 0.095, shake: 12,
  knockdown: true, launchVelocity: 500,
};
export const KICK_FRONT: AttackData = {
  name: 'kick_front', damage: 13, startup: 0.12, active: 0.10, recovery: 0.17,
  rangeX: 122, rangeY: 60, knockbackX: 190, knockbackY: 0, furyGain: 6, hitStop: 0.050, shake: 4,
};
export const KICK_RIGHT: AttackData = {
  name: 'kick_right', damage: 19, startup: 0.14, active: 0.11, recovery: 0.22,
  rangeX: 136, rangeY: 64, knockbackX: 285, knockbackY: 0, furyGain: 9, hitStop: 0.064, shake: 6,
};
export const KICK_FINISHER: AttackData = {
  name: 'kick_finisher', damage: 32, startup: 0.17, active: 0.13, recovery: 0.30,
  rangeX: 148, rangeY: 68, knockbackX: 590, knockbackY: 0, furyGain: 16, hitStop: 0.096, shake: 12,
  knockdown: true, launchVelocity: 480,
};
export const SUPER: AttackData = {
  name: 'super', damage: 52, startup: 0.18, active: 0.34, recovery: 0.38,
  rangeX: 168, rangeY: 76, knockbackX: 780, knockbackY: 0, furyGain: 0, hitStop: 0.125, shake: 18,
  knockdown: true, multiHit: true, launchVelocity: 590,
};
export const SPIN_SPECIAL: AttackData = {
  name: 'spin_special', animation: 'super', damage: 34, startup: 0.11, active: 0.42, recovery: 0.28,
  rangeX: 380, rangeY: 176, knockbackX: 760, knockbackY: 0, furyGain: 0, hitStop: 0.12, shake: 18,
  knockdown: true, multiHit: true, launchVelocity: 580,
};
export const AIR_PUNCH: AttackData = {
  name: 'air_punch', damage: 24, startup: 0.08, active: 0.14, recovery: 0.15,
  rangeX: 142, rangeY: 62, knockbackX: 440, knockbackY: 0, furyGain: 11, hitStop: 0.074, shake: 8,
  knockdown: true, launchVelocity: 425,
};
export const AIR_KICK: AttackData = {
  name: 'air_attack', damage: 28, startup: 0.10, active: 0.17, recovery: 0.18,
  rangeX: 166, rangeY: 68, knockbackX: 620, knockbackY: 0, furyGain: 14, hitStop: 0.098, shake: 12,
  knockdown: true, launchVelocity: 510,
};
/** Backward-compatible name used by earlier tests and documentation. */
export const AIR_ATTACK = AIR_KICK;
export const GRAB_STRIKE: AttackData = {
  name: 'grab_strike', damage: 18, startup: 0.10, active: 0.12, recovery: 0.18,
  rangeX: 76, rangeY: 72, knockbackX: 0, knockbackY: 0, furyGain: 8, hitStop: 0.060, shake: 5,
};
export const THROW: AttackData = {
  name: 'throw', damage: 34, startup: 0.18, active: 0.12, recovery: 0.32,
  rangeX: 108, rangeY: 88, knockbackX: 900, knockbackY: 0, furyGain: 16, hitStop: 0.12, shake: 17,
  knockdown: true, launchVelocity: 610,
};
export const LIGHT_COMBO = [PUNCH_LEFT, PUNCH_RIGHT, COMBO_ELBOW, COMBO_FINISHER] as const;
export const KICK_COMBO = [KICK_FRONT, KICK_RIGHT, KICK_FINISHER] as const;
export const ARCADE_COMBO = LIGHT_COMBO;
export const ENEMY_ATTACK: AttackData = {
  name: 'attack', damage: 10, startup: 0.48, active: 0.12, recovery: 0.56,
  rangeX: 84, rangeY: 56, knockbackX: 175, knockbackY: 0, furyGain: 0, hitStop: 0.05, shake: 3,
};
export const ENEMY_HEAVY: AttackData = {
  name: 'heavy', damage: 16, startup: 0.70, active: 0.15, recovery: 0.80,
  rangeX: 100, rangeY: 64, knockbackX: 250, knockbackY: 0, furyGain: 0, hitStop: 0.07, shake: 6,
  knockdown: true, launchVelocity: 335,
};
export const attackTotal = (attack: AttackData): number => attack.startup + attack.active + attack.recovery;
export const canAcquireAttackTarget = (attack: AttackData, hitCount: number): boolean =>
  Boolean(attack.multiHit) || hitCount === 0;
