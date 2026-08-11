import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const index = JSON.parse(fs.readFileSync('public/data/characters/index.json', 'utf8'));

test('caduta, rialzata e morte mantengono scala runtime 1 per ogni personaggio', () => {
  for (const id of index.characters) {
    const profile = JSON.parse(fs.readFileSync(`public/data/characters/${id}.json`, 'utf8'));
    for (const clip of ['knockdown', 'getup', 'dead']) {
      const scales = profile.animations[clip].visual_scales ?? [1];
      assert.ok(scales.every((value: number) => Math.abs(value - 1) < 0.0001), `${id}/${clip}: zoom runtime rilevato`);
    }
  }
});

test('le idle non applicano dissolvenze periodiche', () => {
  for (const id of index.characters) {
    const profile = JSON.parse(fs.readFileSync(`public/data/characters/${id}.json`, 'utf8'));
    for (const [name, clip] of Object.entries(profile.animations) as Array<[string, { frame_blend?: number }]>) {
      if (name === 'idle' || name.startsWith('idle_variant_')) {
        assert.equal(clip.frame_blend ?? 0, 0, `${id}/${name}: possibile lampeggio idle`);
      }
    }
  }
});

test('Marco mantiene scala piena in salto e attacco aereo e una frenata progressiva', () => {
  const profile = JSON.parse(fs.readFileSync('public/data/characters/marco.json', 'utf8'));
  for (const clip of ['jump', 'air_attack']) {
    const scales = profile.animations[clip].visual_scales ?? [1];
    assert.ok(scales.every((value: number) => Math.abs(value - 1) < 0.0001), `marco/${clip}: riduzione runtime rilevata`);
  }
  assert.deepEqual(profile.animations.brake.visual_scales, [0.96, 0.96, 0.93, 0.98]);
});
