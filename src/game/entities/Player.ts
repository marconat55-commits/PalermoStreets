import { Actor, type HitResult } from './Actor';
import type { AnimationBank, AttackData, Rect, Vec2 } from '../types';
import { FURY_MAX } from '../config';
import {
  AIR_ATTACK,
  GRAB_STRIKE,
  KICK_RIGHT,
  LIGHT_COMBO,
  SUPER,
  THROW,
  attackTotal,
} from '../combat/attacks';
import { lengthSq, normalize } from '../../utils/math';
import type { Input } from '../input/Input';
import { locomotionPlaybackRate, selectLocomotionClip } from '../animation/locomotion';
import type { Enemy } from './Enemy';

const RUN_MULTIPLIER = 1.55;
const RUN_TAP_WINDOW = 0.26;
const DODGE_DURATION = 0.34;
const JUMP_GRAVITY = 1550;
const JUMP_VELOCITY = 620;

export interface PlayerHitResult extends HitResult {
  blocked: boolean;
  damageTaken: number;
}

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
  grabbedTarget: Enemy | null = null;

  private runTapWindow = 0;
  private runTapDirection: -1 | 0 | 1 = 0;
  private runningDirection: -1 | 0 | 1 = 0;
  private dodgeDirection: Vec2 = { x: 1, y: 0 };
  private airVelocity = 0;

  constructor(bank: AnimationBank, position: Vec2, maxHealth = 120, moveSpeed = 285, depthSpeed = 205) {
    super(bank, position, maxHealth);
    this.moveSpeed = moveSpeed;
    this.depthSpeed = depthSpeed;
  }

  override get collisionRadius(): Vec2 {
    if (this.elevation > 20) return { x: 24, y: 15 };
    if (this.state === 'knockdown' || this.state === 'dead') return { x: 60, y: 16 };
    if (this.state === 'getup') return { x: 40, y: 20 };
    return { x: 38, y: 22 };
  }

  get isBlocking(): boolean {
    return this.state === 'block';
  }

  get isRunning(): boolean {
    return this.runningDirection !== 0 && this.state === 'run';
  }

  get isAirborne(): boolean {
    return this.elevation > 0 || this.state === 'jump' || this.currentAttack === AIR_ATTACK;
  }

  get canStartGrab(): boolean {
    return !this.dead && this.elevation <= 0 && ['idle', 'walk', 'run'].includes(this.state) && !this.grabbedTarget;
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
    if (this.dead || this.elevation > 0 || ['hit', 'knockdown', 'getup', 'dodge', 'block', 'grab'].includes(this.state)) return false;
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
    this.runningDirection = 0;
    this.faceAutoTarget();
    this.startAttack(attack);
    return true;
  }

  requestPunch(): boolean {
    let attack: typeof LIGHT_COMBO[number];
    if (this.state === 'attack' && this.currentAttack) {
      const currentIndex = LIGHT_COMBO.indexOf(this.currentAttack as typeof LIGHT_COMBO[number]);
      attack = LIGHT_COMBO[(currentIndex + 1) % LIGHT_COMBO.length]!;
    } else {
      attack = LIGHT_COMBO[this.nextPunchIndex]!;
    }
    const accepted = this.requestAttack(attack, true);
    if (accepted) this.nextPunchIndex = (LIGHT_COMBO.indexOf(attack) + 1) % LIGHT_COMBO.length;
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

  requestDodge(direction: Vec2): boolean {
    if (this.dead || this.elevation > 0 || !['idle', 'walk', 'run', 'block'].includes(this.state)) return false;
    const fallback = { x: this.facing, y: 0 };
    this.dodgeDirection = lengthSq(direction) > 0.01 ? normalize(direction) : fallback;
    this.runningDirection = 0;
    this.invulnerable = DODGE_DURATION;
    this.beginState('dodge', 'dodge');
    return true;
  }

  requestJump(): boolean {
    if (this.dead || this.elevation > 0 || !['idle', 'walk', 'run'].includes(this.state)) return false;
    this.runningDirection = 0;
    this.airVelocity = JUMP_VELOCITY;
    this.elevation = 1;
    this.beginState('jump', 'jump');
    this.animator.fitDuration((JUMP_VELOCITY * 2) / JUMP_GRAVITY);
    return true;
  }

  requestAirAttack(): boolean {
    if (this.dead || this.elevation < 18 || this.currentAttack !== null) return false;
    this.startAttack(AIR_ATTACK);
    return true;
  }

  beginGrab(target: Enemy): boolean {
    if (!this.canStartGrab || !target.beginGrabbed(this)) return false;
    this.grabbedTarget = target;
    this.facing = target.position.x >= this.position.x ? 1 : -1;
    this.runningDirection = 0;
    this.position.y = target.position.y;
    this.beginState('grab', 'grab');
    return true;
  }

  requestGrabStrike(): boolean {
    if (this.state !== 'grab' || !this.grabbedTarget || this.grabbedTarget.dead) return false;
    this.startAttack(GRAB_STRIKE);
    return true;
  }

  requestThrow(): boolean {
    if (this.state !== 'grab' || !this.grabbedTarget || this.grabbedTarget.dead) return false;
    this.startAttack(THROW);
    return true;
  }

  releaseGrab(): void {
    const target = this.grabbedTarget;
    this.grabbedTarget = null;
    target?.releaseGrab();
  }

  private startAttack(attack: AttackData): void {
    this.currentAttack = attack;
    this.queuedAttack = null;
    this.attackElapsed = 0;
    this.attackHits.clear();
    this.beginState('attack', attack.name);
    this.animator.fitDuration(attackTotal(attack));
  }

  private readMove(input: Input, movementEnabled: boolean): Vec2 {
    if (!movementEnabled) return { x: 0, y: 0 };
    const x = Number(input.isDown('KeyD', 'ArrowRight')) - Number(input.isDown('KeyA', 'ArrowLeft'));
    const y = Number(input.isDown('KeyS', 'ArrowDown')) - Number(input.isDown('KeyW', 'ArrowUp'));
    const raw = { x, y };
    return lengthSq(raw) > 1 ? normalize(raw) : raw;
  }

  private updateRunGesture(input: Input, horizontal: number): void {
    this.runTapWindow = Math.max(0, this.runTapWindow);
    const pressedDirection = input.wasPressed('KeyD', 'ArrowRight') ? 1 : input.wasPressed('KeyA', 'ArrowLeft') ? -1 : 0;
    if (pressedDirection !== 0) {
      if (pressedDirection === this.runTapDirection && this.runTapWindow > 0) this.runningDirection = pressedDirection;
      this.runTapDirection = pressedDirection;
      this.runTapWindow = RUN_TAP_WINDOW;
    }
    if (horizontal === 0 || (this.runningDirection !== 0 && horizontal !== this.runningDirection)) this.runningDirection = 0;
  }

  private updateAirborne(dt: number, input: Input, movementEnabled: boolean): void {
    const move = this.readMove(input, movementEnabled);
    if (lengthSq(move) > 0.01) {
      this.lastMove = normalize(move);
      if (move.x !== 0) this.facing = move.x > 0 ? 1 : -1;
    }
    this.position.x += move.x * this.moveSpeed * 0.74 * dt;
    this.position.y += move.y * this.depthSpeed * 0.58 * dt;
    this.airVelocity -= JUMP_GRAVITY * dt;
    this.elevation += this.airVelocity * dt;

    if (this.currentAttack === AIR_ATTACK) {
      this.attackElapsed += dt;
      if (this.attackElapsed >= attackTotal(AIR_ATTACK)) {
        this.currentAttack = null;
        this.attackHits.clear();
        if (this.elevation > 0) this.beginState('jump', 'jump');
      }
    }

    if (this.elevation <= 0 && this.airVelocity < 0) {
      this.elevation = 0;
      this.airVelocity = 0;
      this.currentAttack = null;
      this.attackHits.clear();
      this.beginState('idle', 'idle');
    }
    this.clampToPlayfield();
    this.syncVisual();
  }

  update(dt: number, input: Input, movementEnabled = true): void {
    this.updateCommon(dt);
    this.comboDisplayTimer = Math.max(0, this.comboDisplayTimer - dt);
    this.runTapWindow = Math.max(0, this.runTapWindow - dt);
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
    if (this.state === 'dodge') {
      this.position.x += this.dodgeDirection.x * 520 * dt;
      this.position.y += this.dodgeDirection.y * 330 * dt;
      if (this.animator.finished || this.stateElapsed >= DODGE_DURATION) this.beginState('idle', 'idle');
      this.clampToPlayfield(); this.syncVisual(); return;
    }
    if (this.isAirborne) {
      this.updateAirborne(dt, input, movementEnabled);
      return;
    }
    if (this.state === 'attack' && this.currentAttack) {
      this.attackElapsed += dt;
      if (this.currentAttack === SUPER) {
        if (this.attackElapsed >= 0.18) this.position.x += this.facing * 245 * dt;
      } else if (![GRAB_STRIKE, THROW].includes(this.currentAttack) && this.attackElapsed < this.currentAttack.startup + this.currentAttack.active) {
        const lunge: Record<string, number> = { punch_left: 82, punch_right: 104, combo_finisher: 116, kick_right: 72 };
        this.position.x += this.facing * (lunge[this.currentAttack.name] ?? 52) * dt;
      }
      if (this.attackElapsed >= attackTotal(this.currentAttack)) {
        const completed = this.currentAttack;
        const queued = this.queuedAttack;
        if (queued) {
          this.comboStep += 1;
          this.startAttack(queued);
        } else if (completed === GRAB_STRIKE && this.grabbedTarget && !this.grabbedTarget.dead) {
          this.currentAttack = null;
          this.attackHits.clear();
          this.beginState('grab', 'grab');
        } else {
          if (completed === THROW || completed === GRAB_STRIKE) this.releaseGrab();
          this.currentAttack = null;
          this.comboStep = 0;
          this.beginState('idle', 'idle');
        }
      }
      this.clampToPlayfield(); this.syncVisual(); return;
    }

    if (this.state === 'grab') {
      if (!this.grabbedTarget || this.grabbedTarget.dead) {
        this.releaseGrab();
        this.beginState('idle', 'idle');
      }
      this.syncVisual();
      return;
    }

    const blocking = input.isDown('ShiftLeft', 'ShiftRight');
    if (blocking && movementEnabled) {
      this.runningDirection = 0;
      if (this.state !== 'block') this.beginState('block', 'block');
      this.syncVisual();
      return;
    }
    if (this.state === 'block') this.beginState('idle', 'idle');

    const move = this.readMove(input, movementEnabled);
    this.updateRunGesture(input, move.x);
    const running = this.runningDirection !== 0 && move.x === this.runningDirection;
    if (lengthSq(move) > 0.01) this.lastMove = normalize(move);
    const horizontalSpeed = this.moveSpeed * (running ? RUN_MULTIPLIER : 1);
    const depthSpeed = this.depthSpeed * (running ? 1.10 : 1);
    this.position.x += move.x * horizontalSpeed * dt;
    this.position.y += move.y * depthSpeed * dt;
    if (move.x !== 0) this.facing = move.x > 0 ? 1 : -1;
    else this.faceAutoTarget();
    const moving = lengthSq(move) > 0.01;
    const movementAnimation = running
      ? 'run'
      : selectLocomotionClip(move, this.animator.name, (name) => this.animator.bank.clips.has(name));
    const preservesStride = ['walk', 'walk_up', 'walk_down', 'run'].includes(this.animator.name);
    this.animator.play(moving ? movementAnimation : 'idle', false, moving && preservesStride);
    if (moving) {
      const actualSpeed = Math.hypot(move.x * horizontalSpeed, move.y * depthSpeed);
      this.animator.setPlaybackRate(locomotionPlaybackRate(actualSpeed, this.animator.clip.referenceSpeed));
    } else {
      this.animator.setPlaybackRate(1);
    }
    this.state = running ? 'run' : moving ? 'walk' : 'idle';
    this.clampToPlayfield();
    this.syncVisual();
  }

  activeAttackBox(): Rect | null {
    const attack = this.currentAttack;
    if (!attack || this.state !== 'attack') return null;
    if (!(attack.startup <= this.attackElapsed && this.attackElapsed <= attack.startup + attack.active)) return null;
    const factor = attack === SUPER ? 0.72 : 0.62;
    const centerX = this.position.x + this.facing * attack.rangeX * factor;
    const feetY = this.position.y - this.elevation;
    return {
      x: centerX - attack.rangeX / 2,
      y: feetY - attack.rangeY,
      width: attack.rangeX,
      height: attack.rangeY,
    };
  }

  receiveEnemyHit(damage: number, knockback: Vec2, knockdown: boolean, attackerX: number): PlayerHitResult {
    const attackInFront = (attackerX - this.position.x) * this.facing >= -8;
    if (this.isBlocking && attackInFront && this.canBeHit) {
      const damageTaken = Math.max(1, Math.round(damage * 0.18));
      this.health = Math.max(0, this.health - damageTaken);
      this.hitFlash = 0.055;
      this.invulnerable = 0.08;
      this.velocity = { x: knockback.x * 0.12, y: knockback.y * 0.12 };
      const killed = this.health <= 0;
      if (killed) {
        this.dead = true;
        this.beginState('dead', 'dead');
        this.invulnerable = 999;
      }
      return { accepted: true, killed, knockedDown: killed, blocked: true, damageTaken };
    }
    const result = this.receiveHit(damage, knockback, knockdown);
    return { ...result, blocked: false, damageTaken: result.accepted ? damage : 0 };
  }

  override receiveHit(damage: number, knockback: Vec2, knockdown = false): HitResult {
    this.releaseGrab();
    this.elevation = 0;
    this.airVelocity = 0;
    this.currentAttack = null;
    this.queuedAttack = null;
    return super.receiveHit(damage, knockback, knockdown);
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
