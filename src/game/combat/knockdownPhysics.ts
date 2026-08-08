export const KNOCKDOWN_GRAVITY = 1480;

export function integrateLaunch(
  elevation: number,
  verticalVelocity: number,
  dt: number,
): { elevation: number; verticalVelocity: number; landed: boolean } {
  if (verticalVelocity === 0 && elevation <= 0) return { elevation: 0, verticalVelocity: 0, landed: false };
  const nextVelocity = verticalVelocity - KNOCKDOWN_GRAVITY * dt;
  const nextElevation = elevation + nextVelocity * dt;
  if (nextElevation <= 0 && nextVelocity < 0) return { elevation: 0, verticalVelocity: 0, landed: true };
  return { elevation: nextElevation, verticalVelocity: nextVelocity, landed: false };
}
