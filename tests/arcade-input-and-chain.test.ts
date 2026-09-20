import assert from 'node:assert/strict';
import test from 'node:test';
import { movementAlias } from '../src/game/input/Input.ts';
import { comboChainTime } from '../src/game/combat/chainTiming.ts';
import { PUNCH_LEFT, PUNCH_RIGHT } from '../src/game/combat/attacks.ts';

test('frecce e WASD condividono i comandi di movimento senza perdere i tasti fisici', () => {
  assert.equal(movementAlias('KeyA'), 'ArrowLeft');
  assert.equal(movementAlias('KeyD'), 'ArrowRight');
  assert.equal(movementAlias('KeyW'), 'ArrowUp');
  assert.equal(movementAlias('KeyS'), 'ArrowDown');
  assert.equal(movementAlias('KeyJ'), 'KeyJ');
});

test('il combo successivo parte dopo il contatto ma prima della fine del recupero', () => {
  for (const attack of [PUNCH_LEFT, PUNCH_RIGHT]) {
    const contactEnd = attack.startup + attack.active;
    const chain = comboChainTime(attack);
    assert.ok(chain > contactEnd);
    assert.ok(chain < contactEnd + attack.recovery);
  }
});
