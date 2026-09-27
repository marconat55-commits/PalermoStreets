export type WaveEntrySide = 'left' | 'right';

export interface WaveEntryPosition {
  side: WaveEntrySide;
  spawnX: number;
  targetX: number;
}

export interface EncounterBounds {
  left: number;
  right: number;
}

export const WAVE_ENTRY_SPEED = 340;
export const WAVE_ENTRY_INSET = 220;

export function resolveEncounterBounds(
  cameraX: number,
  viewportWidth: number,
  worldWidth: number,
  padding = 48,
): EncounterBounds {
  return {
    left: Math.max(0, cameraX + padding),
    right: Math.min(worldWidth, cameraX + viewportWidth - padding),
  };
}

/**
 * Places a wave beyond the visible camera edges. Larger waves alternate sides
 * and successive actors on the same side start farther away, avoiding a pile
 * of enemies materialising on one background point.
 */
export function resolveWaveEntry(
  index: number,
  cameraX: number,
  viewportWidth: number,
): WaveEntryPosition {
  const side: WaveEntrySide = index % 2 === 0 ? 'right' : 'left';
  const sideOrder = Math.floor(index / 2);
  const outside = 105 + sideOrder * 82;
  // Keep the feet target far enough from the camera edge for the complete
  // 640x420 actor canvas. A shallow target can fight clampFeetX forever.
  const inside = WAVE_ENTRY_INSET + sideOrder * 28;
  if (side === 'right') {
    return {
      side,
      spawnX: cameraX + viewportWidth + outside,
      targetX: cameraX + viewportWidth - inside,
    };
  }
  return {
    side,
    spawnX: cameraX - outside,
    targetX: cameraX + inside,
  };
}
