import { Actor, type HitResult } from './Actor';
import type { AnimationBank, AttackData, Rect, Vec2 } from '../types';
import { FURY_MAX, PLAYER_JUMP_GRAVITY, PLAYER_JUMP_VELOCITY } from '../config';
import {
  AIR_KICK,
  AIR_PUNCH,
  ARCADE_COMBO,
  GRAB_STRIKE,
  KICK_COMBO,
  LIGHT_COMBO,
  RUN_ATTACK,
  SPIN_SPECIAL,
  SUPER,
  THROW,
  attackTotal,
} from '../combat/attacks';
import { lengthSq, normalize } from '../../utils/math';
import type { Input } from '../input/Input';
import { locomotionPlaybackRate, resolveCombatFacing, selectLocomotionClip } from '../animation/locomotion';
import { shouldStartRunBrake } from '../animation/movementTransitions';
import { updateRunGesture as advanceRunGesture } from '../animation/runGesture';
import { nextIdleVariant, orderedIdleVariants } from '../animation/idleVariants';
import type { Enemy } from './Enemy';

const RUN_MULTIPLIER = 1.55;
const RUN_TAP_WINDOW = 0.26;
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
  nextArcadeIndex = 0;
  comboCounter = 0;
  comboDisplayTimer = 0;
  autoTargetX: number | null = null;
  lastMove: Vec2 = { x: 1, y: 0 };
  grabbedTarget: Enemy | null = null;

  private runTapWindow = 0;
  private runTapDirection: Vec2 = { x: 0, y: 0 };
  private runningDirection: Vec2 = { x: 0, y: 0 };
  private brakeDirection: Vec2 = { x: 1, y: 0 };
  private airVelocity = 0;
  private airMomentum: Vec2 = { x: 0, y: 0 };
  private landingMomentum: Vec2 = { x: 0, y: 0 };
  private jumpElapsed = 0;
  private jumpDuration = (PLAYER_JUMP_VELOCITY * 2) / PLAYER_JUMP_GRAVITY;
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
    return lengthSq(this.runningDirection) > 0.01 && this.state === 'run';
  }

  private clearRun(): void {
    this.runningDirection = { x: 0, y: 0 };
    this.runTapWindow = 0;
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

  private requestAttack(attack: AttackData, chainable = false, requestedCombo?: readonly AttackData[]): boolean {
    if (this.dead || this.elevation > 0 || ['hit', 'knockdown', 'getup', 'block', 'grab'].includes(this.state)) return false;
    if (this.state === 'attack') {
      const currentCombo: readonly AttackData[] | null = requestedCombo ?? (this.currentAttack && LIGHT_COMBO.includes(this.currentAttack as typeof LIGHT_COMBO[number])
        ? LIGHT_COMBO
        : this.currentAttack && KICK_COMBO.includes(this.currentAttack as typeof KICK_COMBO[number])
          ? KICK_COMBO
          : null);
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
    this.clearRun();
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
    const accepted = this.requestAttack(attack, true, LIGHT_COMBO);
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
    const accepted = this.requestAttack(attack, true, KICK_COMBO);
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

  requestArcadeAttack(): boolean {
    if (this.isRunning) return this.requestAttack(RUN_ATTACK);
    let attack: typeof ARCADE_COMBO[number];
    if (this.state === 'attack' && this.currentAttack) {
      const currentIndex = ARCADE_COMBO.indexOf(this.currentAttack as typeof ARCADE_COMBO[number]);
      attack = ARCADE_COMBO[(currentIndex + 1) % ARCADE_COMBO.length]!;
    } else {
      attack = ARCADE_COMBO[this.nextArcadeIndex]!;
    }
    const accepted = this.requestAttack(attack, true, ARCADE_COMBO);
    if (accepted) this.nextArcadeIndex = (ARCADE_COMBO.indexOf(attack) + 1) % ARCADE_COMBO.length;
    return accepted;
  }

  requestSpinSpecial(): boolean {
    if (!this.requestAttack(SPIN_SPECIAL)) return false;
    this.invulnerable = SPIN_SPECIAL.startup + SPIN_SPECIAL.active;
    return true;
  }

  get isSpinSpecialActive(): boolean {
    return this.currentAttack === SPIN_SPECIAL
      && this.attackElapsed >= SPIN_SPECIAL.startup * 0.55
      && this.attackElapsed <= SPIN_SPECIAL.startup + SPIN_SPECIAL.active;
  }

  requestJump(): boolean {
    if (this.dead || this.elevation > 0 || !['idle', 'walk', 'run'].includes(this.state)) return false;
    const launchDirection = lengthSq(this.runningDirection) > 0.01
      ? normalize(this.runningDirection)
      : { x: 0, y: 0 };
    this.airMomentum = {
      x: launchDirection.x * this.moveSpeed * RUN_MULTIPLIER * 0.94,
      y: launchDirection.y * this.depthSpeed * RUN_MULTIPLIER * 0.94,
    };
    this.clearRun();
    this.airVelocity = PLAYER_JUMP_VELOCITY;
    this.jumpElapsed = 0;
    this.jumpDuration = (PLAYER_JUMP_VELOCITY * 2) / PLAYER_JUMP_GRAVITY;
    this.elevation = 1;
    this.beginState('jump', 'jump');
    this.animator.fitDuration(this.jumpDuration);
    return true;
  }

  private startAerialAttack(attack: AttackData, forwardImpulse: number): boolean {
    if (this.dead || this.elevation < 18 || this.currentAttack !== null) return false;
    if (this.airMomentum.x * this.facing < forwardImpulse) this.airMomentum.x = this.facing * forwardImpulse;
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
    this.clearRun();
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
    this.beginState('attack', attack.animation ?? attack.name);
    this.animator.fitDuration(attackTotal(attack));
  }

  private readMove(input: Input, movementEnabled: boolean): Vec2 {
    if (!movementEnabled) return { x: 0, y: 0 };
    const x = Number(input.isDown('ArrowRight')) - Number(input.isDown('ArrowLeft'));
    const y = Number(input.isDown('ArrowDown')) - Number(input.isDown('ArrowUp'));
    const raw = { x, y };
    return lengthSq(raw) > 1 ? normalize(raw) : raw;
  }

  private updateRunGesture(input: Input, movement: Vec2): void {
    const directionalPressed = input.wasPressed(
      'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp',
    );
    const next = advanceRunGesture({
      tapWindow: this.runTapWindow,
      tapDirection: this.runTapDirection,
      runningDirection: this.runningDirection,
    }, movement, directionalPressed, RUN_TAP_WINDOW);
    this.runTapWindow = next.tapWindow;
    this.runTapDirection = next.tapDirection;
    this.runningDirection = next.runningDirection;
  }

  private updateAirborne(dt: number, input: Input, movementEnabled: boolean): void {
    const move = this.readMove(input, movementEnabled);
    if (lengthSq(move) > 0.01) {
      this.lastMove = normalize(move);
      if (move.x !== 0) this.facing = move.x > 0 ? 1 : -1;
    }
    this.jumpElapsed += dt;
    const steer = {
      x: move.x * this.moveSpeed * 0.32,
      y: move.y * this.depthSpeed * 0.32,
    };
    this.position.x += (this.airMomentum.x + steer.x) * dt;
    this.position.y += (this.airMomentum.y + steer.y) * dt;
    const airDamping = Math.max(0, 1 - 0.22 * dt);
    this.airMomentum.x *= airDamping;
    this.airMomentum.y *= airDamping;
    this.airVelocity -= PLAYER_JUMP_GRAVITY * dt;
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
      this.landingMomentum = {
        x: this.airMomentum.x * 0.32,
        y: this.airMomentum.y * 0.32,
      };
      this.airMomentum = { x: 0, y: 0 };
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
      this.position.x += this.landingMomentum.x * recovery * dt;
      this.position.y += this.landingMomentum.y * recovery * dt;
      const landingDamping = Math.max(0, 1 - 8 * dt);
      this.landingMomentum.x *= landingDamping;
      this.landingMomentum.y *= landingDamping;
      if (this.animator.finished) {
        this.landingMomentum = { x: 0, y: 0 };
        this.beginState('idle', 'idle');
      }
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
      } else if (this.currentAttack === SPIN_SPECIAL) {
        if (this.attackElapsed >= SPIN_SPECIAL.startup * 0.55) this.position.x += this.facing * 520 * dt;
      } else if (![GRAB_STRIKE, THROW].includes(this.currentAttack) && this.attackElapsed < this.currentAttack.startup + this.currentAttack.active) {
        const lunge: Record<string, number> = {
          punch_left: 86,
          punch_right: 108,
          combo_kick: 112,
          combo_finisher: 132,
          kick_front: 88,
          kick_right: 102,
          kick_finisher: 126,
          run_attack: 260,
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

    const move = this.readMove(input, movementEnabled);
    if (this.state === 'brake') {
      if (lengthSq(move) <= 0.01) {
        const progress = Math.min(1, this.stateElapsed / 0.32);
        this.position.x += this.brakeDirection.x * 92 * (1 - progress) * dt;
        this.position.y += this.brakeDirection.y * 66 * (1 - progress) * dt;
        if (this.animator.finished) this.beginState('idle', 'idle');
        this.clampToPlayfield(); this.syncVisual(); return;
      }
      this.beginState('idle', 'idle');
    }
    const previousRunDirection = { ...this.runningDirection };
    const wasRunning = this.state === 'run' && lengthSq(previousRunDirection) > 0.01;
    this.updateRunGesture(input, move);
    const running = lengthSq(this.runningDirection) > 0.01;
    if (shouldStartRunBrake(wasRunning, running, lengthSq(move))) {
      this.brakeDirection = normalize(previousRunDirection);
      this.beginState('brake', 'brake');
      this.clampToPlayfield(); this.syncVisual(); return;
    }
    if (lengthSq(move) > 0.01) this.lastMove = normalize(move);
    const horizontalSpeed = this.moveSpeed * (running ? RUN_MULTIPLIER : 1);
    const depthSpeed = this.depthSpeed * (running ? RUN_MULTIPLIER : 1);
    this.position.x += move.x * horizontalSpeed * dt;
    this.position.y += move.y * depthSpeed * dt;
    const moving = lengthSq(move) > 0.01;
    if (moving) this.facing = resolveCombatFacing(this.facing, move);
    else this.faceAutoTarget();
    const directionalClip = selectLocomotionClip(move, this.animator.name, (name) => this.animator.bank.clips.has(name));
    const movementAnimation = running && this.animator.bank.clips.has('run') ? 'run' : directionalClip;
    const preservesStride = ['walk', 'run'].includes(this.animator.name);
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
    if (attack === SPIN_SPECIAL) {
      const feetY = this.position.y - this.elevation;
      const rearReach = attack.rangeX * 0.18;
      return {
        x: this.facing > 0 ? this.position.x - rearReach : this.position.x - attack.rangeX + rearReach,
        y: feetY - attack.rangeY * 0.72,
        width: attack.rangeX,
        height: attack.rangeY,
      };
    }
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
    this.clearRun();
    this.elevation = 0;
    this.airVelocity = 0;
    this.airMomentum = { x: 0, y: 0 };
    this.landingMomentum = { x: 0, y: 0 };
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
