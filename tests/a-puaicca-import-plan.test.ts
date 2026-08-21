import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { collectExpectedFrames } from '../scripts/character-import-contract.mjs';

test('A Puaicca uses a compact 29-frame original-enemy budget', () => {
  const profile = JSON.parse(fs.readFileSync('character_specs/profiles/a_puaicca.json', 'utf8'));
  const template = JSON.parse(fs.readFileSync('public/data/character_templates/enemy_original_simple_v1.json', 'utf8'));
  const frames = collectExpectedFrames(profile, 'character_inputs/a_puaicca_v1');
  assert.equal(frames.size, 29);
  assert.equal(profile.factory.animation_template, 'data/character_templates/enemy_original_simple_v1.json');
  assert.equal(template.minimum_unique_frames.total, 29);
  assert.equal(template.raster.uniform_runtime_scale_only, true);
  assert.equal(profile.animations.walk.playback_mode, 'pingpong');
  assert.deepEqual(profile.animations.walk.frame_sequence, [1, 2, 3, 4, 5, 4, 3, 2]);
  assert.equal(profile.animations.heavy.folder, profile.animations.attack.folder);
  assert.equal(profile.animations.dead.folder, profile.animations.knockdown.folder);
  assert.equal(profile.gameplay.enemy.attack_pattern, 'single');
});
