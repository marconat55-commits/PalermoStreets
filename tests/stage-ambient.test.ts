import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { birdPoint, wrapRange } from '../src/game/stage/ambientMotion.ts';

interface AmbientSpec {
  id: string;
  kind: string;
  bounds: [number, number, number, number];
  count: number;
  speed: number;
  parallax: number;
  interactive: false;
}

const stage = JSON.parse(fs.readFileSync('public/data/stage1_zen.json', 'utf8')) as {
  modules: Array<{ id: string; world_width: number; ambient?: AmbientSpec[] }>;
};

test('every Stage 1 module has a bounded non-interactive sky flock', () => {
  const ids = new Set<string>();
  for (const module of stage.modules) {
    assert.ok(module.ambient?.length, `${module.id}: ambient layer missing`);
    for (const actor of module.ambient ?? []) {
      assert.equal(actor.kind, 'bird_flock');
      assert.equal(actor.interactive, false);
      assert.ok(!ids.has(actor.id), `duplicate ambient id: ${actor.id}`);
      ids.add(actor.id);
      const [x, y, width, height] = actor.bounds;
      assert.ok(x >= 0 && x + width <= module.world_width, `${actor.id}: horizontal bounds`);
      assert.ok(y >= 35 && y + height <= 300, `${actor.id}: flock must stay in the sky`);
      assert.ok(actor.count >= 3 && actor.count <= 10, `${actor.id}: restrained flock density`);
      assert.ok(actor.speed >= 20 && actor.speed <= 55, `${actor.id}: readable background speed`);
      assert.ok(actor.parallax >= 0.2 && actor.parallax <= 0.5, `${actor.id}: background parallax`);
    }
  }
});

test('bird motion loops deterministically inside its authored rectangle', () => {
  const rect: [number, number, number, number] = [100, 60, 500, 120];
  assert.equal(wrapRange(-10, 500), 490);
  for (const elapsed of [0, 1, 15, 120]) {
    const first = birdPoint(elapsed, 42, rect, 30);
    const second = birdPoint(elapsed, 42, rect, 30);
    assert.deepEqual(first, second);
    assert.ok(first.x >= 100 && first.x < 600);
    assert.ok(first.y >= 60 && first.y <= 180);
    assert.ok(first.flap >= -1 && first.flap <= 1);
  }
});
