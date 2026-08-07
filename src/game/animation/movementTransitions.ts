export function shouldStartRunBrake(
  wasRunning: boolean,
  runningDirection: -1 | 0 | 1,
  movementLengthSq: number,
): boolean {
  return wasRunning && runningDirection === 0 && movementLengthSq <= 0.01;
}
