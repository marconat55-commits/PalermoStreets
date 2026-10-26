import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const stage = JSON.parse(fs.readFileSync(path.join(root, 'public/data/stage2_san_lorenzo.json'), 'utf8')) as {
  modules: Array<{
    id: string;
    world_width: number;
    camera_bounds: [number, number];
    background_layers: Array<{ src: string; plane: 'far' | 'main'; width: number; height: number }>;
    waves: Array<{ spawns: number[][]; characters: string[] }>;
  }>;
};

test('San Lorenzo usa le due tavole definitive e una sola ondata', () => {
  assert.equal(stage.modules.length, 1);
  const module = stage.modules[0]!;
  assert.equal(module.id, 'SL01');
  assert.equal(module.world_width, 4937);
  assert.deepEqual(module.camera_bounds, [0, 3657]);
  assert.equal(module.waves.length, 1);
  assert.equal(module.waves[0]!.spawns.length, module.waves[0]!.characters.length);
  for (const layer of module.background_layers) {
    assert.deepEqual([layer.width, layer.height], [4937, 720]);
    const png = fs.readFileSync(path.join(root, 'public', layer.src));
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [4937, 720]);
    if (layer.plane === 'main') {
      const rgba = png[25] === 6;
      const indexedWithTransparency = png[25] === 3 && png.includes(Buffer.from('tRNS'));
      assert.ok(rgba || indexedWithTransparency, 'foreground must have transparency');
    }
  }
  const runtime = JSON.parse(fs.readFileSync(path.join(root, 'public/data/runtime.json'), 'utf8')) as {
    stages: Array<{ id: string }>;
  };
  assert.ok(runtime.stages.some(({ id }) => id === 'stage2_san_lorenzo'));
});
