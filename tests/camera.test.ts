import assert from 'node:assert/strict';
import test from 'node:test';
import { cameraTargetForPlayer, resolveCameraBounds, smoothCamera } from '../src/game/stage/camera.ts';

test('camera bounds cover exactly the authored world width', () => {
  assert.deepEqual(resolveCameraBounds(2560, 1280), { min: 0, max: 1280 });
  assert.deepEqual(resolveCameraBounds(1280, 1280), { min: 0, max: 0 });
});

test('camera keeps the player inside the 40-60 percent dead zone', () => {
  const bounds = { min: 0, max: 1280 };
  assert.equal(cameraTargetForPlayer(0, 600, 1280, bounds), 0);
  assert.equal(cameraTargetForPlayer(0, 900, 1280, bounds), 132);
  assert.equal(cameraTargetForPlayer(1280, 2500, 1280, bounds), 1280);
});

test('camera smoothing approaches the target without overshooting', () => {
  const next = smoothCamera(0, 800, 1 / 60);
  assert.ok(next > 0 && next < 800);
  assert.equal(smoothCamera(320, 320, 1 / 60), 320);
});
