import type { Vec2 } from '../types';

export type LocomotionClip = 'walk';

export function resolveCombatFacing(current: -1 | 1, movement: Vec2): -1 | 1 {
  if (movement.x > 0) return 1;
  if (movement.x < 0) return -1;
  return current;
}

export function selectLocomotionClip(
  _movement: Vec2,
  _current: string,
  _hasClip: (name: string) => boolean,
): LocomotionClip {
  // Classic belt-scroller rule: movement and authored facing are independent.
  // Vertical and diagonal travel reuse the same side-facing gait.
  return 'walk';
}

export function locomotionPlaybackRate(actualSpeed: number, referenceSpeed?: number): number {
  if (!referenceSpeed || referenceSpeed <= 0 || actualSpeed <= 0) return 1;
  return actualSpeed / referenceSpeed;
}
