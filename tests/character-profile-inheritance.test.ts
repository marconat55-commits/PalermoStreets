import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import type { CharacterProfile } from '../src/game/types.ts';
import { mergeCharacterProfile, type CharacterProfileSource } from '../src/game/data/characterProfiles.ts';

const read = <T>(path: string): T => JSON.parse(fs.readFileSync(path, 'utf8')) as T;

test('Merco eredita il core di Marco e sostituisce soltanto le clip approvate', () => {
  const marco = read<CharacterProfile>('public/data/characters/marco.json');
  const mercoSource = read<CharacterProfileSource>('public/data/characters/merco.json');
  const merco = mergeCharacterProfile(marco, mercoSource);
  assert.equal(merco.id, 'merco');
  assert.equal(merco.display_name, 'MERCO');
  assert.equal(merco.assets.animation_root, 'assets/characters/merco_anim');
  assert.equal(merco.animations.walk.frames, marco.animations.walk.frames);
  assert.equal(merco.animations.jump.frames, 9);
  assert.equal(merco.animations.jump_forward.frames, 8);
  assert.equal(merco.animations.land.frames, 2);
  assert.equal(merco.animations.air_attack.frames, 5);
  assert.equal(merco.animations.air_attack.contact_frame, 3);
  assert.equal(merco.animations.grab.frames, 1);
  assert.equal(merco.animations.grab_strike.frames, 3);
  assert.equal(merco.animations.throw.frames, 3);
  assert.equal(merco.gameplay.player?.move_speed, 310);
  assert.equal(merco.selection?.prototype, true);
});
