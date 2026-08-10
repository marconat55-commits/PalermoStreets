import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

interface Module {
  id: string;
  playfield_y: [number, number];
  entry: [number, number];
  waves: Array<{ spawns: Array<[number, number]> }>;
  world_width: number;
  background_layers: Array<{ plane: string; reveal_polygons?: Array<Array<[number, number]>> }>;
}

const stage = JSON.parse(fs.readFileSync('public/data/stage1_zen.json', 'utf8')) as { modules: Module[] };

test('each Zen module owns an authored walk band and every feet spawn stays inside it', () => {
  assert.ok(new Set(stage.modules.map((module) => module.playfield_y.join(':'))).size >= 3);
  for (const module of stage.modules) {
    const [top, bottom] = module.playfield_y;
    assert.ok(top >= 520 && top < bottom && bottom <= 700, `${module.id}: invalid WALK band`);
    assert.ok(module.entry[1] >= top && module.entry[1] <= bottom, `${module.id}: entry outside WALK band`);
    for (const wave of module.waves) {
      for (const [, feetY] of wave.spawns) {
        assert.ok(feetY >= top && feetY <= bottom, `${module.id}: enemy spawn outside WALK band`);
      }
    }
    const far = module.background_layers.find((layer) => layer.plane === 'far');
    assert.ok(far?.reveal_polygons?.length, `${module.id}: far layer has no authored opening`);
    for (const polygon of far?.reveal_polygons ?? []) {
      assert.ok(polygon.length >= 4, `${module.id}: reveal polygon is incomplete`);
      for (const [x, y] of polygon) {
        assert.ok(x >= 0 && x <= module.world_width, `${module.id}: reveal X outside world`);
        assert.ok(y >= 0 && y <= 240, `${module.id}: reveal extends below the skyline`);
      }
    }
  }
});
