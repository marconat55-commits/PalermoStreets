export type WaveEntrySide = 'left' | 'right';

export interface WaveEntryPosition {
  side: WaveEntrySide;
  spawnX: number;
  targetX: number;
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
  const inside = 74 + sideOrder * 38;
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
