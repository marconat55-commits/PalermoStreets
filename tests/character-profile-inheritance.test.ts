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
  assert.equal(merco.animations.jump.frames, 6);
  assert.equal(merco.animations.jump_forward.frames, 6);
  assert.equal(merco.animations.land.frames, 2);
  assert.equal(merco.animations.air_attack.frames, 5);
  assert.equal(merco.animations.air_attack.contact_frame, 3);
  assert.equal(merco.animations.grab.frames, 1);
  assert.equal(merco.animations.grab_strike.frames, 3);
  assert.equal(merco.animations.throw.frames, 3);
  assert.equal(merco.gameplay.player?.move_speed, 310);
  assert.equal(merco.selection?.prototype, true);
});

test('Mark Nat ha un pacchetto separato e una caduta continua con la rialzata', () => {
  const marco = read<CharacterProfile>('public/data/characters/marco.json');
  const merco = mergeCharacterProfile(marco, read<CharacterProfileSource>('public/data/characters/merco.json'));
  const markNat = mergeCharacterProfile(merco, read<CharacterProfileSource>('public/data/characters/mark_nat.json'));
  const index = read<{ characters: string[] }>('public/data/characters/index.json');
  assert.ok(index.characters.includes('merco'));
  assert.ok(index.characters.includes('mark_nat'));
  assert.equal(merco.assets.animation_root, 'assets/characters/merco_anim');
  assert.equal(markNat.assets.animation_root, 'assets/characters/mark_nat_anim');
  assert.equal(markNat.display_name, 'MARK NAT');
  assert.equal(markNat.animations.punch_left.contact_frame, 3);
  assert.equal(markNat.animations.punch_right.contact_frame, 2);
  assert.equal(markNat.animations.idle_variant_2.frames, 2);
  assert.deepEqual(
    fs.readFileSync('public/assets/characters/mark_nat_anim/idle_variant_2/01.png'),
    fs.readFileSync('public/assets/characters/mark_nat_anim/idle/01.png'),
  );
  assert.notDeepEqual(
    fs.readFileSync('public/assets/characters/mark_nat_anim/idle_variant_2/02.png'),
    fs.readFileSync('public/assets/characters/mark_nat_anim/idle/01.png'),
  );
  assert.deepEqual(markNat.animations.walk, merco.animations.walk);
  for (let frame = 1; frame <= 8; frame += 1) {
    const filename = `${String(frame).padStart(2, '0')}.png`;
    assert.deepEqual(
      fs.readFileSync(`public/assets/characters/mark_nat_anim/walk/${filename}`),
      fs.readFileSync(`public/assets/characters/merco_anim/walk/${filename}`),
    );
  }
  const fall = `public/${markNat.assets.animation_root}/fall/04.png`;
  const getup = `public/${markNat.assets.animation_root}/getup/01.png`;
  assert.deepEqual(fs.readFileSync(fall), fs.readFileSync(getup));
});
