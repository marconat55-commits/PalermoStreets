import assert from 'node:assert/strict';
import test from 'node:test';
import { interpolateWalkProfile, resolveWalkBand, sampleWalkBand } from '../src/game/stage/walkBand.ts';
import type { ModuleData } from '../src/game/types.ts';

test('walk profile interpolation clamps ends and interpolates between authored samples', () => {
  const samples: Array<[number, number]> = [[0, 600], [100, 500], [200, 550]];
  assert.equal(interpolateWalkProfile(samples, -20, 0), 600);
  assert.equal(interpolateWalkProfile(samples, 50, 0), 550);
  assert.equal(interpolateWalkProfile(samples, 150, 0), 525);
  assert.equal(interpolateWalkProfile(samples, 250, 0), 550);
});

test('debug sampling includes both world edges and the authored variable band', () => {
  const module = {
    walk_top: [[0, 600], [128, 560]],
    walk_bottom: [[0, 700], [128, 680]],
  } as ModuleData;
  assert.deepEqual(sampleWalkBand(module, 128, [565, 684], 64), [
    { x: 0, top: 600, bottom: 700 },
    { x: 64, top: 580, bottom: 690 },
    { x: 128, top: 560, bottom: 680 },
  ]);
});

test('module walk band resolves variable top and bottom edges', () => {
  const module = {
    walk_top: [[0, 580], [100, 500]],
    walk_bottom: [[0, 700], [100, 680]],
  } as ModuleData;
  assert.deepEqual(resolveWalkBand(module, 50, [565, 684]), [540, 690]);
});
