import assert from 'node:assert/strict';
import test from 'node:test';
import { Animator } from '../src/game/animation/Animator.ts';
import type { AnimationBank, AnimationClip, VisualFrame } from '../src/game/types.ts';

function clip(durations: number[], loop = true): AnimationClip {
  const frames = durations.map((duration) => ({
    texture: {} as VisualFrame['texture'],
    duration,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    bounds: [0, 0, 1, 1] as [number, number, number, number],
    width: 1,
    height: 1,
  }));
  return { frames, loop, sourceFacing: 1 };
}

function bank(): AnimationBank {
  return { clips: new Map([
    ['idle', clip([0.2])],
    ['walk', clip([0.1, 0.1, 0.1, 0.1])],
    ['walk_up', clip([0.2, 0.2, 0.2, 0.2])],
    ['attack', clip([0.1, 0.2, 0.3], false)],
  ]) };
}

test('preserva la fase del passo tra direzioni', () => {
  const animator = new Animator(bank(), 'walk');
  animator.update(0.25);
  animator.play('walk_up', false, true);
  assert.equal(animator.frameIndex, 2);
  assert.ok(Math.abs(animator.frameElapsed - 0.1) < 1e-8);
});

test('playback rate controlla il tempo senza cambiare dati gameplay', () => {
  const animator = new Animator(bank(), 'walk');
  animator.setPlaybackRate(2);
  animator.update(0.1);
  assert.equal(animator.frameIndex, 2);
});

test('fitDuration adatta il clip alla finestra di attacco', () => {
  const animator = new Animator(bank(), 'attack');
  animator.fitDuration(1.2);
  assert.ok(Math.abs(animator.playbackRate - 0.5) < 1e-8);
  animator.update(1.19);
  assert.equal(animator.finished, false);
  animator.update(0.02);
  assert.equal(animator.finished, true);
});

test('il cambio clip conserva brevemente la posa precedente senza alterare il timing', () => {
  const animator = new Animator(bank(), 'idle');
  const previous = animator.frame;
  animator.play('attack', true);
  assert.equal(animator.transitionFrame, previous);
  assert.equal(animator.transitionAlpha, 1);
  animator.update(0.03);
  assert.ok(animator.transitionAlpha > 0 && animator.transitionAlpha < 1);
  animator.update(0.04);
  assert.equal(animator.transitionFrame, null);
  assert.equal(animator.frameIndex, 0);
});
