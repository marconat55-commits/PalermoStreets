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
  hidden_regions?: Array<[number, number, number, number]>;
  parallax: number;
  shadow?: { width: number; height: number; offset?: [number, number]; alpha?: number };
  speech?: { text: string; interval: number; duration: number; offset?: [number, number]; scale?: number };
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

test('M01 keeps approved ambient actors and static props behind the WALK lane', () => {
  const m01 = stage.modules.find((module) => module.id === 'M01');
  assert.ok(m01);
  const loops = (m01.ambient ?? []).filter((actor): actor is SpriteLoopSpec => actor.kind === 'sprite_loop');
  assert.deepEqual(loops.map((loop) => loop.id), [
    'm01_signora_balcone',
    'm01_venditore_frutta',
    'm01_prop_vespa_blu',
    'm01_prop_cassette_agrumi',
  ]);
  for (const loop of loops) {
    assert.ok(loop.frames.length === 1 || loop.frames.length === 2 || loop.frames.length === 4);
    assert.equal(loop.frame_durations.length, loop.frames.length);
    assert.ok(loop.position[1] < 650, `${loop.id}: ambient actor must stay behind the WALK lane`);
    assert.ok(loop.size[0] > 0 && loop.size[1] > 0);
    for (const frame of loop.frames) assert.ok(fs.existsSync(`public/${frame}`), `${loop.id}: missing ${frame}`);
  }
  assert.equal(collectAmbientAssets(m01).length, 10);
  const balcony = loops[0]!;
  const vendor = loops[1]!;
  assert.deepEqual(balcony.position, [503, 170]);
  assert.deepEqual(balcony.size, [77, 70]);
  assert.deepEqual(vendor.position, [1104, 586]);
  assert.deepEqual(vendor.size, [308, 226]);
  assert.deepEqual(loops.slice(2).map((loop) => loop.position), [[770, 628], [2470, 642]]);
  assert.deepEqual(loops.slice(2).map((loop) => loop.size), [[223, 223], [164, 164]]);
});

test('Franco Gioia and Duracell are enlarged at the start of M02', () => {
  const m02 = stage.modules.find((module) => module.id === 'M02');
  assert.ok(m02);
  const loops = (m02.ambient ?? []).filter((actor): actor is SpriteLoopSpec => actor.kind === 'sprite_loop');
  assert.deepEqual(loops.map((loop) => loop.id), [
    'm02_franco_gioia', 'm02_duracell', 'm02_meccanico', 'm02_prop_vespa_rossa', 'm02_prop_vespa_verde', 'm02_prop_vespa_bianca', 'm02_prop_pneumatico_poggiato', 'm02_prop_cassetta_birre',
  ]);
  const franco = loops[0]!;
  const duracell = loops[1]!;
  assert.deepEqual(franco.position, [710, 615]);
  assert.deepEqual(franco.size, [267, 267]);
  assert.equal(franco.speech?.text, 'HAHAHA CUINNUTI CA SITI!!!');
  assert.equal(franco.speech?.interval, 5);
  assert.deepEqual(duracell.position, [480, 617]);
  assert.deepEqual(duracell.size, [261, 261]);
  assert.deepEqual(duracell.hidden_regions, [[156, 9, 20, 29]]);
  assert.deepEqual(franco.shadow, { width: 126, height: 23, offset: [0, -3], alpha: 0.28 });
  assert.deepEqual(duracell.shadow, { width: 122, height: 22, offset: [0, -3], alpha: 0.28 });
  const mechanic = loops[2]!;
  assert.deepEqual(mechanic.position, [1810, 525]);
  assert.deepEqual(mechanic.size, [151, 151]);
  assert.equal(collectAmbientAssets(m02).length, 11);
  for (const loop of loops) {
    if (loop.id === 'm02_franco_gioia' || loop.id === 'm02_duracell') assert.ok(loop.position[0] < 800, `${loop.id}: actor must remain near the start of M02`);
    assert.ok(loop.position[1] < 635, `${loop.id}: ambient actor must stay behind the WALK lane`);
    for (const frame of loop.frames) assert.ok(fs.existsSync(`public/${frame}`), `${loop.id}: missing ${frame}`);
  }
  assert.deepEqual(loops.slice(3).map((loop) => loop.position), [[1990, 590], [2420, 590], [2520, 590], [3020, 560], [270, 630]]);
  assert.deepEqual(loops.slice(3).map((loop) => loop.size), [[190, 190], [190, 190], [190, 190], [112, 112], [130, 130]]);
});

test('M03 copre i quattro raccordi e arricchisce il fondo con props statici proporzionati', () => {
  const m03 = stage.modules.find((module) => module.id === 'M03');
  assert.ok(m03);
  const loops = (m03.ambient ?? []).filter((actor): actor is SpriteLoopSpec => actor.kind === 'sprite_loop');
  assert.deepEqual(loops.map((loop) => loop.id), [
    'm03_franco_gioia',
    'm03_duracell',
    'm03_large_tree_seam_01',
    'm03_prop_cassetta_birre_tree_left',
    'm03_bush_wide_gold_seam_02_03',
    'm03_bush_tall_grass_seam_03_04',
    'm03_road_sign_seam_04_05',
    'm03_bush_round_end',
  ]);
  const franco = loops[0]!;
  assert.equal(franco.frames.length, 2);
  assert.deepEqual(franco.frame_durations, [1.55, 0.8]);
  assert.deepEqual(franco.position, [820, 452]);
  assert.deepEqual(franco.size, [152, 152]);
  assert.deepEqual(franco.shadow, { width: 64, height: 12, offset: [0, -2], alpha: 0.22 });
  assert.equal(franco.speech, undefined);
  assert.equal(franco.parallax, 1);
  assert.equal(franco.interactive, false);
  for (const frame of franco.frames) assert.ok(fs.existsSync(`public/${frame}`), `missing ${frame}`);
  const duracell = loops[1]!;
  assert.equal(duracell.frames.length, 2);
  assert.deepEqual(duracell.frame_durations, [1.75, 0.75]);
  assert.deepEqual(duracell.position, [720, 447]);
  assert.deepEqual(duracell.size, [145, 145]);
  assert.deepEqual(duracell.shadow, { width: 62, height: 11, offset: [0, -2], alpha: 0.22 });
  assert.deepEqual(duracell.hidden_regions, [[82, 5, 11, 15]]);
  assert.equal(duracell.parallax, 1);
  assert.equal(duracell.interactive, false);
  for (const frame of duracell.frames) assert.ok(fs.existsSync(`public/${frame}`), `missing ${frame}`);
  const tree = loops[2]!;
  assert.equal(tree.frames.length, 2);
  assert.equal(tree.frames[0], tree.frames[1]);
  assert.deepEqual(tree.frame_durations, [1, 1]);
  assert.deepEqual(tree.position, [1095, 458]);
  assert.deepEqual(tree.size, [290, 362]);
  assert.equal(tree.parallax, 1);
  assert.equal(tree.interactive, false);
  for (const frame of tree.frames) assert.ok(fs.existsSync(`public/${frame}`), `missing ${frame}`);
  const leftCrate = loops[3]!;
  assert.deepEqual(leftCrate.position, [1010, 466]);
  assert.deepEqual(leftCrate.size, [76, 76]);
  assert.equal(leftCrate.frames[0], leftCrate.frames[1]);
  assert.equal(leftCrate.interactive, false);
  const bush = loops[4]!;
  assert.equal(bush.frames.length, 2);
  assert.equal(bush.frames[0], bush.frames[1]);
  assert.deepEqual(bush.frame_durations, [1, 1]);
  assert.deepEqual(bush.position, [2348, 458]);
  assert.deepEqual(bush.size, [270, 180]);
  assert.equal(bush.parallax, 1);
  assert.equal(bush.interactive, false);
  for (const frame of bush.frames) assert.ok(fs.existsSync(`public/${frame}`), `missing ${frame}`);
  const tallBush = loops[5]!;
  assert.equal(tallBush.frames.length, 2);
  assert.equal(tallBush.frames[0], tallBush.frames[1]);
  assert.deepEqual(tallBush.frame_durations, [1, 1]);
  assert.deepEqual(tallBush.position, [3522, 458]);
  assert.deepEqual(tallBush.size, [230, 230]);
  assert.equal(tallBush.parallax, 1);
  assert.equal(tallBush.interactive, false);
  for (const frame of tallBush.frames) assert.ok(fs.existsSync(`public/${frame}`), `missing ${frame}`);
  const sign = loops[6]!;
  assert.equal(sign.frames.length, 2);
  assert.equal(sign.frames[0], sign.frames[1]);
  assert.deepEqual(sign.frame_durations, [1, 1]);
  assert.deepEqual(sign.position, [4695, 458]);
  assert.deepEqual(sign.size, [240, 300]);
  assert.equal(sign.parallax, 1);
  assert.equal(sign.interactive, false);
  for (const frame of sign.frames) assert.ok(fs.existsSync(`public/${frame}`), `missing ${frame}`);
  const roundBush = loops[7]!;
  assert.equal(roundBush.frames.length, 2);
  assert.equal(roundBush.frames[0], roundBush.frames[1]);
  assert.deepEqual(roundBush.frame_durations, [1, 1]);
  assert.deepEqual(roundBush.position, [5450, 482]);
  assert.deepEqual(roundBush.size, [210, 210]);
  assert.equal(roundBush.parallax, 1);
  assert.equal(roundBush.interactive, false);
  for (const frame of roundBush.frames) assert.ok(fs.existsSync(`public/${frame}`), `missing ${frame}`);
  assert.deepEqual(collectAmbientAssets(m03), [
    ...franco.frames,
    ...duracell.frames,
    tree.frames[0],
    leftCrate.frames[0],
    bush.frames[0],
    tallBush.frames[0],
    sign.frames[0],
    roundBush.frames[0],
  ]);
});

test('sprite loop durations select stable frames and wrap', () => {
  const durations = [1, 2, 1, 2];
  assert.equal(frameAtTime(durations, 0), 0);
  assert.equal(frameAtTime(durations, 1.1), 1);
  assert.equal(frameAtTime(durations, 3.1), 2);
  assert.equal(frameAtTime(durations, 6.1), 0);
  assert.equal(frameAtTime(durations, -0.1), 3);
});

test('il fumetto di Franco attende cinque secondi completi tra due apparizioni', () => {
  assert.equal(ambientSpeechVisible(4.99, 5, 2.6), false);
  assert.equal(ambientSpeechVisible(5, 5, 2.6), true);
  assert.equal(ambientSpeechVisible(7.59, 5, 2.6), true);
  assert.equal(ambientSpeechVisible(7.61, 5, 2.6), false);
  assert.equal(ambientSpeechVisible(12.59, 5, 2.6), false);
  assert.equal(ambientSpeechVisible(12.6, 5, 2.6), true);
});




