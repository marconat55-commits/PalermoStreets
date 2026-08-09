import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldStartRunBrake } from '../src/game/animation/movementTransitions.ts';

test('la frenata parte solo quando una corsa viene realmente interrotta', () => {
  assert.equal(shouldStartRunBrake(true, false, 0), true);
  assert.equal(shouldStartRunBrake(false, false, 0), false);
  assert.equal(shouldStartRunBrake(true, true, 1), false);
  assert.equal(shouldStartRunBrake(true, false, 1), false);
});
