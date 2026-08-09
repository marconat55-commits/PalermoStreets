import assert from 'node:assert/strict';
import test from 'node:test';
import { locomotionPlaybackRate, selectLocomotionClip } from '../src/game/animation/locomotion.ts';

const hasAll = () => true;

test('mappa movimento orizzontale, alto e basso sui clip canonici', () => {
  assert.equal(selectLocomotionClip({ x: 1, y: 0 }, 'idle', hasAll), 'walk');
  assert.equal(selectLocomotionClip({ x: 0, y: -1 }, 'walk', hasAll), 'walk_up');
  assert.equal(selectLocomotionClip({ x: 0, y: 1 }, 'walk', hasAll), 'walk_down');
});

test('isteresi evita flicker nei cambi diagonali', () => {
  assert.equal(selectLocomotionClip({ x: 1, y: -0.7 }, 'walk', hasAll), 'walk');
  assert.equal(selectLocomotionClip({ x: 1, y: -0.7 }, 'walk_up', hasAll), 'walk_up');
  assert.equal(selectLocomotionClip({ x: 1, y: -0.7 }, 'run_up', hasAll), 'walk_up');
});

test('velocita animazione segue velocita reale e stride di riferimento', () => {
  assert.equal(locomotionPlaybackRate(90, 120), 0.75);
  assert.equal(locomotionPlaybackRate(180, 120), 1.5);
  assert.equal(locomotionPlaybackRate(100), 1);
});
