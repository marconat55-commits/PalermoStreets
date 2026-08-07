import type { CombatEvent, Vec2 } from '../types';
import { canAcquireAttackTarget, GRAB_STRIKE, KICK_RIGHT, LIGHT_COMBO, SUPER, THROW } from './attacks';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { Actor, HitResult } from '../entities/Actor';
import { rectsIntersect } from '../../utils/math';

export function resolvePlayerAttack(player: Player, enemies: Enemy[]): CombatEvent[] {
  const box = player.activeAttackBox();
  const attack = player.currentAttack;
  if (!box || !attack) return [];
  if (!canAcquireAttackTarget(attack, player.attackHits.size)) return [];

  const candidates = enemies
    .filter((enemy) => !enemy.dead)
    .sort((a, b) => {
      if (a === player.grabbedTarget) return -1;
      if (b === player.grabbedTarget) return 1;
      const frontA = (a.position.x - player.position.x) * player.facing >= 0 ? 0 : 1;
      const frontB = (b.position.x - player.position.x) * player.facing >= 0 ? 0 : 1;
      if (frontA !== frontB) return frontA - frontB;
      const da = Math.abs(a.position.x - player.position.x) + Math.abs(a.position.y - player.position.y) * 1.6;
      const db = Math.abs(b.position.x - player.position.x) + Math.abs(b.position.y - player.position.y) * 1.6;
      return da - db;
    });

  const events: CombatEvent[] = [];
  for (const enemy of candidates) {
    if (player.attackHits.has(enemy.actorId)) continue;
    if (!rectsIntersect(box, enemy.hurtbox)) continue;
    let result: HitResult;
    if (enemy === player.grabbedTarget && attack === GRAB_STRIKE) {
      result = enemy.receiveGrabHit(attack.damage);
    } else {
      if (enemy === player.grabbedTarget && attack === THROW) player.releaseGrab();
      result = enemy.receiveHit(attack.damage, { x: player.facing * attack.knockbackX, y: 0 }, attack.knockdown ?? false);
    }
    if (!result.accepted) continue;
    player.registerHit(enemy.actorId, attack.damage);
    const hb = enemy.hurtbox;
    events.push({
      position: { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 },
      damage: attack.damage,
      heavy: attack === KICK_RIGHT || attack === SUPER || attack === LIGHT_COMBO[LIGHT_COMBO.length - 1],
      hitStop: attack.hitStop,
      shake: attack.shake,
      targetKilled: result.killed,
    });
    if (!attack.multiHit) break;
  }
  return events;
}

export function resolveEnemyAttack(enemy: Enemy, player: Player): CombatEvent | null {
  const box = enemy.activeAttackBox();
  const attack = enemy.currentAttack;
  if (!box || !attack || !rectsIntersect(box, player.hurtbox)) return null;
  const direction = player.position.x >= enemy.position.x ? 1 : -1;
  const result = player.receiveEnemyHit(
    attack.damage,
    { x: direction * attack.knockbackX, y: 0 },
    attack.knockdown ?? false,
    enemy.position.x,
  );
  if (!result.accepted) return null;
  enemy.attackHitPlayer = true;
  const hb = player.hurtbox;
  return {
    position: { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 },
    damage: result.damageTaken,
    heavy: result.blocked ? false : (attack.knockdown ?? false),
    hitStop: result.blocked ? attack.hitStop * 0.45 : attack.hitStop,
    shake: result.blocked ? 1.5 : attack.shake,
    targetKilled: result.killed,
    blocked: result.blocked,
  };
}

function pairShares(first: Actor, second: Actor, player: Player): [number, number] {
  if (first === player && second !== player) return [0.20, 0.80];
  if (first !== player && second === player) return [0.80, 0.20];
  return [0.50, 0.50];
}

function separatePair(first: Actor, second: Actor, player: Player): boolean {
  if (first.dead || second.dead || first.state === 'grabbed' || second.state === 'grabbed') return false;
  const r1 = first.collisionRadius;
  const r2 = second.collisionRadius;
  const rx = r1.x + r2.x;
  const ry = r1.y + r2.y;
  let dx = second.position.x - first.position.x;
  let dy = second.position.y - first.position.y;
  const nx = dx / Math.max(1, rx);
  const ny = dy / Math.max(1, ry);
  if (Math.hypot(nx, ny) >= 1) return false;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    dx = first.actorId < second.actorId ? 1 : -1;
    dy = 0;
  }
  const overlapX = Math.max(0, rx - Math.abs(dx));
  const overlapY = Math.max(0, ry - Math.abs(dy));
  const playerEnemyPair = (first === player) !== (second === player);
  const forceHorizontal = playerEnemyPair && Math.abs(dy) <= ry * 0.95;
  let axis: Vec2;
  if (forceHorizontal || overlapX <= overlapY * 1.10) {
    axis = { x: (dx >= 0 ? 1 : -1) * (overlapX + 1.25), y: 0 };
  } else {
    axis = { x: 0, y: (dy >= 0 ? 1 : -1) * (overlapY + 0.75) };
  }
  const [shareA, shareB] = pairShares(first, second, player);
  first.position.x -= axis.x * shareA;
  first.position.y -= axis.y * shareA;
  second.position.x += axis.x * shareB;
  second.position.y += axis.y * shareB;
  return true;
}

export function separateActors(actors: Actor[], player: Player): void {
  for (let pass = 0; pass < 7; pass += 1) {
    let changed = false;
    for (let i = 0; i < actors.length; i += 1) {
      for (let j = i + 1; j < actors.length; j += 1) {
        changed = separatePair(actors[i]!, actors[j]!, player) || changed;
      }
    }
    if (!changed) break;
  }
  for (const actor of actors) actor.clampToPlayfield();
}

export function preventCrossings(player: Player, enemies: Enemy[], previous: Map<number, Vec2>): void {
  const pp = previous.get(player.actorId);
  if (!pp) return;
  for (const enemy of enemies) {
    if (enemy.dead || enemy.state === 'grabbed') continue;
    const pe = previous.get(enemy.actorId);
    if (!pe) continue;
    const oldDx = pe.x - pp.x;
    const newDx = enemy.position.x - player.position.x;
    const oldDy = Math.abs(pe.y - pp.y);
    const newDy = Math.abs(enemy.position.y - player.position.y);
    if (oldDy > 54 || newDy > 54 || oldDx === 0 || oldDx * newDx >= 0) continue;
    const minimum = player.collisionRadius.x + enemy.collisionRadius.x + 7;
    const side = oldDx > 0 ? 1 : -1;
    enemy.position.x = player.position.x + side * minimum;
    enemy.engageSide = side as -1 | 1;
    enemy.clampToPlayfield();
  }
}
