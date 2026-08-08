import assert from 'node:assert/strict';
import test from 'node:test';
import { nextIdleVariant, orderedIdleVariants } from '../src/game/animation/idleVariants.ts';

test('ordina e ruota le quattro animazioni idle di personalità', () => {
  const variants = orderedIdleVariants(['walk', 'idle_variant_4', 'idle_variant_2', 'idle', 'idle_variant_1', 'idle_variant_3']);
  assert.deepEqual(variants, ['idle_variant_1', 'idle_variant_2', 'idle_variant_3', 'idle_variant_4']);
  assert.deepEqual(nextIdleVariant(variants, 0), { name: 'idle_variant_1', nextIndex: 1 });
  assert.deepEqual(nextIdleVariant(variants, 3), { name: 'idle_variant_4', nextIndex: 0 });
});
