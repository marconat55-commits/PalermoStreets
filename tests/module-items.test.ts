import assert from 'node:assert/strict';
import test from 'node:test';
import { collectModuleItemAssets, collectModuleItems, collectModulePrimaryItemAssets, selectDropItem } from '../src/game/stage/moduleItems.ts';
import type { ModuleData, StageItemDefinition } from '../src/game/types.ts';

const definition = (id: string, drop_item?: string): StageItemDefinition => ({
  id, display_name: id, kind: 'breakable', asset: `${id}.png`, source_master: `${id}.png`,
  gameplay_status: 'prototype', drop_item,
});

test('module loading includes only placed items and their drops', () => {
  const module = { id: 'M01', background: 'm01.png', waves: [], items: [{ item: 'bag', position: [10, 20] }] } as ModuleData;
  const items = collectModuleItems(module, [definition('bag', 'bat'), definition('bat'), definition('unused')]);
  assert.deepEqual(items.map((item) => item.id), ['bag', 'bat']);
});

test('module preload includes every visual state and deduplicates shared assets', () => {
  const module = { id: 'M01', background: 'm01.png', waves: [], items: [{ item: 'bin', position: [10, 20] }] } as ModuleData;
  const bin = {
    ...definition('bin', 'brick'),
    damaged_asset: 'bin-damaged.png',
    broken_asset: 'shared-debris.png',
    debris_asset: 'shared-debris.png',
  };
  const brick = { ...definition('brick'), asset: 'brick.png' };
  assert.deepEqual(collectModuleItemAssets(module, [bin, brick]), [
    'bin.png',
    'bin-damaged.png',
    'shared-debris.png',
    'brick.png',
  ]);
});

test('initial module preload includes only immediately visible item assets', () => {
  const module = { id: 'M01', background: 'm01.png', waves: [], items: [{ item: 'bin', position: [10, 20] }] } as ModuleData;
  const bin = {
    ...definition('bin', 'brick'),
    damaged_asset: 'bin-damaged.png',
    broken_asset: 'bin-broken.png',
  };
  assert.deepEqual(collectModulePrimaryItemAssets(module, [bin, definition('brick')]), [
    'bin.png',
    'brick.png',
  ]);
});

test('random breakable pools preload every candidate and select within bounds', () => {
  const bag = { ...definition('bag'), drop_items: ['brick', 'food', 'cake'] };
  const module = { id: 'M01', background: 'm01.png', waves: [], items: [{ item: 'bag', position: [10, 20] }] } as ModuleData;
  const items = collectModuleItems(module, [bag, definition('brick'), definition('food'), definition('cake')]);
  assert.deepEqual(items.map((item) => item.id), ['bag', 'brick', 'food', 'cake']);
  assert.equal(selectDropItem(bag, () => 0), 'brick');
  assert.equal(selectDropItem(bag, () => 0.5), 'food');
  assert.equal(selectDropItem(bag, () => 0.999), 'cake');
});
