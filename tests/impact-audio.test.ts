import assert from 'node:assert/strict';
import test from 'node:test';
import { synthesizeImpact } from '../src/game/audio/ImpactAudio.ts';

test('i tre colpi arcade producono campioni brevi, udibili e non saturati', () => {
  const expected = { light: 0.17, heavy: 0.27, throw: 0.37 } as const;
  for (const [kind, duration] of Object.entries(expected)) {
    const samples = synthesizeImpact(kind as keyof typeof expected, 0);
    assert.equal(samples.length, Math.ceil(duration * 44_100));
    assert.ok(samples.every(Number.isFinite));
    const peak = samples.reduce((maximum, sample) => Math.max(maximum, Math.abs(sample)), 0);
    assert.ok(peak > 0.5 && peak < 0.9, `${kind}: volume inatteso ${peak}`);
    assert.ok(Math.abs(samples.at(-1) ?? 0) < 0.02, `${kind}: finale non smorzato`);
  }
  assert.notDeepEqual(synthesizeImpact('light', 0), synthesizeImpact('light', 1));
});
