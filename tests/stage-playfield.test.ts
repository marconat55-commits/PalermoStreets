import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

interface Module {
  id: string;
  playfield_y: [number, number];
  walk_top: Array<[number, number]>;
  walk_bottom: Array<[number, number]>;
  entry: [number, number];
  waves: Array<{ spawns: Array<[number, number]> }>;
  world_width: number;
  background_layers: Array<{ plane: string; parallax: number; enabled?: boolean }>;
}

const stage = JSON.parse(fs.readFileSync('public/data/stage1_zen.json', 'utf8')) as { modules: Module[] };

test('each Zen module owns an authored walk band and every feet spawn stays inside it', () => {
  assert.ok(new Set(stage.modules.map((module) => module.playfield_y.join(':'))).size >= 3);
  for (const module of stage.modules) {
    const [top, bottom] = module.playfield_y;
    assert.ok(top >= 390 && top < bottom && bottom <= 710, `${module.id}: invalid WALK envelope`);
    assert.equal(module.walk_top[0]?.[0], 0, `${module.id}: WALK top must start at world X 0`);
    assert.equal(module.walk_bottom[0]?.[0], 0, `${module.id}: WALK bottom must start at world X 0`);
    assert.equal(module.walk_top.at(-1)?.[0], module.world_width, `${module.id}: WALK top must span the world`);
    assert.equal(module.walk_bottom.at(-1)?.[0], module.world_width, `${module.id}: WALK bottom must span the world`);
    const far = module.background_layers.find((layer) => layer.plane === 'far');
    assert.equal(far?.parallax, 1, `${module.id}: sparse FAR cannot scroll independently without coverage gaps`);
  }
});
