import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveStartModuleIndex } from '../src/game/stage/debugStart.ts';
import type { ModuleData } from '../src/game/types.ts';

const modules = ['M01', 'M02', 'M03', 'M04'].map((id) => ({ id })) as ModuleData[];

test('stage module shortcut accepts canonical ids case-insensitively', () => {
  assert.equal(resolveStartModuleIndex('?module=M03', modules), 2);
  assert.equal(resolveStartModuleIndex('?module=m04', modules), 3);
});

test('stage module shortcut accepts one-based module numbers', () => {
  assert.equal(resolveStartModuleIndex('?module=1', modules), 0);
  assert.equal(resolveStartModuleIndex('?module=4', modules), 3);
});

test('missing or invalid shortcuts preserve the normal campaign start', () => {
  assert.equal(resolveStartModuleIndex('', modules), 0);
  assert.equal(resolveStartModuleIndex('?module=M99', modules), 0);
  assert.equal(resolveStartModuleIndex('?module=0', modules), 0);
});
