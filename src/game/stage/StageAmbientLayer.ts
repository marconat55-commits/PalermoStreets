import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { AmbientActorData, SpriteLoopAmbientActorData, Vec2 } from '../types';
import { frameAtTime } from './ambientAssets';

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

function stableUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export class StageAmbientLayer {
  readonly root = new Container();
  private spriteLoops: SpriteLoopInstance[] = [];
  private elapsed = 0;

  configure(specs: AmbientActorData[], textureMap: ReadonlyMap<string, Texture> = new Map()): void {
    this.root.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.spriteLoops = [];
    this.elapsed = 0;
    for (const spec of specs) {
      if (spec.enabled === false) continue;
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
    this.spriteLoops = [];
  }
}
