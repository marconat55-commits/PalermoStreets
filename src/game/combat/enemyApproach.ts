export function approachTargetX(currentX: number, targetX: number, standOff: number): number {
  const delta = targetX - currentX;
  if (Math.abs(delta) <= standOff) return currentX;
  return targetX - Math.sign(delta) * standOff;
}
