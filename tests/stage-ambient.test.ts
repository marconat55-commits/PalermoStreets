import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { birdPoint, wrapRange } from '../src/game/stage/ambientMotion.ts';
import { collectAmbientAssets, frameAtTime } from '../src/game/stage/ambientAssets.ts';

interface BirdSpec {
  id: string;
  kind: 'bird_flock';
  bounds: [number, number, number, number];
  count: number;
  speed: number;
  parallax: number;
  scale: number;
  interactive: false;
}

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

type AmbientSpec = BirdSpec | SpriteLoopSpec;

const stage = JSON.parse(fs.readFileSync('public/data/stage1_zen.json', 'utf8')) as {
  modules: Array<{ id: string; world_width: number; ambient?: AmbientSpec[] }>;
};

test('every Stage 1 module has a bounded non-interactive sky flock', () => {
  const ids = new Set<string>();
  for (const module of stage.modules) {
    assert.ok(module.ambient?.length, `${module.id}: ambient layer missing`);
    const flocks = (module.ambient ?? []).filter((actor): actor is BirdSpec => actor.kind === 'bird_flock');
    assert.equal(flocks.length, 1, `${module.id}: exactly one restrained sky flock expected`);
    for (const actor of module.ambient ?? []) {
      assert.equal(actor.interactive, false);
      assert.ok(!ids.has(actor.id), `duplicate ambient id: ${actor.id}`);
      ids.add(actor.id);
      if (actor.kind !== 'bird_flock') continue;
      const [x, y, width, height] = actor.bounds;
      assert.ok(x >= 0 && x + width <= module.world_width, `${actor.id}: horizontal bounds`);
      assert.ok(y >= 35 && y + height <= 300, `${actor.id}: flock must stay in the sky`);
      assert.ok(actor.count >= 3 && actor.count <= 10, `${actor.id}: restrained flock density`);
      assert.ok(actor.speed >= 20 && actor.speed <= 55, `${actor.id}: readable background speed`);
      assert.ok(actor.parallax >= 0.2 && actor.parallax <= 0.5, `${actor.id}: background parallax`);
      assert.ok(actor.scale >= 1.2 && actor.scale <= 1.7, `${actor.id}: gull silhouette scale`);
    }
  }
});

test('M01 has valid balcony and vendor loops outside the combat lane', () => {
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
  assert.deepEqual(balcony.motion_window, [26, 27, 57, 56]);
  assert.deepEqual(balcony.position, [350, 229], 'balcony sill must align with the adjacent facade openings');
  assert.ok(balcony.size[1] >= 0.35 * 290 && balcony.size[1] <= 0.48 * 290, 'balcony module must match the recessed facade scale');
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

test('bird motion loops deterministically inside its authored rectangle', () => {
  const rect: [number, number, number, number] = [100, 60, 500, 120];
  assert.equal(wrapRange(-10, 500), 490);
  for (const elapsed of [0, 1, 15, 120]) {
    const first = birdPoint(elapsed, 42, rect, 30);
    const second = birdPoint(elapsed, 42, rect, 30);
    assert.deepEqual(first, second);
    assert.ok(first.x >= 100 && first.x < 600);
    assert.ok(first.y >= 60 && first.y <= 180);
    assert.ok(first.flap >= -1 && first.flap <= 1);
  }
});
