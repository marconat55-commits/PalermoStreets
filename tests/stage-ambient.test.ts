import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { collectAmbientAssets, frameAtTime } from '../src/game/stage/ambientAssets.ts';

interface SpriteLoopSpec {
  id: string;
  kind: 'sprite_loop';
  frames: string[];
  position: [number, number];
  size: [number, number];
  frame_durations: number[];
  motion_window?: [number, number, number, number];
  parallax: number;
  interactive: false;
}

type AmbientSpec = SpriteLoopSpec | { id: string; kind: string; interactive: false };

const stage = JSON.parse(fs.readFileSync('public/data/stage1_zen.json', 'utf8')) as {
  modules: Array<{ id: string; world_width: number; ambient?: AmbientSpec[] }>;
};

test('Stage 1 no longer renders procedural bird flocks', () => {
  for (const module of stage.modules) {
    assert.equal((module.ambient ?? []).some((actor) => actor.kind === 'bird_flock'), false, `${module.id}: bird flock must stay disabled`);
  }
});

test('M01 activates the balcony resident only inside the authored socket', () => {
  const m01 = stage.modules.find((module) => module.id === 'M01');
  assert.ok(m01);
  const loops = (m01.ambient ?? []).filter((actor): actor is SpriteLoopSpec => actor.kind === 'sprite_loop');
  assert.deepEqual(loops.map((loop) => loop.id), ['m01_signora_balcone', 'm01_venditore_frutta']);
  for (const loop of loops) {
    assert.equal(loop.frames.length, 4);
    assert.equal(loop.frame_durations.length, loop.frames.length);
    assert.ok(loop.position[1] < 635, `${loop.id}: ambient actor must stay behind the WALK lane`);
    assert.ok(loop.size[0] > 0 && loop.size[1] > 0);
    for (const frame of loop.frames) assert.ok(fs.existsSync(`public/${frame}`), `${loop.id}: missing ${frame}`);
  }
  assert.equal(collectAmbientAssets(m01).length, 8);
  const balcony = loops[0]!;
  const vendor = loops[1]!;
  assert.deepEqual(balcony.position, [574, 214]);
  assert.deepEqual(balcony.size, [70, 64]);
  assert.ok(vendor.size[1] >= 0.65 * 290 && vendor.size[1] <= 0.75 * 290, 'vendor must match the rear sidewalk scale');
});

test('sprite loop durations select stable frames and wrap', () => {
  const durations = [1, 2, 1, 2];
  assert.equal(frameAtTime(durations, 0), 0);
  assert.equal(frameAtTime(durations, 1.1), 1);
  assert.equal(frameAtTime(durations, 3.1), 2);
  assert.equal(frameAtTime(durations, 6.1), 0);
  assert.equal(frameAtTime(durations, -0.1), 3);
});
