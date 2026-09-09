import { Container, Graphics } from 'pixi.js';
import type { AmbientActorData, Vec2 } from '../types';
import { birdPoint, stableUnit } from './ambientMotion';

interface BirdInstance {
  root: Container;
  seed: number;
  spec: AmbientActorData;
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
  private elapsed = 0;

  configure(specs: AmbientActorData[]): void {
    this.root.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.birds = [];
    this.elapsed = 0;
    for (const spec of specs) {
      if (spec.enabled === false || spec.kind !== 'bird_flock') continue;
      for (let index = 0; index < spec.count; index += 1) {
        const seed = seedFromId(spec.id, index);
        const scale = (spec.scale ?? 1) * (0.72 + stableUnit(seed + 11) * 0.48);
        const root = new Container();
        root.addChild(birdGraphic(spec.color ?? 0x28231f, scale));
        root.alpha = 0.68 + stableUnit(seed + 19) * 0.25;
        this.root.addChild(root);
        this.birds.push({ root, seed, spec });
      }
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
  }

  destroy(): void {
    this.root.destroy({ children: true });
    this.birds = [];
  }
}
