import assert from 'node:assert/strict';
import test from 'node:test';
import { itemWithinRange, resolveItemInteraction } from '../src/game/objects/itemRules.ts';

test('J raccoglie un oggetto vicino quando le mani sono libere', () => {
  assert.equal(resolveItemInteraction(null, true), 'pickup');
  assert.equal(resolveItemInteraction(null, false), null);
});

test('un oggetto impugnato ha priorità su un nuovo pickup', () => {
  assert.equal(resolveItemInteraction('melee', true), 'melee');
  assert.equal(resolveItemInteraction('throwable', true), 'throw');
});

test('la distanza di interazione rispetta separatamente asse e profondità', () => {
  assert.equal(itemWithinRange({ x: 100, y: 600 }, { x: 170, y: 635 }, 78, 42), true);
  assert.equal(itemWithinRange({ x: 100, y: 600 }, { x: 181, y: 635 }, 78, 42), false);
  assert.equal(itemWithinRange({ x: 100, y: 600 }, { x: 170, y: 645 }, 78, 42), false);
});
