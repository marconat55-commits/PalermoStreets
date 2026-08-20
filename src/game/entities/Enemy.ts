import { Actor, type HitResult } from './Actor';
import type { AnimationBank, AttackData, EnemyAttackPattern, Rect, Vec2 } from '../types';
import { ENEMY_ATTACK, ENEMY_HEAVY, attackTotal } from '../combat/attacks';
import { clamp, lengthSq, normalize, randomRange, sub } from '../../utils/math';
import { locomotionPlaybackRate, selectLocomotionClip } from '../animation/locomotion';
import { selectEnemyAttackSlot } from '../combat/enemyAttackPattern';

function scaledAttack(base: AttackData, damageScale: number, speedScale: number): AttackData {
  const speed = clamp(speedScale, 0.55, 1.8);
  return {
    ...base,
    damage: Math.max(1, Math.round(base.damage * Math.max(0.35, damageScale))),
    startup: base.startup / speed,
    active: base.active / speed,
    recovery: base.recovery / speed,
  };
}

export interface EnemyOptions {
  health?: number;
  aggression?: number;
  boss?: boolean;
  displayName?: string;
  variantIndex?: number;
  characterId?: string;
  moveSpeedScale?: number;
  damageScale?: number;
  attackSpeedScale?: number;
  heavyChance?: number;
  attackPattern?: EnemyAttackPattern;
  cooldownScale?: number;
  collisionScale?: number;
  dodgeChance?: number;
  dodgeCooldown?: number;
}

export class Enemy extends Actor {
  readonly characterId: string;
  readonly isBoss: boolean;
  readonly displayName: string;
  readonly variantIndex: number;
  readonly aggression: number;
  readonly moveSpeedScale: number;
  readonly cooldownScale: number;
  readonly collisionScale: number;
  readonly heavyChance: number;
  readonly attackPattern: EnemyAttackPattern;
  readonly lightAttack: AttackData;
  readonly heavyAttack: AttackData;
  readonly dodgeChance: number;
  readonly dodgeCooldownDuration: number;
  currentAttack: AttackData | null = null;
  attackElapsed = 0;
  attackHitPlayer = false;
  attackCooldown: number;
  attackFacing: -1 | 1 = -1;
  preferredDepthOffset = randomRange(-28, 28);
  engageSide: -1 | 1 | null = null;
  spawnElapsed = 0;
  grabbedBy: Actor | null = null;
  dodgeCooldown = 0;
  private attackSequence = 0;

  constructor(bank: AnimationBank, position: Vec2, options: EnemyOptions = {}) {
    super(bank, position, options.health ?? 82);
    this.characterId = options.characterId ?? 'talebano';
    this.aggression = options.aggression ?? 1;
    this.isBoss = options.boss ?? false;
    this.displayName = options.displayName ?? 'SGHERRO';
    this.variantIndex = options.variantIndex ?? 0;
    this.moveSpeedScale = clamp(options.moveSpeedScale ?? 1, 0.60, 1.65);
    this.cooldownScale = clamp(options.cooldownScale ?? 1, 0.55, 1.80);
    this.collisionScale = clamp(options.collisionScale ?? 1, 0.75, 1.35);
    this.heavyChance = clamp((options.heavyChance ?? 0.13) + (this.isBoss ? 0.11 : 0), 0, 0.8);
    this.attackPattern = options.attackPattern ?? 'weighted';
    this.lightAttack = scaledAttack(ENEMY_ATTACK, options.damageScale ?? 1, options.attackSpeedScale ?? 1);
    this.heavyAttack = scaledAttack(ENEMY_HEAVY, options.damageScale ?? 1, options.attackSpeedScale ?? 1);
    this.dodgeChance = clamp(options.dodgeChance ?? 0, 0, 0.8);
    this.dodgeCooldownDuration = clamp(options.dodgeCooldown ?? 2.6, 0.4, 12);
    this.attackCooldown = randomRange(0.82, 1.22) * this.cooldownScale;
    this.alpha255 = 0;
    this.beginState('spawn', 'idle');
  }

  override receiveHit(damage: number, knockback: Vec2, knockdown = false, launchVelocity = 0): HitResult {
    // A successful evade intentionally rejects the hit; combat resolution then
    // produces neither damage nor a false hit effect.
    const canDodge = this.animator.bank.clips.has('dodge')
      && this.canBeHit
      && this.dodgeCooldown <= 0
      && this.dodgeChance > 0
      && Math.random() < this.dodgeChance;
    if (!canDodge) return super.receiveHit(damage, knockback, knockdown, launchVelocity);
    const away = knockback.x === 0 ? -this.facing : (Math.sign(knockback.x) as -1 | 1);
    this.currentAttack = null;
    this.attackHitPlayer = false;
    this.velocity = { x: away * 245, y: 0 };
    this.facing = away === 1 ? -1 : 1;
    this.beginState('dodge', 'dodge');
    this.invulnerable = Math.max(0.30, this.animator.duration);
    this.dodgeCooldown = this.dodgeCooldownDuration;
    return { accepted: false, killed: false, knockedDown: false };
  }

  override get collisionRadius(): Vec2 {
    let base: Vec2;
    if (this.state === 'knockdown' || this.state === 'dead') base = { x: this.isBoss ? 62 : 60, y: 16 };
    else if (this.state === 'getup') base = { x: this.isBoss ? 42 : 40, y: 20 };
    else base = { x: this.isBoss ? 43 : 39, y: this.isBoss ? 23 : 22 };
    return { x: base.x * this.collisionScale, y: base.y * this.collisionScale };
  }

  get attackWarningRatio(): number {
    const attack = this.currentAttack;
    if (this.state !== 'attack' || !attack || attack.startup <= 0 || this.attackElapsed >= attack.startup) return 0;
    return clamp(this.attackElapsed / attack.startup, 0, 1);
  }

  get canBeGrabbed(): boolean {
    return !this.dead && this.invulnerable <= 0 && ['idle', 'walk'].includes(this.state);
  }

  beginGrabbed(holder: Actor): boolean {
    if (!this.canBeGrabbed) return false;
    this.grabbedBy = holder;
    this.velocity = { x: 0, y: 0 };
    this.currentAttack = null;
    this.beginState('grabbed', 'hit');
    this.animator.setPlaybackRate(0);
    return true;
  }

  releaseGrab(): void {
    if (!this.grabbedBy) return;
    this.grabbedBy = null;
    if (!this.dead && this.state === 'grabbed') this.beginState('idle', 'idle');
  }

  receiveGrabHit(damage: number): HitResult {
    if (this.dead || !this.grabbedBy) return { accepted: false, killed: false, knockedDown: false };
    this.health = Math.max(0, this.health - damage);
    this.hitFlash = 0.09;
    const killed = this.health <= 0;
    if (killed) {
      this.grabbedBy = null;
      this.dead = true;
      this.beginState('dead', 'dead');
      this.invulnerable = 999;
      return { accepted: true, killed: true, knockedDown: true };
    }
    this.beginState('grabbed', 'hit');
    this.animator.setPlaybackRate(0);
    return { accepted: true, killed: false, knockedDown: false };
  }

  private startAttack(attack: AttackData, player: Actor): void {
    this.currentAttack = attack;
    this.attackElapsed = 0;
    this.attackHitPlayer = false;
    this.attackFacing = player.position.x >= this.position.x ? 1 : -1;
    this.facing = this.attackFacing;
    this.velocity = { x: 0, y: 0 };
    this.beginState('attack', attack.name);
    this.animator.fitDuration(attackTotal(attack));
  }

  update(dt: number, player: Actor, allies: Enemy[], mayAttack: boolean, supportRank = 0): void {
    this.updateCommon(dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);

    if (this.grabbedBy) {
      if (this.grabbedBy.dead || !['grab', 'attack'].includes(this.grabbedBy.state)) {
        this.releaseGrab();
      } else {
        const holder = this.grabbedBy;
        this.position.x = holder.position.x + holder.facing * 54;
        this.position.y = holder.position.y;
        this.facing = holder.facing === 1 ? -1 : 1;
        this.velocity = { x: 0, y: 0 };
        this.state = 'grabbed';
        this.animator.setPlaybackRate(0);
        this.syncVisual();
        return;
      }
    }

    if (this.dead) {
      const deadClip = this.animator.bank.clips.get('dead')!;
      const landingTime = deadClip.frames.slice(0, -1).reduce((sum, frame) => sum + frame.duration, 0);
      const hold = landingTime + (this.isBoss ? 0.62 : 0.34);
      if (this.stateElapsed > hold) this.alpha255 = Math.max(0, this.alpha255 - (this.isBoss ? 235 : 430) * dt);
      if (this.alpha255 <= 0) this.removeReady = true;
      this.syncVisual();
      return;
    }

    if (this.state === 'spawn') {
      this.spawnElapsed += dt;
      const duration = this.isBoss ? 0.44 : 0.30;
      this.alpha255 = Math.min(255, Math.round(255 * this.spawnElapsed / duration));
      if (this.spawnElapsed >= duration) {
        this.beginState('idle', 'idle');
        this.invulnerable = 0.15;
      }
      this.syncVisual();
      return;
    }
    if (this.state === 'hit') {
      if (this.animator.finished) this.beginState('idle', 'idle');
      this.clampToPlayfield(); this.syncVisual(); return;
    }
    if (this.state === 'dodge') {
      if (this.animator.finished) this.beginState('idle', 'idle');
      this.clampToPlayfield(); this.syncVisual(); return;
    }
    if (this.state === 'knockdown') {
      if (this.animator.finished && this.elevation <= 0) this.beginState('getup', 'getup');
      this.clampToPlayfield(); this.syncVisual(); return;
    }
    if (this.state === 'getup') {
      if (this.animator.finished) {
        this.beginState('idle', 'idle');
        this.invulnerable = 0.14;
      }
      this.clampToPlayfield(); this.syncVisual(); return;
    }
    if (this.state === 'attack' && this.currentAttack) {
      const attack = this.currentAttack;
      this.attackElapsed += dt;
      this.facing = this.attackFacing;
      if (attack.startup <= this.attackElapsed && this.attackElapsed <= attack.startup + attack.active) {
        let speed = attack.name === 'heavy' ? 68 : 48;
        if (this.isBoss) speed *= 1.12;
        this.position.x += this.attackFacing * speed * this.moveSpeedScale * dt;
      }
      if (this.attackElapsed >= attackTotal(attack)) {
        this.currentAttack = null;
        const [low, high] = this.isBoss ? [0.66, 0.98] : [0.96, 1.36];
        this.attackCooldown = randomRange(low, high) * this.cooldownScale / Math.max(0.78, this.aggression);
        this.beginState('idle', 'idle');
      }
      this.clampToPlayfield(); this.syncVisual(); return;
    }

    const delta = sub(player.position, this.position);
    if (this.engageSide === null) this.engageSide = this.position.x < player.position.x ? -1 : 1;
    else if (Math.abs(delta.x) > 205) this.engageSide = this.position.x < player.position.x ? -1 : 1;

    let desiredX: number;
    let desiredY: number;
    if (mayAttack) {
      const side = this.engageSide;
      desiredX = player.position.x + side * (this.isBoss ? 96 : 91);
      desiredY = player.position.y + this.preferredDepthOffset * 0.28;
      this.facing = (-side) as -1 | 1;
    } else {
      const side = supportRank % 2 === 0 ? -1 : 1;
      const ring = Math.floor(supportRank / 2);
      const distance = 176 + ring * 62;
      const laneSign = ring % 2 === 0 ? -1 : 1;
      desiredX = player.position.x + side * distance;
      desiredY = player.position.y + laneSign * (50 + ring * 12);
      this.facing = player.position.x >= this.position.x ? 1 : -1;
    }

    const toSlot = { x: desiredX - this.position.x, y: desiredY - this.position.y };
    const distanceX = Math.abs(delta.x);
    const distanceY = Math.abs(delta.y);
    const correctSide = (this.position.x - player.position.x) * this.engageSide > 0;
    const playerVulnerable = !player.dead && !['hit', 'knockdown', 'getup'].includes(player.state);

    if (mayAttack && playerVulnerable && correctSide && this.attackCooldown <= 0 && distanceX <= (this.isBoss ? 118 : 108) && distanceY <= 46) {
      const chance = clamp(this.heavyChance * this.aggression, 0, 0.85);
      const selection = selectEnemyAttackSlot(this.attackPattern, this.attackSequence, chance);
      this.attackSequence = selection.nextSequence;
      this.startAttack(selection.slot === 'heavy' ? this.heavyAttack : this.lightAttack, player);
      this.clampToPlayfield(); this.syncVisual(); return;
    }

    let moved = false;
    let movementAnimation = 'walk';
    if (lengthSq(toSlot) > 12 * 12) {
      const direction = normalize(toSlot);
      const speedX = (mayAttack ? (this.isBoss ? 132 : 120) : 92) * this.moveSpeedScale;
      const speedY = (mayAttack ? (this.isBoss ? 100 : 92) : 78) * this.moveSpeedScale;
      const step = { x: direction.x * speedX * dt, y: direction.y * speedY * dt };
      if (Math.abs(step.x) > Math.abs(toSlot.x)) step.x = toSlot.x;
      if (Math.abs(step.y) > Math.abs(toSlot.y)) step.y = toSlot.y;
      this.position.x += step.x;
      this.position.y += step.y;
      moved = lengthSq(step) > 0.01;
      if (moved) {
        movementAnimation = selectLocomotionClip(
          step,
          this.animator.name,
          (name) => this.animator.bank.clips.has(name),
        );
        const actualSpeed = Math.hypot(direction.x * speedX, direction.y * speedY);
        const clip = this.animator.bank.clips.get(movementAnimation);
        this.animator.setPlaybackRate(locomotionPlaybackRate(actualSpeed, clip?.referenceSpeed));
      }
    }

    for (const ally of allies) {
      if (ally === this || ally.dead) continue;
      const offset = sub(this.position, ally.position);
      if (Math.abs(offset.y) < 40 && Math.abs(offset.x) < 90) {
        let sign = offset.x >= 0 ? 1 : -1;
        if (Math.abs(offset.x) < 1) sign = this.actorId > ally.actorId ? 1 : -1;
        this.position.x += sign * (90 - Math.abs(offset.x)) * 0.20;
      }
    }

    const preservesStride = ['walk', 'walk_up', 'walk_down'].includes(this.animator.name);
    this.animator.play(moved ? movementAnimation : 'idle', false, moved && preservesStride);
    if (!moved) this.animator.setPlaybackRate(1);
    this.state = moved ? 'walk' : 'idle';
    this.clampToPlayfield();
    this.syncVisual();
  }

  activeAttackBox(): Rect | null {
    const attack = this.currentAttack;
    if (!attack || this.state !== 'attack' || this.attackHitPlayer) return null;
    if (!(attack.startup <= this.attackElapsed && this.attackElapsed <= attack.startup + attack.active)) return null;
    const centerX = this.position.x + this.attackFacing * attack.rangeX * 0.50;
    return { x: centerX - attack.rangeX / 2, y: this.position.y - attack.rangeY, width: attack.rangeX, height: attack.rangeY };
  }
}
