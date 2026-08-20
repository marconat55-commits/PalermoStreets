import type { StageItemKind, Vec2 } from '../types';

export type ItemInteraction = 'pickup' | 'melee' | 'throw' | null;

export function isPickupKind(kind: StageItemKind): boolean {
  return kind === 'melee' || kind === 'throwable';
}

export function resolveItemInteraction(heldKind: StageItemKind | null, nearbyPickup: boolean): ItemInteraction {
  if (heldKind === 'melee') return 'melee';
  if (heldKind === 'throwable') return 'throw';
  return nearbyPickup ? 'pickup' : null;
}

export function itemWithinRange(origin: Vec2, target: Vec2, rangeX: number, rangeY: number): boolean {
  return Math.abs(target.x - origin.x) <= rangeX && Math.abs(target.y - origin.y) <= rangeY;
}
