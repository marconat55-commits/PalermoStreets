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
  root: Container;
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
    .moveTo(-17 * scale, 3 * scale)
    .quadraticCurveTo(-11 * scale, -7 * scale, -2 * scale, -1 * scale)
    .lineTo(0, 1.5 * scale)
    .lineTo(2 * scale, -1 * scale)
    .quadraticCurveTo(11 * scale, -7 * scale, 17 * scale, 3 * scale)
    .quadraticCurveTo(10 * scale, 0, 2 * scale, 3 * scale)
    .lineTo(-2 * scale, 3 * scale)
    .quadraticCurveTo(-10 * scale, 0, -17 * scale, 3 * scale)
    .closePath()
    .fill({ color, alpha: 0.94 })
    .stroke({ color: 0x45423d, width: Math.max(0.9, 1.15 * scale), alpha: 0.82 })
    .ellipse(0, 2.2 * scale, 4.2 * scale, 1.8 * scale)
    .fill({ color: 0x5b5751, alpha: 0.9 });
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
          root.alpha = 0.82 + stableUnit(seed + 19) * 0.14;
          this.root.addChild(root);
          this.birds.push({ root, seed, spec });
        }
        continue;
      }
      const textures = spec.frames.map((path) => textureMap.get(path));
      if (textures.some((texture) => !texture)) throw new Error(`${spec.id}: frame ambientale non caricato`);
      const sprite = new Sprite(textures[0]!);
      const anchor = spec.anchor ?? [0.5, 1];
      sprite.anchor.set(...anchor);
      sprite.width = spec.size[0];
      sprite.height = spec.size[1];
      sprite.alpha = spec.alpha ?? 1;
      const root = new Container();
      if (spec.motion_window) {
        const shell = new Sprite(textures[0]!);
        shell.anchor.set(...anchor);
        shell.width = spec.size[0];
        shell.height = spec.size[1];
        shell.alpha = spec.alpha ?? 1;
        const [x, y, width, height] = spec.motion_window;
        const mask = new Graphics()
          .rect(-anchor[0] * spec.size[0] + x, -anchor[1] * spec.size[1] + y, width, height)
          .fill(0xffffff);
        sprite.mask = mask;
        root.addChild(shell, sprite, mask);
      } else {
        root.addChild(sprite);
      }
      this.root.addChild(root);
      const cycle = spec.frame_durations.reduce((sum, duration) => sum + Math.max(0.05, duration), 0);
      this.spriteLoops.push({ root, sprite, spec, textures: textures as Texture[], phase: stableUnit(seedFromId(spec.id, 0)) * cycle });
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
      loop.root.position.set(
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
