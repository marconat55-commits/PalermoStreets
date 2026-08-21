import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { collectExpectedFrames, readPngHeader, validateImportSpec } from '../scripts/character-import-contract.mjs';

test('enemy fixture passes the same non-destructive import gate used by new characters', () => {
  const spec = JSON.parse(fs.readFileSync('character_specs/aiori_ref.check.json', 'utf8'));
  const result = validateImportSpec(spec, process.cwd());
  assert.deepEqual(result.errors, []);
  assert.equal(result.frames.size, 40);
});

test('frame collection deduplicates folders reused by attack slots', () => {
  const profile = JSON.parse(fs.readFileSync('public/data/characters/aiori_ref.json', 'utf8'));
  const frames = collectExpectedFrames(profile, path.resolve('public/assets/characters/aiori_ref_anim'));
  assert.equal(frames.size, 40);
});

test('PNG header gate reads the canonical canvas and alpha channel', () => {
  const header = readPngHeader('public/assets/characters/aiori_ref_anim/idle/01.png');
  assert.deepEqual(header, { width: 640, height: 420, colorType: 6 });
});
