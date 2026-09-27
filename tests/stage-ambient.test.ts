import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { ambientSpeechVisible, collectAmbientAssets, frameAtTime } from '../src/game/stage/ambientAssets.ts';

interface SpriteLoopSpec {
  id: string;
  kind: 'sprite_loop';
  frames: string[];
  position: [number, number];
  size: [number, number];
  frame_durations: number[];
  motion_window?: [number, number, number, number];
  parallax: number;
  shadow?: { width: number; height: number; offset?: [number, number]; alpha?: number };
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

test('M01 keeps the balcony lady and fruit vendor behind the WALK lane', () => {
  const m01 = stage.modules.find((module) => module.id === 'M01');
  assert.ok(m01);
  const loops = (m01.ambient ?? []).filter((actor): actor is SpriteLoopSpec => actor.kind === 'sprite_loop');
  assert.deepEqual(loops.map((loop) => loop.id), [
    'm01_signora_balcone',
    'm01_venditore_frutta',
  ]);
  for (const loop of loops) {
    assert.ok(loop.frames.length === 2 || loop.frames.length === 4);
    assert.equal(loop.frame_durations.length, loop.frames.length);
    assert.ok(loop.position[1] < 635, `${loop.id}: ambient actor must stay behind the WALK lane`);
    assert.ok(loop.size[0] > 0 && loop.size[1] > 0);
    for (const frame of loop.frames) assert.ok(fs.existsSync(`public/${frame}`), `${loop.id}: missing ${frame}`);
  }
  assert.equal(collectAmbientAssets(m01).length, 8);
  const balcony = loops[0]!;
  const vendor = loops[1]!;
  assert.deepEqual(balcony.position, [503, 170]);
  assert.deepEqual(balcony.size, [77, 70]);
  assert.deepEqual(vendor.position, [1104, 586]);
  assert.deepEqual(vendor.size, [308, 226]);
});

test('Franco Gioia and Duracell are enlarged at the start of M02', () => {
  const m02 = stage.modules.find((module) => module.id === 'M02');
  assert.ok(m02);
  const loops = (m02.ambient ?? []).filter((actor): actor is SpriteLoopSpec => actor.kind === 'sprite_loop');
  assert.deepEqual(loops.map((loop) => loop.id), ['m02_franco_gioia', 'm02_duracell']);
  const franco = loops[0]!;
  const duracell = loops[1]!;
  assert.deepEqual(franco.position, [710, 615]);
  assert.deepEqual(franco.size, [254, 254]);
  assert.deepEqual(duracell.position, [480, 617]);
  assert.deepEqual(duracell.size, [249, 249]);
  assert.deepEqual(franco.shadow, { width: 126, height: 23, offset: [0, -3], alpha: 0.28 });
  assert.deepEqual(duracell.shadow, { width: 122, height: 22, offset: [0, -3], alpha: 0.28 });
  assert.equal(collectAmbientAssets(m02).length, 4);
  for (const loop of loops) {
    assert.ok(loop.position[0] < 800, `${loop.id}: actor must remain near the start of M02`);
    assert.ok(loop.position[1] < 635, `${loop.id}: ambient actor must stay behind the WALK lane`);
    for (const frame of loop.frames) assert.ok(fs.existsSync(`public/${frame}`), `${loop.id}: missing ${frame}`);
  }
});

test('sprite loop durations select stable frames and wrap', () => {
  const durations = [1, 2, 1, 2];
  assert.equal(frameAtTime(durations, 0), 0);
  assert.equal(frameAtTime(durations, 1.1), 1);
  assert.equal(frameAtTime(durations, 3.1), 2);
  assert.equal(frameAtTime(durations, 6.1), 0);
  assert.equal(frameAtTime(durations, -0.1), 3);
});

test('il fumetto di Franco appare dopo cinque secondi e resta visibile per la durata impostata', () => {
  assert.equal(ambientSpeechVisible(4.99, 5, 2.6), false);
  assert.equal(ambientSpeechVisible(5, 5, 2.6), true);
  assert.equal(ambientSpeechVisible(7.59, 5, 2.6), true);
  assert.equal(ambientSpeechVisible(7.61, 5, 2.6), false);
  assert.equal(ambientSpeechVisible(10, 5, 2.6), true);
});
