import assert from 'node:assert/strict';
import test from 'node:test';
import { portraitTransform } from '../src/game/ui/EnemyHudLayer.ts';

test('enemy HUD interpreta i bounds come x y width height e centra il volto', () => {
  const transform = portraitTransform([274, 95, 208, 305], 640, 420);
  assert.ok(transform.scale > 0.4 && transform.scale < 0.5);
  assert.ok(transform.x > -5 && transform.x < 5);
  assert.ok(transform.y > 145 && transform.y < 160);
});
