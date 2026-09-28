import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const stage = JSON.parse(fs.readFileSync('public/data/stage1_zen.json', 'utf8')) as {
  modules: Array<{
    id: string;
    exit_x: number;
    items: Array<{ item: string; position: [number, number]; group?: string }>;
    waves: Array<{
      trigger_x: number;
      health: number;
      aggression: number;
      spawns: Array<[number, number]>;
      character: string;
      characters?: string[];
      batch_size?: number;
      lock_stage?: boolean;
      boss?: boolean;
    }>;
  }>;
};

test('M01 resta libero e distribuisce una sola ondata di sette nemici a coppie', () => {
  const m01 = stage.modules.find((module) => module.id === 'M01');
  assert.ok(m01);
  assert.deepEqual(stage.modules.map((module) => module.id), ['M01', 'M02', 'M03']);
  assert.equal(m01.waves.length, 1);
  assert.equal(m01.waves[0]!.spawns.length, 7);
  assert.equal(m01.waves[0]!.characters?.length, 7);
  assert.deepEqual(new Set(m01.waves[0]!.characters), new Set(['talebano', 'a_puaicca']));
  assert.equal(m01.waves[0]!.batch_size, 2);
  assert.equal(m01.waves[0]!.lock_stage, false);
  assert.ok(m01.waves.every((wave, index) => wave.trigger_x < m01.exit_x && (index === 0 || wave.trigger_x > m01.waves[index - 1]!.trigger_x)));
  assert.ok(m01.waves.every((wave) => wave.health <= 64 && wave.aggression <= 0.84 && !wave.boss));
});

test('M01 conserva un solo piccolo gruppo di sacchi e bidoni alla fine e rilascia soltanto cibo', () => {
  const m01 = stage.modules.find((module) => module.id === 'M01');
  assert.ok(m01);
  assert.deepEqual(m01.items.map((item) => item.item), ['trash_bag', 'trash_bin']);
  const groups = Map.groupBy(m01.items, (item) => item.group);
  assert.equal(groups.size, 1);
  assert.equal(groups.get('m01_exit')?.length, 2);
  assert.ok(m01.items.every((item) => item.position[0] >= 2200));
  assert.ok(m01.items.every((item) => item.position[0] < m01.exit_x));
  const catalog = JSON.parse(fs.readFileSync('public/data/items/stage1_zen.json', 'utf8')) as {
    items: Array<{ id: string; kind: string; drop_item?: string; drop_items?: string[] }>;
  };
  const byId = new Map(catalog.items.map((item) => [item.id, item]));
  for (const item of m01.items) {
    assert.equal(byId.get(item.item)?.kind, 'breakable');
    const drops = byId.get(item.item)?.drop_items ?? [byId.get(item.item)?.drop_item];
    assert.ok(drops.every((drop) => drop && byId.get(drop)?.kind === 'food'));
  }
});

