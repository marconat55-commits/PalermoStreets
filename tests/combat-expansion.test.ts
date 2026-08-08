import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AIR_KICK,
  AIR_PUNCH,
  COMBO_FINISHER,
  GRAB_STRIKE,
  KICK_COMBO,
  KICK_FINISHER,
  LIGHT_COMBO,
  THROW,
  attackTotal,
  canAcquireAttackTarget,
} from '../src/game/combat/attacks.ts';

test('Marco light combo has three ordered, distinct attacks', () => {
  assert.deepEqual(LIGHT_COMBO.map((attack) => attack.name), [
    'punch_left',
    'punch_right',
    'combo_finisher',
  ]);
  assert.equal(new Set(LIGHT_COMBO).size, 3);
  assert.equal(COMBO_FINISHER.knockdown, true);
});

test('Marco kick combo has two setup hits and a distinct launch finisher', () => {
  assert.deepEqual(KICK_COMBO.map((attack) => attack.name), [
    'kick_front',
    'kick_right',
    'kick_finisher',
  ]);
  assert.equal(new Set(KICK_COMBO).size, 3);
  assert.equal(KICK_COMBO[0].knockdown, undefined);
  assert.equal(KICK_COMBO[1].knockdown, undefined);
  assert.equal(KICK_FINISHER.knockdown, true);
});

test('aerial punch and kick are separate readable actions', () => {
  assert.equal(AIR_PUNCH.name, 'air_punch');
  assert.equal(AIR_KICK.name, 'air_attack');
  assert.notEqual(AIR_PUNCH, AIR_KICK);
  assert.ok(AIR_KICK.rangeX >= AIR_PUNCH.rangeX);
});

test('new attacks have valid phase timing and restrained damage', () => {
  for (const attack of [COMBO_FINISHER, KICK_FINISHER, AIR_PUNCH, AIR_KICK, GRAB_STRIKE, THROW]) {
    assert.ok(attack.startup > 0);
    assert.ok(attack.active > 0);
    assert.ok(attack.recovery > 0);
    assert.ok(attackTotal(attack) < 0.8);
    assert.ok(attack.damage > 0 && attack.damage <= 40);
  }
});

test('grab strike keeps the target standing while throw knocks down', () => {
  assert.equal(GRAB_STRIKE.knockdown, undefined);
  assert.equal(THROW.knockdown, true);
  assert.ok(THROW.damage > GRAB_STRIKE.damage);
});

test('a single-hit attack cannot retarget on a later active frame', () => {
  assert.equal(canAcquireAttackTarget(COMBO_FINISHER, 0), true);
  assert.equal(canAcquireAttackTarget(COMBO_FINISHER, 1), false);
  assert.equal(canAcquireAttackTarget(THROW, 1), false);
  assert.equal(canAcquireAttackTarget({ ...THROW, multiHit: true }, 2), true);
});
