import { Container, Sprite } from 'pixi.js';
import { Animator } from '../animation/Animator';
import { PLAYFIELD } from '../config';
import type { AnimationBank, Rect, Vec2 } from '../types';
import { clamp } from '../../utils/math';
import { integrateHorizontalLaunch, integrateLaunch } from '../combat/knockdownPhysics';
import { clampFeetX, horizontalExtents } from '../animation/visualBounds';

let nextActorId = 1;

export interface HitResult {
  accepted: boolean;
  killed: boolean;
  knockedDown: boolean;
}

export class Actor {
  readonly actorId = nextActorId++;
  readonly root = new Container();
  readonly sprite = new Sprite();
  readonly transitionSprite = new Sprite();
  readonly outlineSprites: Sprite[] = [];
  readonly animator: Animator;
  readonly position: Vec2;
  velocity: Vec2 = { x: 0, y: 0 };
  maxHealth: number;
  health: number;
  readonly visualScale: number;
  facing: -1 | 1 = 1;
  state = 'idle';
  stateElapsed = 0;
  invulnerable = 0;
  hitFlash = 0;
  alpha255 = 255;
  elevation = 0;
  verticalVelocity = 0;
  landedThisFrame = false;
  landingImpact = 0;
  private remainingKnockdownBounces = 0;
  private playfieldBounds: { left: number; right: number; top: number; bottom: number } = { ...PLAYFIELD };
  private playfieldProfile?: (worldX: number) => [number, number];
  dead = false;
  removeReady = false;

  constructor(bank: AnimationBank, position: Vec2, maxHealth: number, visualScale = 1) {
    this.animator = new Animator(bank);
    this.position = { ...position };
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.visualScale = clamp(visualScale, 0.85, 1.15);

    this.root.sortableChildren = true;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const outline = new Sprite(this.animator.frame.texture);
      outline.anchor.set(0.5, 1);
      outline.tint = 0x181212;
      outline.alpha = 0.58;
      outline.position.set(dx, dy + this.animator.frame.offsetY);
      outline.zIndex = 0;
      this.outlineSprites.push(outline);
      this.root.addChild(outline);
    }
    this.transitionSprite.anchor.set(0.5, 1);
    this.transitionSprite.zIndex = 0.5;
    this.transitionSprite.visible = false;
    this.root.addChild(this.transitionSprite);
    this.sprite.texture = this.animator.frame.texture;
    this.sprite.anchor.set(0.5, 1);
    this.sprite.zIndex = 1;
    this.root.addChild(this.sprite);
    this.syncVisual(true);
  }

  get feet(): Vec2 {
    return this.position;
  }

  get collisionRadius(): Vec2 {
    if (this.state === 'knockdown' || this.state === 'dead') return { x: 60, y: 16 };
    if (this.state === 'getup') return { x: 38, y: 19 };
    return { x: 35, y: 21 };
  }

  get hurtbox(): Rect {
    let width = 58;
    let height = 142;
    if (this.state === 'knockdown' || this.state === 'dead') {
      width = 126;
      height = 46;
    } else if (this.state === 'getup') {
      width = 76;
      height = 102;
    }
    return {
      x: this.position.x - width / 2,
      y: this.position.y - this.elevation - height,
      width,
      height,
    };
  }

  get canBeHit(): boolean {
    return !this.dead && this.invulnerable <= 0 && !['knockdown', 'getup'].includes(this.state);
  }

  beginState(state: string, animation = state, restart = true): void {
    this.state = state;
    this.stateElapsed = 0;
    this.animator.setPlaybackRate(1);
    this.animator.play(animation, restart);
    this.syncVisual(true);
  }

  updateCommon(dt: number): void {
    this.landedThisFrame = false;
    this.landingImpact = 0;
    this.stateElapsed += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    const changed = this.animator.update(dt);
    const fallen = ['knockdown', 'dead'].includes(this.state);
    const launched = fallen && (this.verticalVelocity !== 0 || this.elevation > 0);
    if (fallen) {
      const horizontal = integrateHorizontalLaunch(this.position.x, this.velocity.x, dt, launched);
      this.position.x = horizontal.position;
      this.velocity.x = horizontal.velocity;
      this.position.y += this.velocity.y * dt;
      this.velocity.y *= Math.max(0, 1 - 3.8 * dt);
    } else {
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;
      const damping = Math.max(0, 1 - 8 * dt);
      this.velocity.x *= damping;
      this.velocity.y *= damping;
    }
    if (['knockdown', 'dead'].includes(this.state) && (this.verticalVelocity !== 0 || this.elevation > 0)) {
      const impactVelocity = Math.abs(this.verticalVelocity);
      const launch = integrateLaunch(this.elevation, this.verticalVelocity, dt);
      this.elevation = launch.elevation;
      this.verticalVelocity = launch.verticalVelocity;
      this.landedThisFrame = launch.landed;
      if (launch.landed) {
        this.landingImpact = impactVelocity;
        if (this.remainingKnockdownBounces > 0 && impactVelocity >= 285) {
          this.remainingKnockdownBounces -= 1;
          this.elevation = 1;
          this.verticalVelocity = impactVelocity * 0.31;
          this.velocity.x *= 0.74;
          this.velocity.y *= 0.58;
        } else {
          this.velocity.x *= 0.42;
          this.velocity.y *= 0.42;
        }
      }
    }
    this.syncVisual(changed);
  }

  clampToPlayfield(): void {
    const flip = this.facing === this.animator.sourceFacing ? 1 : -1;
    this.position.x = clampFeetX(
      this.position.x,
      this.animator.frame,
      flip,
      this.playfieldBounds.left,
      this.playfieldBounds.right,
      6,
      this.visualScale,
    );
    const profile = this.playfieldProfile?.(this.position.x);
    const top = profile ? Math.min(profile[0], profile[1]) : this.playfieldBounds.top;
    const bottom = profile ? Math.max(profile[0], profile[1]) : this.playfieldBounds.bottom;
    this.position.y = clamp(this.position.y, top, bottom);
  }

  setPlayfieldBounds(left: number, right: number, top: number = PLAYFIELD.top, bottom: number = PLAYFIELD.bottom): void {
    this.playfieldBounds = { left, right, top, bottom };
    this.clampToPlayfield();
  }

  setPlayfieldProfile(profile?: (worldX: number) => [number, number]): void {
    this.playfieldProfile = profile;
    this.clampToPlayfield();
  }

  visualHorizontalBounds(): { left: number; right: number } {
    const flip = this.facing === this.animator.sourceFacing ? 1 : -1;
    const extents = horizontalExtents(this.animator.frame, flip, this.visualScale);
    return { left: this.position.x + extents.left, right: this.position.x + extents.right };
  }

  receiveHit(damage: number, knockback: Vec2, knockdown = false, launchVelocity = 0): HitResult {
    if (!this.canBeHit) return { accepted: false, killed: false, knockedDown: false };
    this.health = Math.max(0, this.health - damage);
    this.hitFlash = 0.075;
    this.invulnerable = 0.12;
    this.velocity = { ...knockback };
    const killed = this.health <= 0;
    if (killed) {
      this.remainingKnockdownBounces = launchVelocity >= 560 ? 2 : launchVelocity >= 420 ? 1 : 0;
      this.elevation = launchVelocity > 0 ? 1 : 0;
      this.verticalVelocity = Math.max(0, launchVelocity);
      this.dead = true;
      this.beginState('dead', 'dead');
      this.invulnerable = 999;
      return { accepted: true, killed: true, knockedDown: true };
    }
    if (knockdown) {
      this.remainingKnockdownBounces = launchVelocity >= 560 ? 2 : launchVelocity >= 420 ? 1 : 0;
      this.elevation = launchVelocity > 0 ? 1 : 0;
      this.verticalVelocity = Math.max(0, launchVelocity);
      this.beginState('knockdown', 'knockdown');
      this.invulnerable = 0.55;
      return { accepted: true, killed: false, knockedDown: true };
    }
    this.remainingKnockdownBounces = 0;
    this.beginState('hit', 'hit');
    return { accepted: true, killed: false, knockedDown: false };
  }

  visualTop(): number {
    const frame = this.animator.frame;
    const [, top, , height] = frame.bounds;
    const scale = frame.scale * this.visualScale;
    const canvasBottom = this.position.y - this.elevation + frame.offsetY * this.visualScale;
    const canvasTop = canvasBottom - frame.height * scale;
    return height > 0 ? canvasTop + top * scale : canvasTop;
  }

  syncVisual(forceTexture = false): void {
    const frame = this.animator.frame;
    if (forceTexture || this.sprite.texture !== frame.texture) {
      this.sprite.texture = frame.texture;
      for (const outline of this.outlineSprites) outline.texture = frame.texture;
    }
    const flip = this.facing === this.animator.sourceFacing ? 1 : -1;
    const visualFrameScale = frame.scale * this.visualScale;
    this.sprite.scale.set(flip * visualFrameScale, visualFrameScale);
    this.sprite.x = frame.offsetX * visualFrameScale;
    this.sprite.y = frame.offsetY * this.visualScale;
    this.sprite.tint = this.hitFlash > 0 ? 0xffa08e : 0xffffff;
    const transition = this.animator.transitionFrame;
    if (transition) {
      const transitionFlip = this.facing === this.animator.transitionSourceFacing ? 1 : -1;
      this.transitionSprite.texture = transition.texture;
      const transitionScale = transition.scale * this.visualScale;
      this.transitionSprite.scale.set(transitionFlip * transitionScale, transitionScale);
      this.transitionSprite.position.set(transition.offsetX * transitionScale, transition.offsetY * this.visualScale);
      this.transitionSprite.alpha = this.animator.transitionAlpha;
      this.transitionSprite.tint = this.sprite.tint;
      this.transitionSprite.visible = true;
      this.sprite.alpha = 1 - this.animator.transitionAlpha;
    } else {
      this.transitionSprite.visible = false;
      this.sprite.alpha = 1;
    }
    for (let i = 0; i < this.outlineSprites.length; i += 1) {
      const outline = this.outlineSprites[i]!;
      const offsets: ReadonlyArray<readonly [number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      const [dx, dy] = offsets[i] ?? [0, 0];
      outline.scale.set(flip * visualFrameScale, visualFrameScale);
      outline.x = frame.offsetX * visualFrameScale + dx;
      outline.y = frame.offsetY * this.visualScale + dy;
      outline.alpha = 0.58 * this.sprite.alpha;
    }
    this.root.alpha = this.alpha255 / 255;
    this.root.position.set(this.position.x, this.position.y - this.elevation);
    this.root.zIndex = Math.round(this.position.y);
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
