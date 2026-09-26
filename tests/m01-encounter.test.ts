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
      boss?: boolean;
    }>;
  }>;
};

test('M01 distribuisce nove nemici in quattro ondate progressive', () => {
  const m01 = stage.modules.find((module) => module.id === 'M01');
  assert.ok(m01);
  assert.deepEqual(stage.modules.map((module) => module.id), ['M01', 'M02']);
  assert.deepEqual(m01.waves.map((wave) => wave.character), ['talebano', 'a_puaicca', 'talebano', 'a_puaicca']);
  assert.deepEqual(m01.waves.map((wave) => wave.spawns.length), [1, 2, 3, 3]);
  assert.equal(m01.waves.reduce((count, wave) => count + wave.spawns.length, 0), 9);
  assert.ok(m01.waves.every((wave, index) => wave.trigger_x < m01.exit_x && (index === 0 || wave.trigger_x > m01.waves[index - 1]!.trigger_x)));
  assert.ok(m01.waves.every((wave) => wave.health <= 64 && wave.aggression <= 0.84 && !wave.boss));
});

test('M01 raggruppa sacchi e bidoni e rilascia soltanto cibo', () => {
  const m01 = stage.modules.find((module) => module.id === 'M01');
  assert.ok(m01);
  assert.deepEqual(m01.items.map((item) => item.item), ['trash_bag', 'trash_bin', 'trash_bin', 'trash_bag', 'trash_bin']);
  const groups = Map.groupBy(m01.items, (item) => item.group);
  assert.equal(groups.get('m01_market')?.length, 2);
  assert.equal(groups.get('m01_courtyard')?.length, 3);
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
