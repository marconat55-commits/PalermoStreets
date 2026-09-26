import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const stage = JSON.parse(fs.readFileSync('public/data/stage1_zen.json', 'utf8')) as {
  modules: Array<{
    id: string;
    exit_x: number;
    items: Array<{ item: string; group?: string }>;
    waves: Array<{ trigger_x: number; character: string; spawns: Array<[number, number]>; boss?: boolean }>;
  }>;
};

test('M02 distribuisce quattordici nemici lungo sei incontri', () => {
  const m02 = stage.modules.find((module) => module.id === 'M02');
  assert.ok(m02);
  assert.equal(m02.waves.length, 6);
  assert.equal(m02.waves.reduce((total, wave) => total + wave.spawns.length, 0), 14);
  assert.deepEqual(m02.waves.map((wave) => wave.character),
    ['a_puaicca', 'talebano', 'a_puaicca', 'talebano', 'a_puaicca', 'talebano']);
  assert.ok(m02.waves.every((wave, index) => wave.trigger_x < m02.exit_x
    && (index === 0 || wave.trigger_x > m02.waves[index - 1]!.trigger_x)
    && !wave.boss));
});

test('M02 separa due gruppi distruttibili lungo il percorso', () => {
  const m02 = stage.modules.find((module) => module.id === 'M02');
  assert.ok(m02);
  const groups = Map.groupBy(m02.items, (item) => item.group);
  assert.equal(groups.get('m02_portico')?.length, 2);
  assert.equal(groups.get('m02_garage')?.length, 3);
});
