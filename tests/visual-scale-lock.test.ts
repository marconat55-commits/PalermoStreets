import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const index = JSON.parse(fs.readFileSync('public/data/characters/index.json', 'utf8'));
const merge = (base: any, override: any): any => {
  if (!base || !override || typeof base !== 'object' || typeof override !== 'object' || Array.isArray(base) || Array.isArray(override)) return override;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) result[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(result[key], value) : value;
  return result;
};
const readProfile = (id: string): any => {
  const source = JSON.parse(fs.readFileSync(`public/data/characters/${id}.json`, 'utf8'));
  return source.extends ? merge(readProfile(source.extends), source) : source;
};

test('ogni posa runtime mantiene scala 1 per ogni personaggio', () => {
  for (const id of index.characters) {
    const profile = readProfile(id);
    for (const [name, clip] of Object.entries(profile.animations) as Array<[string, { visual_scales?: number[] }]>) {
      const scales = clip.visual_scales ?? [1];
      assert.ok(scales.every((value: number) => Math.abs(value - 1) < 0.0001), `${id}/${name}: zoom runtime rilevato`);
    }
  }
});

test('Talebano usa un solo fattore globale heavy senza zoom tra pose', () => {
  const profile = readProfile('talebano');
  assert.equal(profile.visual_height, 318);
  assert.equal(profile.gameplay.enemy.visual_scale, 1.045);
  assert.equal(profile.gameplay.enemy.collision_scale, 1.1);
});

test('le idle non applicano dissolvenze periodiche', () => {
  for (const id of index.characters) {
    const profile = readProfile(id);
    for (const [name, clip] of Object.entries(profile.animations) as Array<[string, { frame_blend?: number }]>) {
      if (name === 'idle' || name.startsWith('idle_variant_')) {
        assert.equal(clip.frame_blend ?? 0, 0, `${id}/${name}: possibile lampeggio idle`);
      }
    }
  }
});

test('nessun profilo richiede frame blending, gestito solo dal raccordo breve del runtime', () => {
  for (const id of index.characters) {
    const profile = readProfile(id);
    for (const [name, clip] of Object.entries(profile.animations) as Array<[string, { frame_blend?: number }]>) {
      assert.equal(clip.frame_blend ?? 0, 0, `${id}/${name}: frame blending configurato nel profilo`);
    }
  }
});

test('Talebano usa sei fasi di camminata uniche e una reazione impatto-recupero esplicita', () => {
  const profile = JSON.parse(fs.readFileSync('public/data/characters/talebano.json', 'utf8'));
  assert.deepEqual(profile.animations.walk.frame_sequence, [1, 2, 3, 4, 5, 6]);
  assert.equal(new Set(profile.animations.walk.frame_sequence).size, 6);
  assert.deepEqual(profile.animations.hit.frame_sequence, [1, 2, 3]);
  assert.ok(profile.animations.hit.durations[0] < profile.animations.hit.durations[2]);
});
