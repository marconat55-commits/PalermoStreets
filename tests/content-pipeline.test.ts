import assert from 'node:assert/strict';
import test from 'node:test';
import { renderBuildOutputs, validateRepository } from '../scripts/content/lib.mjs';

test('production content catalog and manifests satisfy the v1 contract', () => {
  const result = validateRepository(process.cwd());
  assert.deepEqual(result.errors, []);
  assert.equal(result.catalog.pipeline_version, '1.0.0');
  assert.equal(result.catalog.runtime.engine, 'pixijs');
  assert.deepEqual(result.catalog.runtime.logical_viewport, [1280, 720]);
  assert.deepEqual(result.catalog.runtime.character_canvas, [640, 420]);
});

test('M02 greybox uses exact exportable stage geometry', () => {
  const result = validateRepository(process.cwd());
  const module = result.manifests.get('stage.stage1_zen.M02');
  assert.ok(module);
  assert.deepEqual(module.geometry.master_size, [3840, 1080]);
  assert.deepEqual(module.geometry.runtime_size, [2560, 720]);
  assert.deepEqual(module.geometry.viewport, [1280, 720]);
  assert.equal(module.geometry.master_to_runtime_scale, 2 / 3);
  assert.deepEqual(module.geometry.camera_bounds_runtime, [0, 1280]);
  assert.equal(module.walk_band.top_runtime_y, 515);
  assert.equal(module.walk_band.bottom_runtime_y, 705);
  for (const actor of module.reference_actors) {
    assert.ok(actor.feet_y_runtime >= module.walk_band.top_runtime_y);
    assert.ok(actor.feet_y_runtime <= module.walk_band.bottom_runtime_y);
  }
});

test('M02 build is deterministic and includes three camera proofs', () => {
  const result = validateRepository(process.cwd());
  const first = renderBuildOutputs(process.cwd(), result);
  const second = renderBuildOutputs(process.cwd(), result);
  assert.deepEqual([...first], [...second]);
  for (const cameraX of ['0000', '0640', '1280']) {
    assert.ok(first.has(`production-preview/M02/M02_CAMERA_X${cameraX}.svg`));
  }
  assert.match(first.get('production-preview/M02/M02_GREYBOX_MASTER.svg') ?? '', /WALK TOP 515px runtime/);
  assert.match(first.get('production-preview/M02/M02_GREYBOX_MASTER.svg') ?? '', /marco_start 290px/);
});
