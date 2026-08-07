import { Actor } from './Actor';
import type { AnimationBank, AttackData, Rect, Vec2 } from '../types';
import { FURY_MAX } from '../config';
import { KICK_RIGHT, LIGHT_COMBO, PUNCH_LEFT, PUNCH_RIGHT, SUPER, attackTotal } from '../combat/attacks';
import { lengthSq, normalize } from '../../utils/math';
import type { Input } from '../input/Input';
import { locomotionPlaybackRate, selectLocomotionClip } from '../animation/locomotion';

export class Player extends Actor {
  readonly moveSpeed: number;
  readonly depthSpeed: number;
  fury = 0;
  score = 0;
  currentAttack: AttackData | null = null;
  queuedAttack: AttackData | null = null;
  attackElapsed = 0;
  attackHits = new Set<number>();
  comboStep = 0;
  nextPunchIndex = 0;
  comboCounter = 0;
  comboDisplayTimer = 0;
  autoTargetX: number | null = null;
  lastMove: Vec2 = { x: 1, y: 0 };

  constructor(bank: AnimationBank, position: Vec2, maxHealth = 120, moveSpeed = 285, depthSpeed = 205) {
    super(bank, position, maxHealth);
    this.moveSpeed = moveSpeed;
    this.depthSpeed = depthSpeed;
  }

  override get collisionRadius(): Vec2 {
    if (this.state === 'knockdown' || this.state === 'dead') return { x: 60, y: 16 };
    if (this.state === 'getup') return { x: 40, y: 20 };
    return { x: 38, y: 22 };
  }

  setAutoTarget(targetX: number | null): void {
    this.autoTargetX = targetX;
  }

  private faceAutoTarget(): void {
    if (this.autoTargetX === null) return;
    const delta = this.autoTargetX - this.position.x;
    if (Math.abs(delta) > 3) this.facing = delta > 0 ? 1 : -1;
  }

  private requestAttack(attack: AttackData, chainable = false): boolean {
    if (this.dead || ['hit', 'knockdown', 'getup', 'dodge', 'block'].includes(this.state)) return false;
    if (this.state === 'attack') {
      if (
        chainable &&
        this.currentAttack !== null &&
        LIGHT_COMBO.includes(this.currentAttack as typeof LIGHT_COMBO[number]) &&
        LIGHT_COMBO.includes(attack as typeof LIGHT_COMBO[number]) &&
        attack !== this.currentAttack &&
        this.attackElapsed >= this.currentAttack.startup + this.currentAttack.active * 0.45
      ) {
        this.queuedAttack = attack;
        return true;
      }
      return false;
    }
    this.comboStep = 0;
    this.faceAutoTarget();
    this.startAttack(attack);
    return true;
  }

  requestPunch(): boolean {
    const attack = this.state === 'attack' && this.currentAttack && LIGHT_COMBO.includes(this.currentAttack as typeof LIGHT_COMBO[number])
      ? (this.currentAttack === PUNCH_LEFT ? PUNCH_RIGHT : PUNCH_LEFT)
      : LIGHT_COMBO[this.nextPunchIndex]!;
    const accepted = this.requestAttack(attack, true);
    if (accepted) this.nextPunchIndex = attack === PUNCH_RIGHT ? 0 : 1;
    return accepted;
  }

  requestKick(): boolean {
    return this.requestAttack(KICK_RIGHT);
  }

  requestSuper(): boolean {
    if (this.fury < 50) return false;
    if (!this.requestAttack(SUPER)) return false;
    this.fury -= 50;
    this.invulnerable = SUPER.startup + SUPER.active;
    return true;
  }

  private startAttack(attack: AttackData): void {
    this.currentAttack = attack;
    this.queuedAttack = null;
    this.attackElapsed = 0;
    this.attackHits.clear();
    this.beginState('attack', attack.name);
    this.animator.fitDuration(attackTotal(attack));
  }

  update(dt: number, input: Input, movementEnabled = true): void {
    this.updateCommon(dt);
    this.comboDisplayTimer = Math.max(0, this.comboDisplayTimer - dt);
    if (this.dead) return;

    if (this.state === 'hit') {
      if (this.animator.finished) this.beginState('idle', 'idle');
      this.clampToPlayfield(); this.syncVisual(); return;
    }
    if (this.state === 'knockdown') {
      if (this.animator.finished) this.beginState('getup', 'getup');
      this.clampToPlayfield(); this.syncVisual(); return;
    }
    if (this.state === 'getup') {
      if (this.animator.finished) this.beginState('idle', 'idle');
      this.clampToPlayfield(); this.syncVisual(); return;
    }
    if (this.state === 'attack' && this.currentAttack) {
      this.attackElapsed += dt;
      if (this.currentAttack === SUPER) {
        if (this.attackElapsed >= 0.18) this.position.x += this.facing * 245 * dt;
      } else if (this.attackElapsed < this.currentAttack.startup + this.currentAttack.active) {
        const lunge: Record<string, number> = { punch_left: 82, punch_right: 112, kick_right: 72 };
        this.position.x += this.facing * (lunge[this.currentAttack.name] ?? 52) * dt;
      }
      if (this.attackElapsed >= attackTotal(this.currentAttack)) {
        const queued = this.queuedAttack;
        if (queued) {
          this.comboStep += 1;
          this.startAttack(queued);
        } else {
          this.currentAttack = null;
          this.comboStep = 0;
          this.beginState('idle', 'idle');
        }
      }
      this.clampToPlayfield(); this.syncVisual(); return;
    }

    let x = 0;
    let y = 0;
    if (movementEnabled) {
      x = Number(input.isDown('KeyD', 'ArrowRight')) - Number(input.isDown('KeyA', 'ArrowLeft'));
      y = Number(input.isDown('KeyS', 'ArrowDown')) - Number(input.isDown('KeyW', 'ArrowUp'));
    }
    let move: Vec2 = { x, y };
    if (lengthSq(move) > 1) move = normalize(move);
    if (lengthSq(move) > 0.01) this.lastMove = normalize(move);
    this.position.x += move.x * this.moveSpeed * dt;
    this.position.y += move.y * this.depthSpeed * dt;
    if (x !== 0) this.facing = x > 0 ? 1 : -1;
    else this.faceAutoTarget();
    const moving = lengthSq(move) > 0.01;
    const movementAnimation = selectLocomotionClip(
      move,
      this.animator.name,
      (name) => this.animator.bank.clips.has(name),
    );
    const preservesStride = ['walk', 'walk_up', 'walk_down'].includes(this.animator.name);
    this.animator.play(moving ? movementAnimation : 'idle', false, moving && preservesStride);
    if (moving) {
      const actualSpeed = Math.hypot(move.x * this.moveSpeed, move.y * this.depthSpeed);
      this.animator.setPlaybackRate(locomotionPlaybackRate(actualSpeed, this.animator.clip.referenceSpeed));
    } else {
      this.animator.setPlaybackRate(1);
    }
    this.state = moving ? 'walk' : 'idle';
    this.clampToPlayfield();
    this.syncVisual();
  }

  activeAttackBox(): Rect | null {
    const attack = this.currentAttack;
    if (!attack || this.state !== 'attack') return null;
    if (!(attack.startup <= this.attackElapsed && this.attackElapsed <= attack.startup + attack.active)) return null;
    const factor = attack === SUPER ? 0.72 : 0.62;
    const centerX = this.position.x + this.facing * attack.rangeX * factor;
    return {
      x: centerX - attack.rangeX / 2,
      y: this.position.y - attack.rangeY,
      width: attack.rangeX,
      height: attack.rangeY,
    };
  }

  registerHit(actorId: number, damage: number): void {
    this.attackHits.add(actorId);
    this.addFury(this.currentAttack?.furyGain ?? 0);
    this.score += damage * 10;
    this.comboCounter += 1;
    this.comboDisplayTimer = 1.25;
  }

  addFury(amount: number): void {
    this.fury = Math.min(FURY_MAX, this.fury + amount);
  }
}
