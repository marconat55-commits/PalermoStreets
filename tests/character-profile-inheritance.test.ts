import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import type { CharacterProfile } from '../src/game/types.ts';
import { mergeCharacterProfile, type CharacterProfileSource } from '../src/game/data/characterProfiles.ts';

const read = <T>(path: string): T => JSON.parse(fs.readFileSync(path, 'utf8')) as T;

test('Merco eredita il core di Marco senza duplicare il pack grafico', () => {
  const marco = read<CharacterProfile>('public/data/characters/marco.json');
  const mercoSource = read<CharacterProfileSource>('public/data/characters/merco.json');
  const merco = mergeCharacterProfile(marco, mercoSource);
  assert.equal(merco.id, 'merco');
  assert.equal(merco.display_name, 'MERCO');
  assert.equal(merco.assets.animation_root, marco.assets.animation_root);
  assert.deepEqual(merco.animations, marco.animations);
  assert.equal(merco.gameplay.player?.move_speed, 310);
  assert.equal(merco.selection?.prototype, true);
  assert.equal(mercoSource.animations, undefined);
});
