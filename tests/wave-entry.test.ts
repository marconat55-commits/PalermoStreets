import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveWaveEntry } from '../src/game/stage/waveEntry.ts';

test('una singola entrata nasce oltre il lato destro della camera', () => {
  const entry = resolveWaveEntry(0, 640, 1280);
  assert.equal(entry.side, 'right');
  assert.ok(entry.spawnX > 1920);
  assert.ok(entry.targetX < 1920 && entry.targetX > 640);
});

test('le ondate numerose alternano i lati e sfalsano gli ingressi', () => {
  const entries = Array.from({ length: 4 }, (_, index) => resolveWaveEntry(index, 900, 1280));
  assert.deepEqual(entries.map((entry) => entry.side), ['right', 'left', 'right', 'left']);
  assert.ok(entries[2]!.spawnX > entries[0]!.spawnX);
  assert.ok(entries[3]!.spawnX < entries[1]!.spawnX);
  assert.equal(new Set(entries.map((entry) => entry.targetX)).size, 4);
});
