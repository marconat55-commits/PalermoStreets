import assert from 'node:assert/strict';
import test from 'node:test';
import { moduleCharacterScale } from '../src/game/stage/moduleCharacterScale.ts';

test('la scala combattenti è indipendente per modulo e resta entro il limite editor', () => {
  assert.equal(moduleCharacterScale({}), 1);
  assert.equal(moduleCharacterScale({ character_scale: 0.92 }), 0.92);
  assert.equal(moduleCharacterScale({ character_scale: 1.08 }), 1.08);
  assert.equal(moduleCharacterScale({ character_scale: 0.4 }), 0.8);
  assert.equal(moduleCharacterScale({ character_scale: 2 }), 1.2);
});
