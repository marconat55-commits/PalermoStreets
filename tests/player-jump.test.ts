import assert from 'node:assert/strict';
import test from 'node:test';
import { PLAYER_JUMP_GRAVITY, PLAYER_JUMP_VELOCITY } from '../src/game/config.ts';

test('il salto crowdfunding è più alto ma resta rapido e controllabile', () => {
  const apex = (PLAYER_JUMP_VELOCITY ** 2) / (2 * PLAYER_JUMP_GRAVITY);
  const duration = (PLAYER_JUMP_VELOCITY * 2) / PLAYER_JUMP_GRAVITY;
  assert.ok(apex >= 145 && apex <= 150, `apice inatteso: ${apex}`);
  assert.ok(duration >= 0.85 && duration <= 0.9, `durata inattesa: ${duration}`);
});
