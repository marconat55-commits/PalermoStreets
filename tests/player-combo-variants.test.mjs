import assert from 'node:assert/strict';
import test from 'node:test';
import { Texture } from 'pixi.js';
import { createServer } from 'vite';

const frame = {
  texture: Texture.WHITE, duration: 0.1, offsetX: 0, offsetY: 20,
  scale: 1, bounds: [295, 100, 50, 300], width: 640, height: 420,
};
const attack = (name) => ({
  name, damage: 10, startup: 0.1, active: 0.1, recovery: 0.2,
  rangeX: 100, rangeY: 60, knockbackX: 150, knockbackY: 0,
  furyGain: 5, hitStop: 0.05, shake: 3,
});
const chains = [
  [attack('one_a'), attack('one_b')],
  [attack('two_a'), attack('two_b')],
  [attack('three_a'), attack('three_b')],
];
const bank = {
  clips: new Map(['idle', ...chains.flat().map((move) => move.name)].map((name) => [name, {
    frames: [frame], loop: name === 'idle', sourceFacing: 1,
  }])),
};
const input = { isDown: () => false, wasPressed: () => false };

test('player chooses a combo once, completes it, then may choose another variant', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const [{ Player }, { comboChainTime }] = await Promise.all([
      server.ssrLoadModule('/src/game/entities/Player.ts'),
      server.ssrLoadModule('/src/game/combat/chainTiming.ts'),
    ]);
  const choices = [0.45, 0.99];
  const player = new Player(bank, { x: 500, y: 500 }, 120, 285, 205, 1, chains, () => choices.shift() ?? 0);
  assert.equal(player.requestArcadeAttack(), true);
  assert.equal(player.currentAttack, chains[1][0]);
  assert.equal(player.requestArcadeAttack(), true);
  assert.equal(player.queuedAttack, chains[1][1]);
  assert.equal(player.requestArcadeAttack(), false);
  player.attackElapsed = comboChainTime(player.currentAttack);
  player.update(0.01, input, false);
  assert.equal(player.currentAttack, chains[1][1]);
  player.update(0.6, input, false);
  assert.equal(player.currentAttack, null);
  assert.equal(player.requestArcadeAttack(), true);
  assert.equal(player.currentAttack, chains[2][0]);
  } finally {
    await server.close();
  }
});
