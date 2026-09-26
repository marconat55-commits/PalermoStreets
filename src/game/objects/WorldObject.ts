import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { Rect, StageItemDefinition, Vec2 } from '../types';

export type WorldObjectState = 'ground' | 'held' | 'thrown' | 'spent';

export interface WorldObjectTextures {
  damaged?: Texture;
  broken?: Texture;
  debris?: Texture;
}

/** Visual-only multiplier: authored item sizes were too small beside a 290px actor. */
export const ITEM_VISUAL_SCALE = 1.5;
export const ITEM_SIZE_REDUCTION = 0.9;

export function itemSizeMultiplier(itemId: string): number {
  return itemId === 'arancina' ? 1 : ITEM_SIZE_REDUCTION;
}

function visualScale(itemId: string, scale: number | undefined, multiplier = 1, compensation = 1): number {
  return (scale ?? 0.065) * ITEM_VISUAL_SCALE * multiplier * itemSizeMultiplier(itemId) * compensation;
}

export class WorldObject {
  readonly root = new Container();
  readonly sprite: Sprite;
  readonly definition: StageItemDefinition;
  readonly groupId: string | null;
  readonly hitActors = new Set<number>();
  state: WorldObjectState = 'ground';
  position: Vec2;
  elevation = 0;
  velocity: Vec2 = { x: 0, y: 0 };
  verticalVelocity = 0;
  durability: number;
  private textures: WorldObjectTextures;
  private breakTimer = 0;
  private debrisShown = false;
  private readonly sparkle = new Graphics();
  private sparkleTime = 0;

  constructor(definition: StageItemDefinition, texture: Texture, position: Vec2, textures: WorldObjectTextures = {}, groupId: string | null = null) {
    this.definition = definition;
    this.groupId = groupId;
    this.durability = definition.durability ?? 1;
    this.position = { ...position };
    this.textures = textures;
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.scale.set(visualScale(definition.id, definition.world_scale, definition.visual_scale_multiplier, definition.runtime_scale_compensation));
    this.root.addChild(this.sprite);
    if (definition.kind === 'food') this.root.addChild(this.sparkle);
    this.sync();
  }

  setSupplementalTextures(textures: WorldObjectTextures): void {
    this.textures = { ...this.textures, ...textures };
  }

  pickup(): void {
    this.state = 'held';
    this.velocity = { x: 0, y: 0 };
    this.elevation = 0;
    this.sprite.scale.set(visualScale(
      this.definition.id,
      this.definition.held_scale ?? this.definition.world_scale,
      this.definition.visual_scale_multiplier,
      this.definition.runtime_scale_compensation,
    ));
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
    this.elevation = this.definition.throw_elevation ?? 86;
    this.velocity = { x: facing * (this.definition.throw_speed ?? 610), y: 0 };
    this.verticalVelocity = this.definition.throw_vertical_speed ?? 250;
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
    this.sprite.scale.set(visualScale(
      this.definition.id,
      this.definition.world_scale,
      this.definition.visual_scale_multiplier,
      this.definition.runtime_scale_compensation,
    ));
    this.root.visible = true;
    this.sync();
  }

  get hurtbox(): Rect {
    return { x: this.position.x - 44, y: this.position.y - 96, width: 88, height: 96 };
  }

  hitBreakable(damage = 1): boolean {
    if (this.definition.kind !== 'breakable' || this.state !== 'ground') return false;
    this.durability -= damage;
    if (this.durability > 0) {
      if (this.textures.damaged) this.sprite.texture = this.textures.damaged;
      return false;
    }
    this.state = 'spent';
    if (this.textures.broken) {
      this.sprite.texture = this.textures.broken;
      this.breakTimer = this.textures.debris ? 0.72 : 1.0;
      this.root.visible = true;
    } else {
      this.root.visible = false;
    }
    return true;
  }

  update(dt: number): void {
    if (this.definition.kind === 'food' && this.state === 'ground') {
      this.sparkleTime = (this.sparkleTime + dt) % 3.6;
      this.sparkle.clear();
      if (this.sparkleTime < 0.5) {
        const opacity = Math.sin(Math.PI * this.sparkleTime / 0.5);
        for (const [x, y, radius] of [[-14, -49, 8], [11, -63, 5]] as const) {
          this.sparkle.moveTo(x - radius, y).lineTo(x + radius, y)
            .moveTo(x, y - radius).lineTo(x, y + radius)
            .stroke({ color: 0xffe38b, width: 2.5, alpha: opacity });
          this.sparkle.circle(x, y, 2).fill({ color: 0xffffff, alpha: opacity });
        }
      }
    }
    if (this.state === 'spent' && this.breakTimer > 0) {
      this.breakTimer = Math.max(0, this.breakTimer - dt);
      if (this.textures.debris && !this.debrisShown && this.breakTimer <= 0.42) {
        this.sprite.texture = this.textures.debris;
        this.debrisShown = true;
      }
      if (this.breakTimer <= 0) this.root.visible = false;
      return;
    }
    if (this.state !== 'thrown') return;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.elevation += this.verticalVelocity * dt;
    this.verticalVelocity -= (this.definition.throw_gravity ?? 760) * dt;
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
