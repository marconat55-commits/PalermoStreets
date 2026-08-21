import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

test('runtime registry resolves every stage and optional item catalog', () => {
  const runtime = read<{ default_stage: string; stages: Array<{ id: string; data: string; items?: string }> }>('public/data/runtime.json');
  assert.ok(runtime.stages.some((stage) => stage.id === runtime.default_stage));
  for (const stage of runtime.stages) {
    assert.ok(fs.existsSync(`public/${stage.data}`), `${stage.id}: stage data missing`);
    if (stage.items) assert.ok(fs.existsSync(`public/${stage.items}`), `${stage.id}: items missing`);
  }
});

test('every character owns a compact local metadata manifest', () => {
  const index = read<{ characters: string[] }>('public/data/characters/index.json');
  const global = read<Record<string, unknown>>('public/data/generated/frame_meta.json');
  let localCount = 0;
  for (const id of index.characters) {
    const profile = read<{ assets: { animation_root: string; frame_meta: string } }>(`public/data/characters/${id}.json`);
    assert.ok(profile.assets.frame_meta);
    const local = read<Record<string, unknown>>(`public/${profile.assets.frame_meta}`);
    assert.ok(Object.keys(local).every((key) => key.startsWith(`/${profile.assets.animation_root}/`)));
    localCount += Object.keys(local).length;
  }
  assert.equal(localCount, Object.keys(global).length);
});
