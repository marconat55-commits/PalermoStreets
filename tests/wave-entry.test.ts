import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveEncounterBounds,
  resolveWaveEntry,
  WAVE_ENTRY_INSET,
  WAVE_ENTRY_SPEED,
} from '../src/game/stage/waveEntry.ts';

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
  assert.ok(entries[1]!.targetX >= 900 + WAVE_ENTRY_INSET);
});

test('un incontro confina il giocatore nella camera e usa un ingresso rapido', () => {
  assert.deepEqual(resolveEncounterBounds(900, 1280, 5120), { left: 948, right: 2132 });
  assert.deepEqual(resolveEncounterBounds(0, 1280, 1280), { left: 48, right: 1232 });
  assert.ok(WAVE_ENTRY_SPEED >= 320);
});
