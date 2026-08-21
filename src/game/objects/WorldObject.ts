import { Container, Sprite, type Texture } from 'pixi.js';
import type { Rect, StageItemDefinition, Vec2 } from '../types';

export type WorldObjectState = 'ground' | 'held' | 'thrown' | 'spent';

/** Visual-only multiplier: authored item sizes were too small beside a 290px actor. */
export const ITEM_VISUAL_SCALE = 1.5;

function visualScale(scale: number | undefined): number {
  return (scale ?? 0.065) * ITEM_VISUAL_SCALE;
}

export class WorldObject {
  readonly root = new Container();
  readonly sprite: Sprite;
  readonly definition: StageItemDefinition;
  readonly hitActors = new Set<number>();
  state: WorldObjectState = 'ground';
  position: Vec2;
  elevation = 0;
  velocity: Vec2 = { x: 0, y: 0 };
  verticalVelocity = 0;
  durability: number;

  constructor(definition: StageItemDefinition, texture: Texture, position: Vec2) {
    this.definition = definition;
    this.durability = definition.durability ?? 1;
    this.position = { ...position };
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.scale.set(visualScale(definition.world_scale));
    this.root.addChild(this.sprite);
    this.sync();
  }

  pickup(): void {
    this.state = 'held';
    this.velocity = { x: 0, y: 0 };
    this.elevation = 0;
    this.sprite.scale.set(visualScale(this.definition.held_scale ?? this.definition.world_scale));
  }

  holdAt(position: Vec2, facing: -1 | 1, useProgress = 0): void {
    const swing = Math.sin(Math.max(0, Math.min(1, useProgress)) * Math.PI) * 1.25;
    this.position = { x: position.x + facing * (34 + swing * 18), y: position.y - 91 + swing * 9 };
    this.sprite.rotation = facing * ((this.definition.held_angle ?? -0.72) + swing);
    this.sprite.scale.x = Math.abs(this.sprite.scale.x) * facing;
    this.sync();
    this.root.zIndex = position.y + 2;
  }

  throwFrom(position: Vec2, facing: -1 | 1): void {
    this.state = 'thrown';
    this.position = { x: position.x + facing * 38, y: position.y - 12 };
    this.elevation = 86;
    this.velocity = { x: facing * (this.definition.throw_speed ?? 610), y: 0 };
    this.verticalVelocity = 250;
    this.sprite.rotation = 0;
    this.sprite.scale.x = Math.abs(this.sprite.scale.x);
    this.hitActors.clear();
    this.sync();
  }

  dropAt(position: Vec2, facing: -1 | 1): void {
    this.state = 'ground';
    this.position = { x: position.x + facing * 42, y: position.y };
    this.elevation = 0;
    this.velocity = { x: 0, y: 0 };
    this.verticalVelocity = 0;
    this.sprite.rotation = 0;
    this.sprite.scale.set(visualScale(this.definition.world_scale));
    this.root.visible = true;
    this.sync();
  }

  get hurtbox(): Rect {
    return { x: this.position.x - 44, y: this.position.y - 96, width: 88, height: 96 };
  }

  hitBreakable(damage = 1): boolean {
    if (this.definition.kind !== 'breakable' || this.state !== 'ground') return false;
    this.durability -= damage;
    if (this.durability > 0) return false;
    this.state = 'spent';
    this.root.visible = false;
    return true;
  }

  update(dt: number): void {
    if (this.state !== 'thrown') return;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.elevation += this.verticalVelocity * dt;
    this.verticalVelocity -= 760 * dt;
    this.sprite.rotation += Math.sign(this.velocity.x) * 9 * dt;
    if (this.elevation <= 0 && this.verticalVelocity < 0) {
      this.elevation = 0;
      this.state = 'spent';
      this.root.visible = false;
    }
    this.sync();
  }

  private sync(): void {
    this.root.position.set(this.position.x, this.position.y - this.elevation);
    this.root.zIndex = this.position.y;
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
