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

test('San Lorenzo espone due moduli giocabili; il cortile ha tre nemici e il cielo separato', () => {
  assert.deepEqual(stage.modules.map(({ id }) => id), ['SL01', 'SL02']);
  for (const module of stage.modules) {
    assert.deepEqual(module.camera_bounds, [0, module.world_width - 1280]);
    assert.equal(module.waves.length, 1);
    assert.equal(module.waves[0]!.spawns.length, module.waves[0]!.characters.length);
    for (const layer of module.background_layers) {
      assert.deepEqual([layer.width, layer.height], [module.world_width, 720]);
      const png = fs.readFileSync(path.join(root, 'public', layer.src));
      if (layer.plane === 'main') {
        assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [module.world_width, 720]);
        const rgba = png[25] === 6;
        const indexedWithTransparency = png[25] === 3 && png.includes(Buffer.from('tRNS'));
        assert.ok(rgba || indexedWithTransparency, 'foreground must have transparency');
      }
    }
  }
  const courtyard = stage.modules[1]!;
  assert.equal(courtyard.world_width, 5319);
  assert.deepEqual(courtyard.waves[0]!.characters, ['talebano', 'a_puaicca', 'u_tignusu']);
  assert.equal(courtyard.waves[0]!.spawns.length, 3);
  assert.equal(courtyard.background_layers[0]!.src, stage.modules[0]!.background_layers[0]!.src);
  const runtime = JSON.parse(fs.readFileSync(path.join(root, 'public/data/runtime.json'), 'utf8')) as {
    stages: Array<{ id: string }>;
  };
  assert.ok(runtime.stages.some(({ id }) => id === 'stage2_san_lorenzo'));
});
