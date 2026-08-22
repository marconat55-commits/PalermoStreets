import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test("A' Puaicca starts fully opaque without changing character art or scale", () => {
  const profile = JSON.parse(fs.readFileSync('public/data/characters/a_puaicca.json', 'utf8'));
  assert.equal(profile.gameplay.enemy.spawn_fade_seconds, 0);
  assert.equal(profile.gameplay.enemy.visual_scale, 1);
});
