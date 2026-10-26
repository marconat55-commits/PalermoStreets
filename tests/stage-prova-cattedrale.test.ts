import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const previewPath = path.join(root, 'public/data/stage_prova_cattedrale.json');
const preview = JSON.parse(fs.readFileSync(previewPath, 'utf8')) as {
  editor_only?: boolean;
  modules: Array<{
    id: string;
    background: string;
    world_width: number;
    camera_bounds: [number, number];
    background_layers: Array<{
      src: string;
      parallax: number;
      plane: 'far' | 'main';
      width: number;
      height: number;
    }>;
    waves: unknown[];
  }>;
};

function pngHeader(assetPath: string): { width: number; height: number; colorType: number } {
  const buffer = fs.readFileSync(path.join(root, 'public', assetPath));
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25]!,
  };
}

test('Stage Cattedrale e giocabile con una ondata e conserva la geometria panoramica', () => {
  assert.notEqual(preview.editor_only, true);
  assert.equal(preview.modules.length, 1);
  const module = preview.modules[0]!;
  assert.equal(module.id, 'P01');
  assert.equal(module.world_width, 3338);
  assert.deepEqual(module.camera_bounds, [0, 2058]);
  assert.deepEqual(module.background_layers.map(({ width, height }) => [width, height]), [
    [3338, 720],
    [3338, 720],
  ]);
  assert.deepEqual(module.background_layers.map(({ plane, parallax }) => [plane, parallax]), [
    ['far', 0.18],
    ['main', 1],
  ]);
  assert.equal(module.waves.length, 1);
  for (const layer of module.background_layers) {
    assert.ok(fs.existsSync(path.join(root, 'public', layer.src)), `missing ${layer.src}`);
    assert.deepEqual(pngHeader(layer.src), {
      width: 3338,
      height: 720,
      colorType: layer.plane === 'main' ? 6 : 2,
    });
  }
  assert.equal(module.background, module.background_layers.find((layer) => layer.plane === 'main')?.src);

  const runtime = JSON.parse(fs.readFileSync(path.join(root, 'public/data/runtime.json'), 'utf8')) as {
    stages: Array<{ id: string }>;
  };
  assert.equal(runtime.stages.some((stage) => stage.id === 'stage_prova_cattedrale'), true);
});
