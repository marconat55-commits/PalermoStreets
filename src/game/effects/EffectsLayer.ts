import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Vec2 } from '../types';

interface TimedEffect {
  root: Container;
  life: number;
  total: number;
  vx?: number;
  vy?: number;
}

export class EffectsLayer {
  readonly root = new Container();
  private readonly effects: TimedEffect[] = [];
  private readonly damageStyle = new TextStyle({
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: 24,
    fontWeight: '900',
    fill: 0xffe2a1,
    stroke: { color: 0x2b1111, width: 4 },
  });

  hitSpark(position: Vec2, heavy: boolean): void {
    const g = new Graphics();
    const radius = heavy ? 19 : 13;
    g.circle(0, 0, radius).fill({ color: heavy ? 0xffb134 : 0xffe0a0, alpha: 0.85 });
    g.circle(0, 0, radius * 0.48).fill({ color: 0xffffff, alpha: 0.95 });
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      g.moveTo(Math.cos(angle) * radius * 0.8, Math.sin(angle) * radius * 0.8)
        .lineTo(Math.cos(angle) * radius * 1.8, Math.sin(angle) * radius * 1.8)
        .stroke({ color: 0xffd05a, width: heavy ? 4 : 3, alpha: 0.9 });
    }
    g.position.set(position.x, position.y);
    this.root.addChild(g);
    this.effects.push({ root: g, life: 0.16, total: 0.16 });
  }

  damageText(position: Vec2, damage: number, heavy: boolean): void {
    const text = new Text({ text: `${damage}`, style: this.damageStyle });
    text.anchor.set(0.5);
    text.scale.set(heavy ? 1.15 : 1);
    text.position.set(position.x, position.y - 24);
    this.root.addChild(text);
    this.effects.push({ root: text, life: 0.62, total: 0.62, vx: (Math.random() - 0.5) * 28, vy: -48 });
  }

  landingDust(position: Vec2, heavy: boolean): void {
    const dust = new Graphics();
    const width = heavy ? 58 : 42;
    dust.ellipse(0, 0, width, heavy ? 10 : 7).fill({ color: 0xd9b98a, alpha: 0.34 });
    for (let index = 0; index < 7; index += 1) {
      const x = (index - 3) * (heavy ? 15 : 11);
      const radius = (index % 2 === 0 ? 6 : 4) * (heavy ? 1.2 : 1);
      dust.circle(x, -4 - (index % 3) * 3, radius).fill({ color: 0xe8cfaa, alpha: 0.42 });
    }
    dust.position.set(position.x, position.y);
    this.root.addChild(dust);
    this.effects.push({ root: dust, life: 0.24, total: 0.24, vy: -18 });
  }

  update(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const effect = this.effects[i]!;
      effect.life -= dt;
      effect.root.x += (effect.vx ?? 0) * dt;
      effect.root.y += (effect.vy ?? 0) * dt;
      effect.root.alpha = Math.max(0, effect.life / effect.total);
      if (effect.life <= 0) {
        effect.root.destroy({ children: true });
        this.effects.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const effect of this.effects) effect.root.destroy({ children: true });
    this.effects.length = 0;
  }
}
