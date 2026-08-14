import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const readProfile = (id: string) => JSON.parse(fs.readFileSync(path.join(root, 'public/data/characters', `${id}.json`), 'utf8'));

test('Haggar reference exposes exactly two combat slots', () => {
  const profile = readProfile('haggar_ref');
  assert.equal(profile.role, 'enemy');
  assert.equal(profile.factory.attack_slots, 2);
  assert.ok(profile.animations.attack.frames >= 4);
  assert.ok(profile.animations.heavy.frames >= 4);
  assert.equal(profile.animations.dodge, undefined);
});

test('AIori reference exposes one attack and one dodge', () => {
  const profile = readProfile('aiori_ref');
  assert.equal(profile.role, 'enemy');
  assert.equal(profile.factory.attack_slots, 1);
  assert.equal(profile.factory.dodge_slots, 1);
  assert.ok(profile.animations.attack.frames >= 4);
  assert.ok(profile.animations.dodge.frames >= 5);
  assert.equal(profile.gameplay.enemy.heavy_chance, 0);
  assert.equal(profile.animations.heavy.folder, profile.animations.attack.folder);
  assert.ok(profile.gameplay.enemy.dodge_chance > 0);
});

test('enemy model clips keep scale locked and legal frame counts', () => {
  for (const id of ['haggar_ref', 'aiori_ref']) {
    const profile = readProfile(id);
    for (const [name, clip] of Object.entries(profile.animations) as Array<[string, { frames: number; durations: number[]; visual_scales: number[] }]>) {
      assert.ok(clip.frames > 0, `${id}/${name}`);
      assert.equal(clip.durations.length, clip.frames, `${id}/${name}: durations`);
      assert.deepEqual(clip.visual_scales, [1], `${id}/${name}: runtime scale`);
    }
  }
});
