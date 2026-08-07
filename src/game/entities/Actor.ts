import { Container, Sprite } from 'pixi.js';
import { Animator } from '../animation/Animator';
import { PLAYFIELD } from '../config';
import type { AnimationBank, Rect, Vec2 } from '../types';
import { clamp } from '../../utils/math';

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
  readonly outlineSprites: Sprite[] = [];
  readonly animator: Animator;
  readonly position: Vec2;
  velocity: Vec2 = { x: 0, y: 0 };
  maxHealth: number;
  health: number;
  facing: -1 | 1 = 1;
  state = 'idle';
  stateElapsed = 0;
  invulnerable = 0;
  hitFlash = 0;
  alpha255 = 255;
  elevation = 0;
  dead = false;
  removeReady = false;

  constructor(bank: AnimationBank, position: Vec2, maxHealth: number) {
    this.animator = new Animator(bank);
    this.position = { ...position };
    this.maxHealth = maxHealth;
    this.health = maxHealth;

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
    this.stateElapsed += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    const changed = this.animator.update(dt);
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    const damping = Math.max(0, 1 - 8 * dt);
    this.velocity.x *= damping;
    this.velocity.y *= damping;
    this.syncVisual(changed);
  }

  clampToPlayfield(): void {
    this.position.x = clamp(this.position.x, PLAYFIELD.left, PLAYFIELD.right);
    this.position.y = clamp(this.position.y, PLAYFIELD.top, PLAYFIELD.bottom);
  }

  receiveHit(damage: number, knockback: Vec2, knockdown = false): HitResult {
    if (!this.canBeHit) return { accepted: false, killed: false, knockedDown: false };
    this.health = Math.max(0, this.health - damage);
    this.hitFlash = 0.075;
    this.invulnerable = 0.12;
    this.velocity = { ...knockback };
    const killed = this.health <= 0;
    if (killed) {
      this.dead = true;
      this.beginState('dead', 'dead');
      this.invulnerable = 999;
      return { accepted: true, killed: true, knockedDown: true };
    }
    if (knockdown) {
      this.beginState('knockdown', 'knockdown');
      this.invulnerable = 0.55;
      return { accepted: true, killed: false, knockedDown: true };
    }
    this.beginState('hit', 'hit');
    return { accepted: true, killed: false, knockedDown: false };
  }

  visualTop(): number {
    const frame = this.animator.frame;
    const [, top, , height] = frame.bounds;
    const canvasBottom = this.position.y - this.elevation + frame.offsetY;
    const canvasTop = canvasBottom - frame.height;
    return height > 0 ? canvasTop + top : canvasTop;
  }

  syncVisual(forceTexture = false): void {
    const frame = this.animator.frame;
    if (forceTexture || this.sprite.texture !== frame.texture) {
      this.sprite.texture = frame.texture;
      for (const outline of this.outlineSprites) outline.texture = frame.texture;
    }
    const flip = this.facing === this.animator.sourceFacing ? 1 : -1;
    const renderScaleX = frame.renderScaleX ?? 1;
    this.sprite.scale.x = flip * renderScaleX;
    this.sprite.y = frame.offsetY;
    this.sprite.tint = this.hitFlash > 0 ? 0xffa08e : 0xffffff;
    for (let i = 0; i < this.outlineSprites.length; i += 1) {
      const outline = this.outlineSprites[i]!;
      const offsets: ReadonlyArray<readonly [number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      const [dx, dy] = offsets[i] ?? [0, 0];
      outline.scale.x = flip * renderScaleX;
      outline.x = dx;
      outline.y = frame.offsetY + dy;
    }
    this.root.alpha = this.alpha255 / 255;
    this.root.position.set(this.position.x, this.position.y - this.elevation);
    this.root.zIndex = Math.round(this.position.y);
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
