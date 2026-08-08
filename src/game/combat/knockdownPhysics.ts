export const KNOCKDOWN_GRAVITY = 1480;
export const AIRBORNE_HORIZONTAL_DRAG = 1.15;
export const GROUND_HORIZONTAL_DRAG = 3.8;

export function integrateHorizontalLaunch(
  position: number,
  velocity: number,
  dt: number,
  airborne: boolean,
): { position: number; velocity: number } {
  const drag = airborne ? AIRBORNE_HORIZONTAL_DRAG : GROUND_HORIZONTAL_DRAG;
  return {
    position: position + velocity * dt,
    velocity: velocity * Math.max(0, 1 - drag * dt),
  };
}

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
