import assert from 'node:assert/strict';
import test from 'node:test';

import { updateRunGesture, type RunGestureState } from '../src/game/animation/runGesture.ts';

const stopped = (): RunGestureState => ({
  tapWindow: 0,
  tapDirection: { x: 0, y: 0 },
  runningDirection: { x: 0, y: 0 },
});

function doubleTap(movement: { x: number; y: number }): RunGestureState {
  const first = updateRunGesture(stopped(), movement, true, 0.26);
  const released = updateRunGesture(first, { x: 0, y: 0 }, false, 0.26);
  return updateRunGesture(released, movement, true, 0.26);
}

test('il doppio impulso avvia la corsa in tutte le direzioni', () => {
  assert.deepEqual(doubleTap({ x: 1, y: 0 }).runningDirection, { x: 1, y: 0 });
  assert.deepEqual(doubleTap({ x: 0, y: -1 }).runningDirection, { x: 0, y: -1 });
  assert.deepEqual(doubleTap({ x: 0, y: 1 }).runningDirection, { x: 0, y: 1 });
});

test('la corsa diagonale è normalizzata e può curvare senza accelerare', () => {
  const diagonal = doubleTap({ x: 1, y: -1 }).runningDirection;
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 0.0001);
  const turned = updateRunGesture({
    tapWindow: 0,
    tapDirection: diagonal,
    runningDirection: { x: 1, y: 0 },
  }, { x: 1, y: -1 }, false, 0.26);
  assert.ok(Math.abs(Math.hypot(turned.runningDirection.x, turned.runningDirection.y) - 1) < 0.0001);
});
