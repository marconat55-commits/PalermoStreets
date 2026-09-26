import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

interface Module {
  id: string;
  art_status: 'approved' | 'placeholder_rebuild_required';
  reference_actor_height: number;
  horizon_y?: number;
  playfield_y: [number, number];
  walk_top: Array<[number, number]>;
  walk_bottom: Array<[number, number]>;
  entry: [number, number];
  waves: Array<{ spawns: Array<[number, number]> }>;
  world_width: number;
  camera_bounds: [number, number];
  background_layers: Array<{ src: string; plane: string; parallax: number; enabled?: boolean; x?: number; y?: number; width?: number; height?: number }>;
}

const stage = JSON.parse(fs.readFileSync('public/data/stage1_zen.json', 'utf8')) as { modules: Module[] };

test('M01 conserva la walk band approvata e gli spawn restano al suo interno', () => {
  assert.deepEqual(stage.modules.map((module) => module.id), ['M01']);
  for (const module of stage.modules) {
    const expectedWorldWidth = 2560;
    const expectedCameraMax = expectedWorldWidth - 1280;
    const expectedLayerHeight = 871;
    const expectedLayerY = -144;
    const expectedLayerWidth = 3098;
    const [top, bottom] = module.playfield_y;
    assert.ok(top >= 390 && top < bottom && bottom <= 710, `${module.id}: invalid WALK envelope`);
    assert.equal(module.walk_top[0]?.[0], 0, `${module.id}: WALK top must start at world X 0`);
    assert.equal(module.walk_bottom[0]?.[0], 0, `${module.id}: WALK bottom must start at world X 0`);
    assert.equal(module.walk_top.at(-1)?.[0], module.world_width, `${module.id}: WALK top must span the world`);
    assert.equal(module.walk_bottom.at(-1)?.[0], module.world_width, `${module.id}: WALK bottom must span the world`);
    assert.equal(module.world_width, expectedWorldWidth, `${module.id}: unexpected authored world width`);
    assert.deepEqual(module.camera_bounds, [0, expectedCameraMax], `${module.id}: camera must cover the authored world`);
    assert.ok(module.entry[1] >= top && module.entry[1] <= bottom, `${module.id}: entry outside WALK band`);
    for (const wave of module.waves) {
      for (const [, feetY] of wave.spawns) {
        assert.ok(feetY >= top && feetY <= bottom, `${module.id}: enemy spawn outside WALK band`);
      }
    }
    for (const layer of module.background_layers) {
      assert.equal(layer.x, -269, `${module.id}: unexpected layer X`);
      assert.equal(layer.width, expectedLayerWidth, `${module.id}: unexpected display width`);
      assert.equal(layer.height, expectedLayerHeight, `${module.id}: unexpected layer height`);
      assert.equal(layer.y, expectedLayerY, `${module.id}: unexpected layer Y`);
    }
    const far = module.background_layers.find((layer) => layer.plane === 'far');
    const main = module.background_layers.find((layer) => layer.plane === 'main');
    assert.equal(far?.parallax, 0.22, `${module.id}: continuous Palermo skyline must use far parallax`);
    assert.equal(far?.src, 'assets/backgrounds/stage1_zen/final_v2/M01/M01_FAR.png');
    assert.equal(main?.src, 'assets/backgrounds/stage1_zen/final_v2/M01/M01_MAIN.png');
  }
});

test('M01 conserva la walkline verde impostata dall utente', () => {
  const m01 = stage.modules.find((module) => module.id === 'M01');
  assert.deepEqual(m01?.playfield_y, [650, 705]);
  assert.ok(m01);
  assert.equal(m01.playfield_y[1] - m01.playfield_y[0], 55, 'M01 road lane must match the user-authored green line');
  assert.deepEqual(m01.walk_top, [[0, 650], [640, 652], [1280, 655], [1920, 660], [2560, 665]]);
  for (const wave of m01.waves) {
    for (const [, feetY] of wave.spawns) {
      assert.ok(feetY >= m01.playfield_y[0], 'spawn outside the authored ground plane');
    }
  }
});

test('il modulo giocabile usa lo sfondo approvato; gli altri sono archiviati', () => {
  const approved = stage.modules.filter((module) => module.art_status === 'approved');
  assert.deepEqual(approved.map((module) => module.id), ['M01']);
  assert.deepEqual(approved.map((module) => module.horizon_y), [315]);
  for (const module of stage.modules) assert.equal(module.reference_actor_height, 290);
  const archived = JSON.parse(fs.readFileSync('art_source/stages/stage1_zen/stage1_zen_runtime_legacy_M01_M04_2026-09-26.json', 'utf8')) as { modules: Module[] };
  assert.deepEqual(archived.modules.map((module) => module.id), ['M01', 'M02', 'M03', 'M04']);
});
