import assert from 'node:assert/strict';
import test from 'node:test';
import { clampFeetX, horizontalExtents } from '../src/game/animation/visualBounds.ts';
import type { VisualFrame } from '../src/game/types.ts';

function frame(scale = 1): VisualFrame {
  return {
    texture: {} as VisualFrame['texture'],
    duration: 0.1,
    offsetX: 0,
    offsetY: 0,
    scale,
    bounds: [180, 100, 280, 300],
    width: 640,
    height: 420,
  };
}

test('i limiti visivi tengono l’intera posa dentro lo schermo', () => {
  const pose = frame();
  const rightFacing = horizontalExtents(pose, 1);
  assert.deepEqual(rightFacing, { left: -140, right: 140 });
  assert.equal(clampFeetX(1235, pose, 1, 45, 1235), 1089);
  assert.equal(clampFeetX(45, pose, 1, 45, 1235), 191);
});

test('scala e flip sono inclusi nel calcolo dei bordi', () => {
  const pose = frame(1.1);
  assert.deepEqual(horizontalExtents(pose, -1), { left: -154, right: 154 });
});
