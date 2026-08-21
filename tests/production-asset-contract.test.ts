import assert from 'node:assert/strict';
import test from 'node:test';
import { isLooseAnimationPng } from '../scripts/production-asset-contract.mjs';

test('production packaging removes loose frames but preserves atlas pages', () => {
  const root = 'dist/assets/characters/marco_anim';
  assert.equal(isLooseAnimationPng(`${root}/walk/01.png`, root), true);
  assert.equal(isLooseAnimationPng(`${root}/atlas/atlas_01.png`, root), false);
  assert.equal(isLooseAnimationPng(`${root}/atlas/atlas.json`, root), false);
});
