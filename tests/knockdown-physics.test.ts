import assert from 'node:assert/strict';
import test from 'node:test';
import { integrateHorizontalLaunch, integrateLaunch } from '../src/game/combat/knockdownPhysics.ts';
import { COMBO_FINISHER, KICK_RIGHT, SUPER, THROW } from '../src/game/combat/attacks.ts';

test('un lancio arcade descrive una parabola e torna esattamente a terra', () => {
  let elevation = 1;
  let velocity = 420;
  let apex = elevation;
  let landed = false;
  for (let frame = 0; frame < 180 && !landed; frame += 1) {
    const next = integrateLaunch(elevation, velocity, 1 / 60);
    elevation = next.elevation;
    velocity = next.verticalVelocity;
    landed = next.landed;
    apex = Math.max(apex, elevation);
  }
  assert.ok(apex > 45, `apice troppo basso: ${apex}`);
  assert.equal(landed, true);
  assert.equal(elevation, 0);
  assert.equal(velocity, 0);
});

test('le mosse finali hanno lanci crescenti e controllati', () => {
  assert.ok((COMBO_FINISHER.launchVelocity ?? 0) > 300);
  assert.ok((KICK_RIGHT.launchVelocity ?? 0) > (COMBO_FINISHER.launchVelocity ?? 0));
  assert.ok((THROW.launchVelocity ?? 0) > (KICK_RIGHT.launchVelocity ?? 0));
  assert.ok((SUPER.launchVelocity ?? 0) > (THROW.launchVelocity ?? 0));
  assert.ok((SUPER.launchVelocity ?? 0) <= 540);
});

test('il knockback arcade percorre una distanza leggibile prima dell’atterraggio', () => {
  let position = 0;
  let velocity = 560;
  for (let frame = 0; frame < 34; frame += 1) {
    const next = integrateHorizontalLaunch(position, velocity, 1 / 60, true);
    position = next.position;
    velocity = next.velocity;
  }
  assert.ok(position >= 230, `lancio troppo corto: ${position}`);
  assert.ok(position <= 300, `lancio incontrollato: ${position}`);
});
