import assert from 'node:assert/strict';
import test from 'node:test';
import { approachTargetX } from '../src/game/combat/enemyApproach.ts';

test('il bersaglio di movimento resta sempre tra il nemico e il giocatore', () => {
  assert.equal(approachTargetX(100, 500, 90), 410);
  assert.equal(approachTargetX(900, 500, 90), 590);
});

test('il nemico non arretra quando ha gia raggiunto la distanza di ingaggio', () => {
  assert.equal(approachTargetX(440, 500, 90), 440);
  assert.equal(approachTargetX(560, 500, 90), 560);
});
