import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const stage = JSON.parse(fs.readFileSync('public/data/stage1_zen.json', 'utf8')) as {
  modules: Array<{
    id: string;
    exit_x: number;
    items: Array<{ item: string; position: [number, number] }>;
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

test('M01 teaches one-on-one combat before a restrained depth pincer', () => {
  const m01 = stage.modules.find((module) => module.id === 'M01');
  assert.ok(m01);
  assert.equal(m01.waves.length, 2);
  const [tutorial, pincer] = m01.waves;
  assert.equal(tutorial!.character, 'talebano');
  assert.equal(tutorial!.spawns.length, 1);
  assert.equal(pincer!.character, 'a_puaicca');
  assert.equal(pincer!.spawns.length, 2);
  assert.ok(pincer!.trigger_x - tutorial!.trigger_x >= 800);
  assert.ok(Math.abs(pincer!.spawns[0]![1] - pincer!.spawns[1]![1]) >= 80);
  assert.ok(pincer!.health <= 64);
  assert.ok(pincer!.aggression <= 0.82);
  assert.equal(m01.waves.some((wave) => wave.boss === true), false);
});

test('M01 excludes held weapons until dedicated player poses exist', () => {
  const m01 = stage.modules.find((module) => module.id === 'M01');
  assert.ok(m01);
  assert.deepEqual(m01.items.map((item) => item.item), ['trash_bag', 'trash_bin']);
  assert.ok(m01.items[0]!.position[0] < m01.waves[1]!.trigger_x);
  assert.ok(m01.items[1]!.position[0] > m01.waves[1]!.trigger_x && m01.items[1]!.position[0] < m01.exit_x);
});
