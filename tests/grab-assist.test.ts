import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMBO_GRAB_RANGE,
  DIRECT_GRAB_RANGE,
  isForwardHeld,
  selectGrabCandidate,
} from '../src/game/combat/grabAssist.ts';

const enemy = (actorId: number, x: number, y: number, canBeGrabbed = true) => ({
  actorId,
  position: { x, y },
  canBeGrabbed,
});

test('J prioritises a nearby grabbable enemy in front of the player', () => {
  const selected = selectGrabCandidate(
    { x: 300, y: 610 },
    1,
    [enemy(1, 410, 612), enemy(2, 275, 610)],
    DIRECT_GRAB_RANGE,
  );
  assert.equal(selected?.actorId, 1);
});

test('grab never snaps to a distant or rear enemy', () => {
  assert.equal(selectGrabCandidate({ x: 300, y: 610 }, 1, [enemy(1, 450, 610)], DIRECT_GRAB_RANGE), null);
  assert.equal(selectGrabCandidate({ x: 300, y: 610 }, 1, [enemy(2, 275, 610)], COMBO_GRAB_RANGE, 2), null);
});

test('post-hit assist prefers the struck enemy inside its short extended range', () => {
  const selected = selectGrabCandidate(
    { x: 300, y: 610 },
    1,
    [enemy(1, 365, 610), enemy(2, 445, 610)],
    COMBO_GRAB_RANGE,
    2,
  );
  assert.equal(selected?.actorId, 2);
});

test('forward intent follows the current facing direction', () => {
  assert.equal(isForwardHeld(1, false, true), true);
  assert.equal(isForwardHeld(-1, true, false), true);
  assert.equal(isForwardHeld(1, true, false), false);
});
