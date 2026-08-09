import type { Vec2 } from '../types';

const MIN_DIRECTION_DOT = 0.68;

export interface RunGestureState {
  tapWindow: number;
  tapDirection: Vec2;
  runningDirection: Vec2;
}

function dot(first: Vec2, second: Vec2): number {
  return first.x * second.x + first.y * second.y;
}

function lengthSq(value: Vec2): number {
  return value.x * value.x + value.y * value.y;
}

function normalize(value: Vec2): Vec2 {
  const length = Math.hypot(value.x, value.y);
  return length > 0.000001 ? { x: value.x / length, y: value.y / length } : { x: 0, y: 0 };
}

export function updateRunGesture(
  state: RunGestureState,
  movement: Vec2,
  directionalPressed: boolean,
  tapWindowSeconds: number,
): RunGestureState {
  const moving = lengthSq(movement) > 0.01;
  let tapWindow = state.tapWindow;
  let tapDirection = state.tapDirection;
  let runningDirection = state.runningDirection;

  if (directionalPressed && moving) {
    const candidate = normalize(movement);
    if (tapWindow > 0 && dot(candidate, tapDirection) >= MIN_DIRECTION_DOT) {
      runningDirection = candidate;
    }
    tapDirection = candidate;
    tapWindow = tapWindowSeconds;
  }

  if (!moving) {
    runningDirection = { x: 0, y: 0 };
  } else if (lengthSq(runningDirection) > 0.01) {
    const candidate = normalize(movement);
    runningDirection = dot(candidate, runningDirection) >= MIN_DIRECTION_DOT
      ? candidate
      : { x: 0, y: 0 };
  }

  return { tapWindow, tapDirection, runningDirection };
}
