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
  assert.ok(result.manifests.has('narrative.campaign'));
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
  assert.equal(module.walk_band.top_runtime_y, 600);
  assert.equal(module.walk_band.bottom_runtime_y, 705);
  assert.equal(module.status, 'integrated');
  assert.equal(module.approval.art_direction_pending, false);
  assert.equal(module.art_candidate.status, 'approved');
  assert.equal(module.art_candidate.runtime_integration, true);
  for (const actor of module.reference_actors) {
    assert.ok(actor.feet_y_runtime >= module.walk_band.top_runtime_y);
    assert.ok(actor.feet_y_runtime <= module.walk_band.bottom_runtime_y);
  }
});

test('M01 greybox locks street scale before any new art is generated', () => {
  const result = validateRepository(process.cwd());
  const module = result.manifests.get('stage.stage1_zen.M01');
  assert.ok(module);
  assert.equal(module.status, 'greybox');
  assert.equal(module.approval.art_direction_pending, true);
  assert.deepEqual(module.geometry.runtime_size, [2560, 720]);
  assert.equal(module.geometry.horizon_runtime_y, 315);
  assert.equal(module.walk_band.top_runtime_y, 635);
  assert.equal(module.walk_band.bottom_runtime_y, 705);
  assert.deepEqual(module.reference_actors.map((actor: { height_runtime: number }) => actor.height_runtime), [290, 290, 305]);
});

test('the shared storyboard is captured without overriding current canon', () => {
  const result = validateRepository(process.cwd());
  const campaign = result.manifests.get('narrative.campaign');
  assert.ok(campaign);
  assert.equal(campaign.campaign.stage_count_candidate, 18);
  assert.equal(campaign.stage1_zen.boss_concept.status, 'legacy_candidate_not_canon');
  assert.deepEqual(campaign.canon_policy.rejected_characters_must_not_return, ['barbetta', 'pizzetto']);
  assert.equal(campaign.initial_roster_concepts.find((entry: { id: string }) => entry.id === 'marco')?.status, 'canon');
});

test('M02 build is deterministic and includes three camera proofs', () => {
  const result = validateRepository(process.cwd());
  const first = renderBuildOutputs(process.cwd(), result);
  const second = renderBuildOutputs(process.cwd(), result);
  assert.deepEqual([...first], [...second]);
  for (const cameraX of ['0000', '0640', '1280']) {
    assert.ok(first.has(`production-preview/M02/M02_CAMERA_X${cameraX}.svg`));
  }
  assert.match(first.get('production-preview/M02/M02_GREYBOX_MASTER.svg') ?? '', /WALK TOP 600px runtime/);
  assert.match(first.get('production-preview/M02/M02_GREYBOX_MASTER.svg') ?? '', /marco_start 290px/);
});

test('every authored module receives deterministic master, WALK and camera proofs', () => {
  const result = validateRepository(process.cwd());
  const outputs = renderBuildOutputs(process.cwd(), result);
  for (const moduleId of ['M01', 'M02']) {
    assert.ok(outputs.has(`production-preview/${moduleId}/${moduleId}_GREYBOX_MASTER.svg`));
    assert.ok(outputs.has(`production-preview/${moduleId}/${moduleId}_WALK_MASK.svg`));
    for (const cameraX of ['0000', '0640', '1280']) {
      assert.ok(outputs.has(`production-preview/${moduleId}/${moduleId}_CAMERA_X${cameraX}.svg`));
    }
  }
});
