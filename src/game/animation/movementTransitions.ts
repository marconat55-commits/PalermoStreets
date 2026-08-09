export function shouldStartRunBrake(
  wasRunning: boolean,
  isRunning: boolean,
  movementLengthSq: number,
): boolean {
  return wasRunning && !isRunning && movementLengthSq <= 0.01;
}
