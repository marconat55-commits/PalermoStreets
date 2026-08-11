import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const template = JSON.parse(fs.readFileSync('public/data/character_templates/main_player_full_v2.json', 'utf8'));

test('il template full usa locomozione laterale condivisa e una idle narrativa core', () => {
  assert.deepEqual(template.direction_policy.authored_clips, ['walk', 'run']);
  assert.ok(!template.required_clips.includes('run_up'));
  assert.ok(!template.required_clips.includes('run_down'));
  assert.ok(!template.required_clips.includes('dodge'));
  assert.equal(template.personality_idles.required_count, 1);
  assert.ok(template.personality_idles.minimum_frames_each >= 8);
  assert.equal(template.personality_idles.allow_frame_blend, false);
});

test('caduta e rialzata non possono modificare la scala runtime', () => {
  assert.equal(template.qa.runtime_scale_locked, 1);
  assert.deepEqual(template.qa.locked_scale_clips, ['knockdown', 'getup', 'dead']);
  assert.ok(template.clip_targets.knockdown.minimum_frames >= 8);
  assert.ok(template.clip_targets.getup.minimum_frames >= 8);
});
