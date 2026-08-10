import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveArcadeAction } from '../src/game/input/arcadeControls.ts';
import { RUN_ATTACK, SPIN_SPECIAL } from '../src/game/combat/attacks.ts';

test('A and B map to attack and jump', () => {
  assert.equal(resolveArcadeAction({ attackPressed: true, jumpPressed: false, attackHeld: true, jumpHeld: false }), 'attack');
  assert.equal(resolveArcadeAction({ attackPressed: false, jumpPressed: true, attackHeld: false, jumpHeld: true }), 'jump');
});

test('A+B has priority regardless of which button is pressed last', () => {
  assert.equal(resolveArcadeAction({ attackPressed: true, jumpPressed: false, attackHeld: true, jumpHeld: true }), 'special');
  assert.equal(resolveArcadeAction({ attackPressed: false, jumpPressed: true, attackHeld: true, jumpHeld: true }), 'special');
});

test('running attack knocks down and special covers multiple targets', () => {
  assert.equal(RUN_ATTACK.knockdown, true);
  assert.ok(RUN_ATTACK.knockbackX > 500);
  assert.equal(SPIN_SPECIAL.multiHit, true);
  assert.ok(SPIN_SPECIAL.rangeY > 100);
});
