import assert from 'node:assert/strict';
import test from 'node:test';
import { locomotionPlaybackRate, resolveCombatFacing, selectLocomotionClip } from '../src/game/animation/locomotion.ts';

const hasAll = () => true;

test('riusa la camminata laterale in ogni direzione', () => {
  assert.equal(selectLocomotionClip({ x: 1, y: 0 }, 'idle', hasAll), 'walk');
  assert.equal(selectLocomotionClip({ x: 0, y: -1 }, 'walk', hasAll), 'walk');
  assert.equal(selectLocomotionClip({ x: 0, y: 1 }, 'walk', hasAll), 'walk');
  assert.equal(selectLocomotionClip({ x: -0.7, y: -0.7 }, 'run', hasAll), 'walk');
});

test('il movimento verticale conserva il facing di combattimento', () => {
  assert.equal(resolveCombatFacing(1, { x: 0, y: -1 }), 1);
  assert.equal(resolveCombatFacing(-1, { x: 0, y: 1 }), -1);
  assert.equal(resolveCombatFacing(-1, { x: 1, y: -1 }), 1);
  assert.equal(resolveCombatFacing(1, { x: -1, y: 1 }), -1);
});

test('velocita animazione segue velocita reale e stride di riferimento', () => {
  assert.equal(locomotionPlaybackRate(90, 120), 0.75);
  assert.equal(locomotionPlaybackRate(180, 120), 1.5);
  assert.equal(locomotionPlaybackRate(100), 1);
});
