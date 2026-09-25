import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

type Clip = {
  unique_frames?: number;
  reference_clip?: string;
  reference_sequence?: number[];
  durations?: number[];
  contact_frame?: number;
  reuse_art_from?: string;
};

for (const id of ['barbaccia', 'pino_u_pizzettu']) {
  test(`${id}: il piano usa master originali e pose MUGEN solo come riferimento`, () => {
    const draft = JSON.parse(fs.readFileSync(`content-src/drafts/characters/${id}.content.json`, 'utf8'));
    const blueprint = JSON.parse(fs.readFileSync(draft.motion_blueprint, 'utf8'));
    const reference = JSON.parse(fs.readFileSync(blueprint.reference_profile, 'utf8'));

    assert.equal(draft.status, 'draft');
    assert.equal(draft.archetype, blueprint.id);
    assert.ok(fs.existsSync(draft.source.identity_lock));
    assert.ok(fs.existsSync(draft.source.front_master));
    if (id === 'barbaccia') {
      assert.equal(draft.source.identity_lock, 'art_source/stage1_zen/barbaccia_hd_master/BARBACCIA_HD_USER_MASTER.png');
    } else {
      assert.match(draft.source.identity_lock, /approved_bundle_2026_09_06/);
    }
    assert.equal(blueprint.reference_use, 'timing_and_pose_order_only');
    assert.equal(blueprint.runtime_art_policy, 'project_owned_original_only');
    assert.deepEqual(blueprint.canvas, [640, 420]);
    assert.equal(blueprint.baseline_y, 400);

    const clips = blueprint.clips as Record<string, Clip>;
    for (const name of ['idle', 'walk', 'attack', 'heavy', 'hit', 'knockdown', 'getup', 'dead']) {
      assert.ok(clips[name], `${id}: ${name} mancante`);
    }
    for (const [name, clip] of Object.entries(clips)) {
      if (clip.reuse_art_from) {
        assert.ok(clips[clip.reuse_art_from], `${id}/${name}: riuso senza clip sorgente`);
        continue;
      }
      assert.ok(clip.unique_frames && clip.unique_frames >= 2, `${id}/${name}: budget non valido`);
      assert.equal(clip.durations?.length, clip.unique_frames, `${id}/${name}: durate non allineate`);
      assert.ok(clip.durations?.every((duration) => duration > 0), `${id}/${name}: durata non positiva`);
      const referenceClip = reference.animations[clip.reference_clip!];
      assert.ok(referenceClip, `${id}/${name}: riferimento mancante`);
      assert.ok(clip.reference_sequence?.every((frame) => frame >= 1 && frame <= referenceClip.frames), `${id}/${name}: indice fuori range`);
      assert.equal(new Set(clip.reference_sequence).size, clip.reference_sequence?.length, `${id}/${name}: pose di riferimento duplicate`);
      if (clip.contact_frame) assert.ok(clip.contact_frame <= clip.unique_frames, `${id}/${name}: contatto fuori clip`);
    }
    assert.equal(clips.knockdown.unique_frames, clips.getup.unique_frames);
  });
}
