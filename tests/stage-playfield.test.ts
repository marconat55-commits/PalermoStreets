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
  background_layers: Array<{ src: string; plane: string; parallax: number; enabled?: boolean; x?: number; y?: number; width?: number; height?: number; flip_x?: boolean }>;
}

const stage = JSON.parse(fs.readFileSync('public/data/stage1_zen.json', 'utf8')) as { modules: Module[] };

test('i moduli Zen coprono la propria lunghezza e tengono gli spawn nella walk band', () => {
  assert.deepEqual(stage.modules.map((module) => module.id), ['M01', 'M02', 'M03', 'M04', 'M05']);
  const expectedWorldWidths: Record<string, number> = { M01: 2927, M02: 5120, M03: 5869, M04: 3525, M05: 1900 };
  for (const module of stage.modules) {
    const expectedWorldWidth = expectedWorldWidths[module.id];
    assert.ok(expectedWorldWidth, `${module.id}: missing expected world width`);
    const expectedCameraMax = expectedWorldWidth - 1280;
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
    const far = module.background_layers.find((layer) => layer.plane === 'far');
    const main = module.background_layers.find((layer) => layer.plane === 'main');
    if (far) assert.equal(far.parallax, 0.22, `${module.id}: continuous Palermo skyline must use far parallax`);
    if (module.id === 'M01') {
      assert.equal(module.background_layers.length, 1);
      assert.equal(main?.x, 0);
      assert.equal(main?.y, 0);
      assert.equal(main?.width, 2927);
      assert.equal(main?.height, 720);
      assert.equal(main?.src, 'assets/backgrounds/stage1_zen/final_v3/M01/M01_MAIN.png');
      assert.equal(far, undefined);
    } else if (module.id === 'M02') {
      assert.equal(module.background_layers.length, 2);
      assert.equal(module.background_layers.filter((layer) => layer.flip_x).length, 0);
      assert.ok(module.background_layers.every((layer) => layer.height === 720));
      assert.deepEqual(module.background_layers.filter((layer) => layer.plane === 'main').map((layer) => layer.x), [0]);
      assert.equal(main?.width, 5120);
      assert.equal(main?.src, 'assets/backgrounds/stage1_zen/final_v2/M02/M02_MAIN_LONG.png');
      assert.equal(far?.src, 'assets/backgrounds/stage1_zen/final_v1/M02/M02_FAR.png');
    } else if (module.id === 'M03') {
      assert.equal(module.background_layers.length, 2);
      assert.ok(module.background_layers.every((layer) => layer.height === 720));
      const mainArt = module.background_layers.filter((layer) => layer.plane === 'main' && layer.src.includes('/M03_MAIN_'));
      assert.deepEqual(mainArt.map((layer) => layer.x), [0]);
      assert.deepEqual(mainArt.map((layer) => layer.width), [5869]);
      assert.equal(main?.src, 'assets/backgrounds/stage1_zen/final_v4/M03/M03_MAIN_FOREGROUND.png');
      assert.equal(far?.src, 'assets/backgrounds/stage1_zen/final_v4/M03/M03_SKY_FAR.png');
      assert.equal(far?.width, 5869);
    } else if (module.id === 'M04') {
      assert.equal(module.background_layers.length, 1);
      assert.equal(main?.src, 'assets/backgrounds/stage1_zen/final_v1/M04/M04_MAIN.png');
      assert.equal(main?.width, 3525);
      assert.equal(main?.height, 720);
      assert.equal(far, undefined);
    } else if (module.id === 'M05') {
      assert.equal(module.background_layers.length, 2);
      assert.equal(main?.src, 'assets/backgrounds/stage1_zen/final_v1/M05/M05_MAIN_FOREGROUND.png');
      assert.equal(main?.width, 1900);
      assert.equal(main?.height, 720);
      assert.equal(far?.src, 'assets/backgrounds/stage1_zen/final_v4/M03/M03_SKY_FAR.png');
    }
  }
});

test('M01 rebuilt usa l intero piazzale come fascia di combattimento', () => {
  const m01 = stage.modules.find((module) => module.id === 'M01');
  assert.deepEqual(m01?.playfield_y, [585, 705]);
  assert.ok(m01);
  assert.equal(m01.playfield_y[1] - m01.playfield_y[0], 120, 'M01 piazzale must provide useful combat depth');
  assert.deepEqual(m01.walk_top, [[0, 585], [732, 582], [1464, 586], [2196, 588], [2927, 584]]);
  for (const wave of m01.waves) {
    for (const [, feetY] of wave.spawns) {
      assert.ok(feetY >= m01.playfield_y[0], 'spawn outside the authored ground plane');
    }
  }
});

test('M02 è lungo quattro schermate e usa il piano pavimentato approvato', () => {
  const m02 = stage.modules.find((module) => module.id === 'M02');
  assert.ok(m02);
  assert.equal(m02.world_width, 5120);
  assert.deepEqual(m02.camera_bounds, [0, 3840]);
  assert.deepEqual(m02.playfield_y, [650, 705]);
  assert.deepEqual(m02.walk_top, [[0, 614], [2562, 638], [5120, 504]]);
});

test('M03 estende la walkline di dieci pixel verso il fondo', () => {
  const m03 = stage.modules.find((module) => module.id === 'M03');
  assert.ok(m03);
  assert.deepEqual(m03.playfield_y, [640, 705]);
  assert.deepEqual(m03.walk_top, [[0, 585], [1287, 588], [2348, 595], [3602, 592], [4831, 585], [5869, 576]]);
});

test('M04 conduce dal porticato residenziale al vano scala', () => {
  const m04 = stage.modules.find((module) => module.id === 'M04');
  assert.ok(m04);
  assert.equal(m04.world_width, 3525);
  assert.deepEqual(m04.camera_bounds, [0, 2245]);
  assert.deepEqual(m04.playfield_y, [640, 705]);
  assert.deepEqual(m04.walk_top, [[0, 608], [3525, 612]]);
});

test('M05 offre una fascia di movimento profonda intorno al futuro boss', () => {
  const m05 = stage.modules.find((module) => module.id === 'M05');
  assert.ok(m05);
  assert.deepEqual(m05.playfield_y, [510, 675]);
  assert.equal(m05.playfield_y[1] - m05.playfield_y[0], 165);
  assert.deepEqual(m05.camera_bounds, [0, 620]);
});

test('i moduli giocabili usano gli sfondi approvati; gli altri sono archiviati', () => {
  const approved = stage.modules.filter((module) => module.art_status === 'approved');
  assert.deepEqual(approved.map((module) => module.id), ['M01', 'M02', 'M03', 'M04']);
  assert.deepEqual(approved.map((module) => module.horizon_y), [315, 300, 310, 305]);
  for (const module of stage.modules) assert.equal(module.reference_actor_height, 290);
  const archived = JSON.parse(fs.readFileSync('art_source/stages/stage1_zen/stage1_zen_runtime_legacy_M01_M04_2026-09-26.json', 'utf8')) as { modules: Module[] };
  assert.deepEqual(archived.modules.map((module) => module.id), ['M01', 'M02', 'M03', 'M04']);
});

