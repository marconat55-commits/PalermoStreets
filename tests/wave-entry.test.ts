import assert from 'node:assert/strict';
import test from 'node:test';
import {
  constrainApproachX,
  resolveEncounterBounds,
  resolveWaveEntry,
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
});

test('un incontro confina il giocatore nella camera e usa un ingresso rapido', () => {
  assert.deepEqual(resolveEncounterBounds(900, 1280, 5120), { left: 948, right: 2132 });
  assert.deepEqual(resolveEncounterBounds(0, 1280, 1280), { left: 48, right: 1232 });
  assert.ok(WAVE_ENTRY_SPEED >= 320);
});

test('un nemico non sceglie una destinazione che lo allontana dal giocatore o dall arena', () => {
  const bounds = { left: 948, right: 2132 };
  assert.equal(constrainApproachX(1050, 1500, 980, bounds), 1050);
  assert.equal(constrainApproachX(1050, 1500, 1410, bounds), 1410);
  assert.equal(constrainApproachX(2050, 1500, 2200, bounds), 2050);
  assert.equal(constrainApproachX(2050, 1500, 1590, bounds), 1590);
});
