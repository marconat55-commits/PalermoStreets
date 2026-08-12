import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveArcadeAction, resolveGrabAction } from '../src/game/input/arcadeControls.ts';
import { RUN_ATTACK, SPIN_SPECIAL } from '../src/game/combat/attacks.ts';

test('J and K map to attack and jump', () => {
  assert.equal(resolveArcadeAction({ attackPressed: true, jumpPressed: false, attackHeld: true, jumpHeld: false }), 'attack');
  assert.equal(resolveArcadeAction({ attackPressed: false, jumpPressed: true, attackHeld: false, jumpHeld: true }), 'jump');
});

test('J+K has priority regardless of which button is pressed last', () => {
  assert.equal(resolveArcadeAction({ attackPressed: true, jumpPressed: false, attackHeld: true, jumpHeld: true }), 'special');
  assert.equal(resolveArcadeAction({ attackPressed: false, jumpPressed: true, attackHeld: true, jumpHeld: true }), 'special');
});

test('grab controls use J for a strike and K for a real throw', () => {
  assert.equal(resolveGrabAction({ attackPressed: true, jumpPressed: false }), 'strike');
  assert.equal(resolveGrabAction({ attackPressed: false, jumpPressed: true }), 'throw');
  assert.equal(resolveGrabAction({ attackPressed: true, jumpPressed: true }), 'throw');
  assert.equal(resolveGrabAction({ attackPressed: false, jumpPressed: false }), null);
});

test('running attack knocks down and special covers multiple targets', () => {
  assert.equal(RUN_ATTACK.knockdown, true);
  assert.ok(RUN_ATTACK.knockbackX > 500);
  assert.equal(SPIN_SPECIAL.multiHit, true);
  assert.ok(SPIN_SPECIAL.rangeX >= 360);
  assert.ok(SPIN_SPECIAL.rangeY >= 160);
  assert.ok(SPIN_SPECIAL.knockbackX >= 700);
});
