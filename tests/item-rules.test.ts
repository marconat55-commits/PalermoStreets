import assert from 'node:assert/strict';
import test from 'node:test';
import { isPickupKind, itemWithinRange, resolveItemInteraction } from '../src/game/objects/itemRules.ts';
import { Texture } from 'pixi.js';
import { WorldObject } from '../src/game/objects/WorldObject.ts';

test('J raccoglie un oggetto vicino quando le mani sono libere', () => {
  assert.equal(resolveItemInteraction(null, true), 'pickup');
  assert.equal(resolveItemInteraction(null, false), null);
});

test('un oggetto impugnato ha priorità su un nuovo pickup', () => {
  assert.equal(resolveItemInteraction('melee', true), 'melee');
  assert.equal(resolveItemInteraction('throwable', true), 'throw');
});

test('armi e lanciabili sono raccoglibili, cibo e contenitori no', () => {
  assert.equal(isPickupKind('melee'), true);
  assert.equal(isPickupKind('throwable'), true);
  assert.equal(isPickupKind('food'), false);
  assert.equal(isPickupKind('breakable'), false);
});

test('la distanza di interazione rispetta separatamente asse e profondità', () => {
  assert.equal(itemWithinRange({ x: 100, y: 600 }, { x: 170, y: 635 }, 78, 42), true);
  assert.equal(itemWithinRange({ x: 100, y: 600 }, { x: 181, y: 635 }, 78, 42), false);
  assert.equal(itemWithinRange({ x: 100, y: 600 }, { x: 170, y: 645 }, 78, 42), false);
});

test('il mattone passa da raccolto a lanciato e segue una parabola', () => {
  const brick = new WorldObject({
    id: 'brick', display_name: 'Mattone', kind: 'throwable', asset: 'brick.png',
    gameplay_status: 'prototype', throw_speed: 650,
  }, Texture.EMPTY, { x: 100, y: 680 });
  brick.pickup();
  assert.equal(brick.state, 'held');
  brick.throwFrom({ x: 100, y: 680 }, 1);
  assert.equal(brick.state, 'thrown');
  const startX = brick.position.x;
  brick.update(0.1);
  assert.ok(brick.position.x > startX);
  assert.ok(brick.elevation > 0);
});

test('il tubo impugnato compie un arco visibile durante il colpo', () => {
  const pipe = new WorldObject({
    id: 'metal_pipe', display_name: 'Tubo', kind: 'melee', asset: 'pipe.png',
    gameplay_status: 'prototype', held_angle: -0.72,
  }, Texture.EMPTY, { x: 100, y: 680 });
  pipe.pickup();
  pipe.holdAt({ x: 100, y: 680 }, 1, 0);
  const restingRotation = pipe.sprite.rotation;
  pipe.holdAt({ x: 100, y: 680 }, 1, 0.5);
  assert.ok(Math.abs(pipe.sprite.rotation - restingRotation) > 1);
});

test('un contenitore distruttibile rispetta la durabilità e dichiara il drop', () => {
  const bin = new WorldObject({
    id: 'trash_bin', display_name: 'Bidone', kind: 'breakable', asset: 'bin.png',
    gameplay_status: 'prototype', durability: 2, drop_item: 'arancina',
  }, Texture.EMPTY, { x: 100, y: 680 });
  assert.equal(bin.hitBreakable(), false);
  assert.equal(bin.state, 'ground');
  assert.equal(bin.hitBreakable(), true);
  assert.equal(bin.state, 'spent');
  assert.equal(bin.definition.drop_item, 'arancina');
});
