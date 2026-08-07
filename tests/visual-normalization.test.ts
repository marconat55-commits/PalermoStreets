import assert from 'node:assert/strict';
import test from 'node:test';
import { finalGetupScale } from '../src/game/animation/visualNormalization.ts';

test('allinea l ultimo frame getup alla larghezza idle', () => {
  assert.ok(Math.abs(finalGetupScale('piero_u_pizzetto', [154, 153, 154, 154], 165) - 0.9318) < 0.001);
  assert.ok(Math.abs(finalGetupScale('talebano', [208, 195, 200, 209], 189) - 1.074) < 0.001);
});

test('limita correzioni estreme e lascia Barbetta invariato', () => {
  assert.equal(finalGetupScale('marco', [181, 181], 300), 0.88);
  assert.equal(finalGetupScale('barbetta', [108], 68), 1);
});
