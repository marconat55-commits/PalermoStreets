import type { Vec2 } from '../types';

export const DIRECT_GRAB_RANGE = { x: 132, y: 56 } as const;
export const COMBO_GRAB_RANGE = { x: 158, y: 60 } as const;
export const COMBO_GRAB_WINDOW_SECONDS = 0.90;

export interface GrabCandidate {
  actorId: number;
  position: Vec2;
  canBeGrabbed: boolean;
}

export function isForwardHeld(facing: -1 | 1, leftHeld: boolean, rightHeld: boolean): boolean {
  return facing > 0 ? rightHeld : leftHeld;
}

export function selectGrabCandidate<T extends GrabCandidate>(
  playerPosition: Vec2,
  facing: -1 | 1,
  candidates: readonly T[],
  range: Readonly<{ x: number; y: number }> = DIRECT_GRAB_RANGE,
  preferredActorId?: number | null,
): T | null {
  return candidates
    .filter((enemy) => enemy.canBeGrabbed)
    .filter((enemy) => Math.abs(enemy.position.x - playerPosition.x) <= range.x)
    .filter((enemy) => Math.abs(enemy.position.y - playerPosition.y) <= range.y)
    .filter((enemy) => (enemy.position.x - playerPosition.x) * facing >= -18)
    .sort((a, b) => {
      const preferredA = preferredActorId === a.actorId ? 0 : 1;
      const preferredB = preferredActorId === b.actorId ? 0 : 1;
      if (preferredA !== preferredB) return preferredA - preferredB;
      const distanceA = Math.abs(a.position.x - playerPosition.x) + Math.abs(a.position.y - playerPosition.y) * 1.6;
      const distanceB = Math.abs(b.position.x - playerPosition.x) + Math.abs(b.position.y - playerPosition.y) * 1.6;
      return distanceA - distanceB;
    })[0] ?? null;
}
