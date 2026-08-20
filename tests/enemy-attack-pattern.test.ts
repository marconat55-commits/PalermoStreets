import assert from 'node:assert/strict';
import test from 'node:test';
import { selectEnemyAttackSlot } from '../src/game/combat/enemyAttackPattern.ts';

test('Haggar alterna sempre i due slot leggibili', () => {
  const first = selectEnemyAttackSlot('alternate', 0, 0.5, 0.99);
  const second = selectEnemyAttackSlot('alternate', first.nextSequence, 0.5, 0.99);
  const third = selectEnemyAttackSlot('alternate', second.nextSequence, 0.5, 0.01);
  assert.deepEqual([first.slot, second.slot, third.slot], ['light', 'heavy', 'light']);
});

test('AIori usa sempre il singolo colpo anche con un random favorevole al pesante', () => {
  assert.equal(selectEnemyAttackSlot('single', 0, 1, 0).slot, 'light');
});

test('gli archetipi esistenti conservano la selezione pesata', () => {
  assert.equal(selectEnemyAttackSlot('weighted', 0, 0.4, 0.2).slot, 'heavy');
  assert.equal(selectEnemyAttackSlot('weighted', 0, 0.4, 0.8).slot, 'light');
});
