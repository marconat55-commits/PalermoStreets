import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Input } from '../input/Input';
import type { Scene } from './Scene';

export class TitleScene implements Scene {
  readonly root = new Container();
  startRequested = false;
  private elapsed = 0;
  private readonly prompt: Text;

  constructor() {
    const bg = new Graphics();
    bg.rect(0, 0, 1280, 720).fill(0x140a0d);
    bg.rect(0, 350, 1280, 370).fill(0x2c1317);
    this.root.addChild(bg);

    const title = new Text({
      text: 'MINCHIA FIGHTERS',
      style: new TextStyle({ fontFamily: 'Arial Black, Arial, sans-serif', fontSize: 62, fontWeight: '900', fill: 0xf69b1c }),
    });
    title.anchor.set(0.5);
    title.position.set(640, 210);
    this.root.addChild(title);

    const subtitle = new Text({
      text: 'PALERMO STREETS',
      style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 42, fontWeight: '700', fill: 0xece4d5 }),
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(640, 282);
    this.root.addChild(subtitle);

    const version = new Text({
      text: 'PIXIJS v8 PORT — MIGRATION BASELINE 0.1',
      style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 18, fill: 0xbeafa0 }),
    });
    version.anchor.set(0.5);
    version.position.set(640, 335);
    this.root.addChild(version);

    this.prompt = new Text({
      text: 'PREMI INVIO',
      style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 26, fontWeight: '700', fill: 0xffffff }),
    });
    this.prompt.anchor.set(0.5);
    this.prompt.position.set(640, 455);
    this.root.addChild(this.prompt);

    const controls = new Text({
      text: 'MOVIMENTO  WASD / FRECCE     J  PUGNO     I  CALCIO\nL  SUPERMOSSA\nP  PAUSA     F3  HITBOX     F11  SCHERMO INTERO     ESC  MENU',
      style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 18, fill: 0xcdc6bb, align: 'center', lineHeight: 30 }),
    });
    controls.anchor.set(0.5, 0);
    controls.position.set(640, 525);
    this.root.addChild(controls);
  }

  update(dt: number, input: Input): void {
    this.elapsed += dt;
    this.prompt.alpha = 0.68 + 0.32 * (0.5 + 0.5 * Math.sin(this.elapsed * 4));
    if (input.wasPressed('Enter', 'NumpadEnter')) this.startRequested = true;
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
