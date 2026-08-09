import { Actor, type HitResult } from './Actor';
import type { AnimationBank, AttackData, Rect, Vec2 } from '../types';
import { FURY_MAX } from '../config';
import {
  AIR_KICK,
  AIR_PUNCH,
  GRAB_STRIKE,
  KICK_COMBO,
  LIGHT_COMBO,
  SUPER,
  THROW,
  attackTotal,
} from '../combat/attacks';
import { lengthSq, normalize } from '../../utils/math';
import type { Input } from '../input/Input';
import { locomotionPlaybackRate, selectLocomotionClip } from '../animation/locomotion';
import { shouldStartRunBrake } from '../animation/movementTransitions';
import { nextIdleVariant, orderedIdleVariants } from '../animation/idleVariants';
import type { Enemy } from './Enemy';

const RUN_MULTIPLIER = 1.55;
const RUN_TAP_WINDOW = 0.26;
const DODGE_DURATION = 0.34;
const JUMP_GRAVITY = 1550;
const JUMP_VELOCITY = 620;
const IDLE_VARIANT_DELAY = 4.8;

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
  nextKickIndex = 0;
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
  private airMomentumX = 0;
  private landingMomentumX = 0;
  private jumpElapsed = 0;
  private jumpDuration = (JUMP_VELOCITY * 2) / JUMP_GRAVITY;
  private readonly idleVariants: string[];
  private idleVariantIndex = 0;
  private idleStillTime = 0;

  constructor(bank: AnimationBank, position: Vec2, maxHealth = 120, moveSpeed = 285, depthSpeed = 205) {
    super(bank, position, maxHealth);
    this.moveSpeed = moveSpeed;
    this.depthSpeed = depthSpeed;
    this.idleVariants = orderedIdleVariants(this.animator.bank.clips.keys());
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
    return this.elevation > 0 || this.state === 'jump' || this.currentAttack === AIR_PUNCH || this.currentAttack === AIR_KICK;
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
      const currentCombo: readonly AttackData[] | null = this.currentAttack && LIGHT_COMBO.includes(this.currentAttack as typeof LIGHT_COMBO[number])
        ? LIGHT_COMBO
        : this.currentAttack && KICK_COMBO.includes(this.currentAttack as typeof KICK_COMBO[number])
          ? KICK_COMBO
          : null;
      if (
        chainable &&
        this.currentAttack !== null &&
        currentCombo !== null &&
        currentCombo.includes(attack) &&
        attack !== this.currentAttack &&
        this.queuedAttack === null
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
    let attack: typeof KICK_COMBO[number];
    if (this.state === 'attack' && this.currentAttack) {
      const currentIndex = KICK_COMBO.indexOf(this.currentAttack as typeof KICK_COMBO[number]);
      attack = KICK_COMBO[(currentIndex + 1) % KICK_COMBO.length]!;
    } else {
      attack = KICK_COMBO[this.nextKickIndex]!;
    }
    const accepted = this.requestAttack(attack, true);
    if (accepted) this.nextKickIndex = (KICK_COMBO.indexOf(attack) + 1) % KICK_COMBO.length;
    return accepted;
  }

  requestSuper(): boolean {
    if (this.fury < 50) return false;
    if (!this.requestAttack(SUPER)) return false;
    this.fury -= 50;
    this.invulnerable = SUPER.startup + SUPER.active;
    return true;
  }

  requestDodge(direction: Vec2): boolean {
    if (this.dead || this.elevation > 0 || !['idle', 'walk', 'run', 'brake', 'block'].includes(this.state)) return false;
    const fallback = { x: this.facing, y: 0 };
    this.dodgeDirection = lengthSq(direction) > 0.01 ? normalize(direction) : fallback;
    this.runningDirection = 0;
    this.invulnerable = DODGE_DURATION;
    this.beginState('dodge', 'dodge');
    return true;
  }

  requestJump(): boolean {
    if (this.dead || this.elevation > 0 || !['idle', 'walk', 'run'].includes(this.state)) return false;
    const launchDirection = this.runningDirection !== 0 ? this.runningDirection : 0;
    this.airMomentumX = launchDirection * this.moveSpeed * RUN_MULTIPLIER * 0.94;
    this.runningDirection = 0;
    this.airVelocity = JUMP_VELOCITY;
    this.jumpElapsed = 0;
    this.jumpDuration = (JUMP_VELOCITY * 2) / JUMP_GRAVITY;
    this.elevation = 1;
    this.beginState('jump', 'jump');
    this.animator.fitDuration(this.jumpDuration);
    return true;
  }

  private startAerialAttack(attack: AttackData, forwardImpulse: number): boolean {
    if (this.dead || this.elevation < 18 || this.currentAttack !== null) return false;
    if (this.airMomentumX * this.facing < forwardImpulse) this.airMomentumX = this.facing * forwardImpulse;
    this.startAttack(attack);
    return true;
  }

  requestAirPunch(): boolean {
    return this.startAerialAttack(AIR_PUNCH, 390);
  }

  requestAirKick(): boolean {
    return this.startAerialAttack(AIR_KICK, 350);
  }

  requestAirAttack(): boolean {
    return this.requestAirKick();
  }

  beginGrab(target: Enemy): boolean {
    if (!this.canStartGrab || !target.beginGrabbed(this)) return false;
    this.grabbedTarget = target;
    const direction = target.position.x >= this.position.x ? 1 : -1;
    this.facing = direction;
    this.runningDirection = 0;
    this.position.x = target.position.x - direction * 52;
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
    this.jumpElapsed += dt;
    const steer = move.x * this.moveSpeed * 0.32;
    this.position.x += (this.airMomentumX + steer) * dt;
    this.position.y += move.y * this.depthSpeed * 0.58 * dt;
    this.airMomentumX *= Math.max(0, 1 - 0.22 * dt);
    this.airVelocity -= JUMP_GRAVITY * dt;
    this.elevation += this.airVelocity * dt;

    const aerialAttack = this.currentAttack === AIR_PUNCH || this.currentAttack === AIR_KICK
      ? this.currentAttack
      : null;
    if (aerialAttack) {
      this.attackElapsed += dt;
      if (this.attackElapsed >= attackTotal(aerialAttack)) {
        this.currentAttack = null;
        this.attackHits.clear();
        if (this.elevation > 0) {
          this.beginState('jump', 'jump');
          this.animator.seekNormalized(this.jumpElapsed / this.jumpDuration);
        }
      }
    } else if (this.elevation > 0 && this.animator.name === 'jump') {
      this.animator.seekNormalized(this.jumpElapsed / this.jumpDuration);
    }

    if (this.elevation <= 0 && this.airVelocity < 0) {
      this.elevation = 0;
      this.airVelocity = 0;
      this.landingMomentumX = this.airMomentumX * 0.32;
      this.airMomentumX = 0;
      this.currentAttack = null;
      this.attackHits.clear();
      this.beginState('land', 'land');
    }
    this.clampToPlayfield();
    this.syncVisual();
  }

  update(dt: number, input: Input, movementEnabled = true): void {
    this.updateCommon(dt);
    this.comboDisplayTimer = Math.max(0, this.comboDisplayTimer - dt);
    this.runTapWindow = Math.max(0, this.runTapWindow - dt);
    if (this.dead) return;
    if (this.state !== 'idle' && !this.animator.name.startsWith('idle_variant_')) this.idleStillTime = 0;

    if (this.state === 'hit') {
      if (this.animator.finished) this.beginState('idle', 'idle');
      this.clampToPlayfield(); this.syncVisual(); return;
    }
    if (this.state === 'knockdown') {
      if (this.animator.finished && this.elevation <= 0) this.beginState('getup', 'getup');
      this.clampToPlayfield(); this.syncVisual(); return;
    }
    if (this.state === 'getup') {
      if (this.animator.finished) this.beginState('idle', 'idle');
      this.clampToPlayfield(); this.syncVisual(); return;
    }
    if (this.state === 'land') {
      const recovery = Math.max(0, 1 - this.stateElapsed / 0.26);
      this.position.x += this.landingMomentumX * recovery * dt;
      this.landingMomentumX *= Math.max(0, 1 - 8 * dt);
      if (this.animator.finished) {
        this.landingMomentumX = 0;
        this.beginState('idle', 'idle');
      }
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
        const lunge: Record<string, number> = {
          punch_left: 86,
          punch_right: 108,
          combo_finisher: 132,
          kick_front: 88,
          kick_right: 102,
          kick_finisher: 126,
        };
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
    if (this.state === 'brake') {
      if (lengthSq(move) <= 0.01) {
        const progress = Math.min(1, this.stateElapsed / 0.32);
        this.position.x += this.facing * 92 * (1 - progress) * dt;
        if (this.animator.finished) this.beginState('idle', 'idle');
        this.clampToPlayfield(); this.syncVisual(); return;
      }
      this.beginState('idle', 'idle');
    }
    const wasRunning = this.state === 'run' && this.runningDirection !== 0;
    this.updateRunGesture(input, move.x);
    if (shouldStartRunBrake(wasRunning, this.runningDirection, lengthSq(move))) {
      this.beginState('brake', 'brake');
      this.clampToPlayfield(); this.syncVisual(); return;
    }
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
    if (moving) {
      this.idleStillTime = 0;
      this.animator.play(movementAnimation, false, preservesStride);
      const actualSpeed = Math.hypot(move.x * horizontalSpeed, move.y * depthSpeed);
      this.animator.setPlaybackRate(locomotionPlaybackRate(actualSpeed, this.animator.clip.referenceSpeed));
    } else {
      this.animator.setPlaybackRate(1);
      if (this.animator.name.startsWith('idle_variant_')) {
        if (this.animator.finished) {
          this.animator.play('idle', true);
          this.idleStillTime = 0;
        }
      } else {
        this.idleStillTime += dt;
        if (this.idleStillTime >= IDLE_VARIANT_DELAY) {
          const next = nextIdleVariant(this.idleVariants, this.idleVariantIndex);
          this.idleVariantIndex = next.nextIndex;
          if (next.name) this.animator.play(next.name, true);
          this.idleStillTime = 0;
        } else {
          this.animator.play('idle', false);
        }
      }
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

  receiveEnemyHit(damage: number, knockback: Vec2, knockdown: boolean, attackerX: number, launchVelocity = 0): PlayerHitResult {
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
    const result = this.receiveHit(damage, knockback, knockdown, launchVelocity);
    return { ...result, blocked: false, damageTaken: result.accepted ? damage : 0 };
  }

  override receiveHit(damage: number, knockback: Vec2, knockdown = false, launchVelocity = 0): HitResult {
    this.releaseGrab();
    this.elevation = 0;
    this.airVelocity = 0;
    this.airMomentumX = 0;
    this.landingMomentumX = 0;
    this.currentAttack = null;
    this.queuedAttack = null;
    return super.receiveHit(damage, knockback, knockdown, launchVelocity);
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
