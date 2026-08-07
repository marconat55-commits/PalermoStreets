import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldStartRunBrake } from '../src/game/animation/movementTransitions.ts';

test('la frenata parte solo quando una corsa viene realmente interrotta', () => {
  assert.equal(shouldStartRunBrake(true, 0, 0), true);
  assert.equal(shouldStartRunBrake(false, 0, 0), false);
  assert.equal(shouldStartRunBrake(true, 1, 1), false);
  assert.equal(shouldStartRunBrake(true, 0, 1), false);
});
