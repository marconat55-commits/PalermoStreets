import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { AmbientActorData, BirdFlockAmbientActorData, SpriteLoopAmbientActorData, Vec2 } from '../types';
import { birdPoint, stableUnit } from './ambientMotion';
import { frameAtTime } from './ambientAssets';

interface BirdInstance {
  root: Container;
  seed: number;
  spec: BirdFlockAmbientActorData;
}

interface SpriteLoopInstance {
  sprite: Sprite;
  spec: SpriteLoopAmbientActorData;
  textures: Texture[];
  phase: number;
}

function seedFromId(id: string, index: number): number {
  let seed = 2166136261;
  for (const character of `${id}:${index}`) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return (seed >>> 0) / 65536;
}

function birdGraphic(color: number, scale: number): Graphics {
  return new Graphics()
    .moveTo(-11 * scale, 2 * scale)
    .quadraticCurveTo(-6 * scale, -4 * scale, 0, 0)
    .quadraticCurveTo(6 * scale, -4 * scale, 11 * scale, 2 * scale)
    .stroke({ color, width: Math.max(1.2, 1.8 * scale), alpha: 0.86 });
}

export class StageAmbientLayer {
  readonly root = new Container();
  private birds: BirdInstance[] = [];
  private spriteLoops: SpriteLoopInstance[] = [];
  private elapsed = 0;

  configure(specs: AmbientActorData[], textureMap: ReadonlyMap<string, Texture> = new Map()): void {
    this.root.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.birds = [];
    this.spriteLoops = [];
    this.elapsed = 0;
    for (const spec of specs) {
      if (spec.enabled === false) continue;
      if (spec.kind === 'bird_flock') {
        for (let index = 0; index < spec.count; index += 1) {
          const seed = seedFromId(spec.id, index);
          const scale = (spec.scale ?? 1) * (0.72 + stableUnit(seed + 11) * 0.48);
          const root = new Container();
          root.addChild(birdGraphic(spec.color ?? 0x28231f, scale));
          root.alpha = 0.68 + stableUnit(seed + 19) * 0.25;
          this.root.addChild(root);
          this.birds.push({ root, seed, spec });
        }
        continue;
      }
      const textures = spec.frames.map((path) => textureMap.get(path));
      if (textures.some((texture) => !texture)) throw new Error(`${spec.id}: frame ambientale non caricato`);
      const sprite = new Sprite(textures[0]!);
      sprite.anchor.set(...(spec.anchor ?? [0.5, 1]));
      sprite.width = spec.size[0];
      sprite.height = spec.size[1];
      sprite.alpha = spec.alpha ?? 1;
      this.root.addChild(sprite);
      const cycle = spec.frame_durations.reduce((sum, duration) => sum + Math.max(0.05, duration), 0);
      this.spriteLoops.push({ sprite, spec, textures: textures as Texture[], phase: stableUnit(seedFromId(spec.id, 0)) * cycle });
    }
  }

  update(dt: number, cameraX: number, shake: Vec2): void {
    this.elapsed += Math.max(0, dt);
    for (const bird of this.birds) {
      const point = birdPoint(this.elapsed, bird.seed, bird.spec.bounds, bird.spec.speed);
      bird.root.position.set(
        point.x - cameraX * bird.spec.parallax + shake.x * bird.spec.parallax,
        point.y + shake.y * bird.spec.parallax,
      );
      bird.root.scale.y = 0.58 + Math.abs(point.flap) * 0.62;
      bird.root.rotation = Math.sin(this.elapsed * 0.65 + bird.seed) * 0.035;
    }
    for (const loop of this.spriteLoops) {
      const frameIndex = frameAtTime(loop.spec.frame_durations, this.elapsed + loop.phase);
      loop.sprite.texture = loop.textures[frameIndex] ?? loop.textures[0]!;
      loop.sprite.position.set(
        loop.spec.position[0] - cameraX * loop.spec.parallax + shake.x * loop.spec.parallax,
        loop.spec.position[1] + shake.y * loop.spec.parallax,
      );
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
    this.birds = [];
    this.spriteLoops = [];
  }
}
