import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const marco = JSON.parse(fs.readFileSync('public/data/characters/marco.json', 'utf8'));

test('Marco Core carica solo locomozione laterale e archivia le varianti ridondanti', () => {
  for (const clip of ['walk_up', 'walk_down', 'run_up', 'run_down', 'dodge']) {
    assert.equal(marco.animations[clip], undefined, `${clip} non deve essere caricato`);
    assert.ok(marco.archived_animations[clip], `${clip} deve restare conservato`);
  }
  assert.equal(marco.animations.walk.frames, 8);
  assert.equal(marco.animations.run.frames, 8);
  assert.equal(marco.animations.idle.frames, 1);
  assert.equal(marco.animations.idle_variant_1, undefined);
  assert.ok(marco.archived_animations.idle_variant_1);
});

test('ogni selezione runtime usa sorgenti unici e validi', () => {
  for (const [name, spec] of Object.entries(marco.animations) as Array<[string, { frames: number; source_frames?: number; frame_sequence?: number[] }]>) {
    const sourceFrames = spec.source_frames ?? spec.frames;
    const sequence = spec.frame_sequence ?? Array.from({ length: spec.frames }, (_, index) => index + 1);
    assert.equal(sequence.length, spec.frames, `${name}: lunghezza sequenza`);
    assert.equal(new Set(sequence).size, sequence.length, `${name}: posa duplicata`);
    assert.ok(sequence.every((source) => source >= 1 && source <= sourceFrames), `${name}: sorgente fuori range`);
  }
});

test('il budget runtime resta compatto senza ridurre caduta e rialzata', () => {
  const logicalFrames = Object.values(marco.animations as Record<string, { frames: number }>)
    .reduce((total, spec) => total + spec.frames, 0);
  assert.equal(logicalFrames, 128);
  assert.equal(marco.animations.jump.frames, 5);
  assert.deepEqual(marco.animations.jump.visual_scales, [1]);
  assert.equal(marco.animations.super.frames, 5);
  assert.equal(marco.animations.super.contact_frame, 3);
  assert.deepEqual(marco.animations.super.visual_scales, [1]);
  assert.equal(marco.animations.knockdown.frames, 8);
  assert.equal(marco.animations.getup.frames, 8);
});
