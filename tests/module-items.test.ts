import assert from 'node:assert/strict';
import test from 'node:test';
import { collectModuleItems } from '../src/game/stage/moduleItems.ts';
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
