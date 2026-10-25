import assert from 'node:assert/strict';
import test from 'node:test';
import { selectWaveCharacter, waveCharacterIds } from '../src/game/stage/waveRoster.ts';
import type { WaveData } from '../src/game/types.ts';

test('una variante occasionale lascia il roster e le coordinate originali della wave', () => {
  const wave: WaveData = {
    spawns: [[800, 650], [940, 680]],
    characters: ['talebano', 'a_puaicca'],
    random_character: { id: 'u_tignusu', chance: 0.18 },
  };
  assert.deepEqual(waveCharacterIds(wave, 'talebano'), ['talebano', 'a_puaicca', 'u_tignusu']);
  assert.equal(selectWaveCharacter(wave, 0, 'talebano', () => 0.17), 'u_tignusu');
  assert.equal(selectWaveCharacter(wave, 1, 'talebano', () => 0.18), 'a_puaicca');
  assert.deepEqual(wave.spawns, [[800, 650], [940, 680]]);
});
