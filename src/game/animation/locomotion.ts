import type { Vec2 } from '../types';

export type LocomotionClip = 'walk' | 'walk_up' | 'walk_down';

const ENTER_VERTICAL_RATIO = 0.86;
const KEEP_VERTICAL_RATIO = 0.62;

export function selectLocomotionClip(
  movement: Vec2,
  current: string,
  hasClip: (name: string) => boolean,
): LocomotionClip {
  const horizontal = Math.abs(movement.x);
  const vertical = Math.abs(movement.y);
  const ratio = vertical / Math.max(0.0001, horizontal);
  const desiredVertical: LocomotionClip = movement.y < 0 ? 'walk_up' : 'walk_down';
  const currentlyVertical = current === 'walk_up' || current === 'walk_down'
    || current === 'run_up' || current === 'run_down';
  const threshold = currentlyVertical ? KEEP_VERTICAL_RATIO : ENTER_VERTICAL_RATIO;
  if (vertical > 0.0001 && ratio >= threshold && hasClip(desiredVertical)) return desiredVertical;
  return 'walk';
}

export function locomotionPlaybackRate(actualSpeed: number, referenceSpeed?: number): number {
  if (!referenceSpeed || referenceSpeed <= 0 || actualSpeed <= 0) return 1;
  return actualSpeed / referenceSpeed;
}
