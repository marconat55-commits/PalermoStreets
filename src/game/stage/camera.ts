export interface HorizontalCameraBounds {
  min: number;
  max: number;
}

export function resolveCameraBounds(
  worldWidth: number,
  viewportWidth: number,
  configured?: [number, number],
): HorizontalCameraBounds {
  const naturalMax = Math.max(0, worldWidth - viewportWidth);
  const min = Math.max(0, Math.min(configured?.[0] ?? 0, naturalMax));
  const max = Math.max(min, Math.min(configured?.[1] ?? naturalMax, naturalMax));
  return { min, max };
}

export function cameraTargetForPlayer(
  current: number,
  playerX: number,
  viewportWidth: number,
  bounds: HorizontalCameraBounds,
  deadZone: readonly [number, number] = [0.40, 0.60],
): number {
  const left = viewportWidth * deadZone[0];
  const right = viewportWidth * deadZone[1];
  const screenX = playerX - current;
  const target = screenX < left ? playerX - left : screenX > right ? playerX - right : current;
  return Math.max(bounds.min, Math.min(bounds.max, target));
}

export function smoothCamera(current: number, target: number, dt: number, response = 8): number {
  const blend = 1 - Math.exp(-Math.max(0, response) * Math.max(0, dt));
  return current + (target - current) * blend;
}
