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
  background_layers: Array<{ src: string; plane: string; parallax: number; enabled?: boolean; y?: number; width?: number; height?: number }>;
}

const stage = JSON.parse(fs.readFileSync('public/data/stage1_zen.json', 'utf8')) as { modules: Module[] };

test('each Zen module owns an authored walk band and every feet spawn stays inside it', () => {
  assert.ok(new Set(stage.modules.map((module) => module.playfield_y.join(':'))).size >= 3);
  for (const module of stage.modules) {
    const integratedM02 = module.id === 'M02';
    const expectedWorldWidth = integratedM02 ? 2560 : 2944;
    const expectedCameraMax = expectedWorldWidth - 1280;
    const expectedLayerHeight = integratedM02 ? 720 : 828;
    const expectedLayerY = integratedM02 ? 0 : -108;
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
      assert.equal(layer.width, expectedWorldWidth, `${module.id}: layer width not authored to its world`);
      assert.equal(layer.height, expectedLayerHeight, `${module.id}: unexpected layer height`);
      assert.equal(layer.y, expectedLayerY, `${module.id}: unexpected layer Y`);
    }
    const far = module.background_layers.find((layer) => layer.plane === 'far');
    const main = module.background_layers.find((layer) => layer.plane === 'main');
    assert.equal(far?.parallax, 0.22, `${module.id}: continuous Palermo skyline must use far parallax`);
    if (integratedM02) {
      assert.equal(far?.src, 'assets/backgrounds/stage1_zen/final_v1/M02/M02_FAR.png');
      assert.equal(main?.src, 'assets/backgrounds/stage1_zen/final_v1/M02/M02_MAIN.png');
    } else {
      assert.equal(far?.src, 'assets/backgrounds/stage1_zen/long/ZEN_FAR_SKYLINE.png', `${module.id}: FAR must be continuous`);
      assert.ok(main?.src.endsWith(`${module.id}/MAIN_SKY_V3.png`), `${module.id}: MAIN must use the sky-only alpha cut`);
    }
  }
});

test('M01 and M02 keep actors on the foreground lane and away from portico thresholds', () => {
  const m01 = stage.modules.find((module) => module.id === 'M01');
  const m02 = stage.modules.find((module) => module.id === 'M02');
  assert.deepEqual(m01?.playfield_y, [660, 705]);
  assert.deepEqual(m02?.playfield_y, [600, 705]);
  for (const module of [m01, m02]) {
    assert.ok(module);
    for (const wave of module.waves) {
      for (const [, feetY] of wave.spawns) {
        assert.ok(feetY >= module.playfield_y[0], `${module.id}: spawn enters the portico depth`);
      }
    }
  }
});

test('background audit distinguishes approved art from rebuild placeholders', () => {
  const approved = stage.modules.filter((module) => module.art_status === 'approved');
  assert.deepEqual(approved.map((module) => module.id), ['M02']);
  assert.equal(approved[0]?.horizon_y, 300);
  for (const module of stage.modules) assert.equal(module.reference_actor_height, 290);
  for (const module of stage.modules.filter((item) => item.id !== 'M02')) {
    assert.equal(module.art_status, 'placeholder_rebuild_required', `${module.id}: status audit`);
  }
});
