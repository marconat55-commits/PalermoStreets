import assert from 'node:assert/strict';
import test from 'node:test';
import { selectJumpClip } from '../src/game/animation/jumpAnimation.ts';

test('il salto neutro usa sempre la sequenza verticale', () => {
  assert.equal(selectJumpClip(0, true), 'jump');
});

test('una direzione orizzontale usa la capriola quando disponibile', () => {
  assert.equal(selectJumpClip(1, true), 'jump_forward');
  assert.equal(selectJumpClip(-1, true), 'jump_forward');
});

test('i personaggi senza jump_forward mantengono il fallback compatibile', () => {
  assert.equal(selectJumpClip(1, false), 'jump');
});
