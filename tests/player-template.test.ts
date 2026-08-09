import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const template = JSON.parse(fs.readFileSync('public/data/character_templates/main_player_v1.json', 'utf8'));
const marco = JSON.parse(fs.readFileSync('public/data/characters/marco.json', 'utf8'));

test('il template protagonista descrive ogni fase della locomozione', () => {
  for (const [name, contract] of Object.entries(template.locomotion) as Array<[string, { frames: number; phases: string[]; loop: boolean }]>) {
    assert.equal(contract.phases.length, contract.frames, `${name}: fasi incomplete`);
    assert.equal(marco.animations[name].frames, contract.frames, `${name}: Marco non rispetta il template`);
    assert.equal(Boolean(marco.animations[name].loop), contract.loop, `${name}: loop non coerente`);
  }
});

test('il template include atterraggio e gate anti-duplicati', () => {
  assert.ok(template.required_clips.includes('land'));
  assert.ok(template.qa.distinct_motion_clips.includes('land'));
  assert.ok(template.qa.max_bottom_opaque_run_px < 24);
  assert.ok(template.qa.min_silhouette_distance > 0);
});
