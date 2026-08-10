import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { Input } from '../input/Input';
import type { Scene } from './Scene';

const DISPLAY_FONT = 'Impact, Haettenschweiler, Arial Black, sans-serif';
const UI_FONT = 'Arial Black, Arial, sans-serif';

function centeredText(text: string, style: TextStyle, x: number, y: number): Text {
  const value = new Text({ text, style });
  value.anchor.set(0.5);
  value.position.set(x, y);
  return value;
}

function logoLayer(text: string, size: number, fill: number, stroke: number, strokeWidth: number, x: number, y: number): Text {
  const value = centeredText(text, new TextStyle({
    fontFamily: DISPLAY_FONT,
    fontSize: size,
    fontWeight: '900',
    fontStyle: 'italic',
    fill,
    stroke: { color: stroke, width: strokeWidth },
    letterSpacing: 2,
  }), x, y);
  value.skew.x = -0.08;
  return value;
}

export class TitleScene implements Scene {
  readonly root = new Container();
  startRequested = false;
  private elapsed = 0;
  private loading = false;
  private readonly prompt: Text;
  private readonly promptPlate = new Graphics();
  private readonly loadingGroup = new Container();
  private readonly loadingBar = new Graphics();

  constructor(backgroundTexture: Texture) {
    const background = new Sprite(backgroundTexture);
    background.width = 1280;
    background.height = 720;
    this.root.addChild(background);

    const grade = new Graphics();
    grade.rect(0, 0, 1280, 720).fill({ color: 0x120400, alpha: 0.18 });
    grade.rect(0, 0, 1280, 88).fill({ color: 0x000000, alpha: 0.64 });
    grade.rect(0, 628, 1280, 92).fill({ color: 0x000000, alpha: 0.70 });
    grade.rect(0, 0, 180, 720).fill({ color: 0x000000, alpha: 0.38 });
    grade.rect(1100, 0, 180, 720).fill({ color: 0x000000, alpha: 0.38 });
    this.root.addChild(grade);

    const crest = new Graphics();
    crest.moveTo(640, 62).lineTo(910, 112).lineTo(820, 132).lineTo(640, 100)
      .lineTo(460, 132).lineTo(370, 112).closePath().fill({ color: 0xc51d0d, alpha: 0.92 });
    crest.moveTo(395, 118).lineTo(885, 118).stroke({ color: 0xffad18, width: 5, alpha: 0.9 });
    this.root.addChild(crest);
    this.root.addChild(centeredText('PALERMO STREETS', new TextStyle({
      fontFamily: UI_FONT, fontSize: 19, fontWeight: '900', fill: 0xffefbd, letterSpacing: 7,
      stroke: { color: 0x250600, width: 4 },
    }), 640, 93));

    this.root.addChild(logoLayer('MINCHIA', 142, 0x160300, 0x160300, 18, 653, 226));
    this.root.addChild(logoLayer('MINCHIA', 142, 0xffc126, 0x5b0800, 10, 640, 212));
    this.root.addChild(logoLayer('FIGHTERS', 154, 0x140200, 0x140200, 20, 655, 356));
    const fighters = logoLayer('FIGHTERS', 154, 0xf02a12, 0x641000, 11, 640, 340);
    fighters.scale.x = 1.08;
    this.root.addChild(fighters);

    const slash = new Graphics();
    slash.moveTo(286, 428).lineTo(1008, 405).lineTo(944, 430).lineTo(330, 454).closePath()
      .fill({ color: 0xd1170d, alpha: 0.96 });
    slash.moveTo(322, 451).lineTo(950, 428).stroke({ color: 0xff9d16, width: 3 });
    this.root.addChild(slash);
    this.root.addChild(centeredText('SCHIAFFI, CALCI E SENTIMENTI', new TextStyle({
      fontFamily: DISPLAY_FONT, fontSize: 37, fontWeight: '900', fontStyle: 'italic', fill: 0xfff0d2,
      stroke: { color: 0x1c0500, width: 7 }, letterSpacing: 2,
    }), 640, 423));

    this.promptPlate.roundRect(394, 505, 492, 96, 14)
      .fill({ color: 0x170602, alpha: 0.92 })
      .stroke({ color: 0xff3c0d, width: 10, alpha: 0.34 });
    this.promptPlate.roundRect(403, 514, 474, 78, 10)
      .stroke({ color: 0xffa312, width: 4 });
    this.root.addChild(this.promptPlate);
    this.prompt = centeredText('PREMI INVIO', new TextStyle({
      fontFamily: DISPLAY_FONT, fontSize: 48, fontWeight: '900', fontStyle: 'italic', fill: 0xffc22b,
      stroke: { color: 0x641000, width: 6 }, letterSpacing: 3,
    }), 640, 553);
    this.root.addChild(this.prompt);

    this.root.addChild(centeredText(
      'FRECCE MUOVI   J ATTACCA   K SALTA   DOPPIA DIREZIONE + J ATTACCO IN CORSA   J+K SPECIALE',
      new TextStyle({ fontFamily: UI_FONT, fontSize: 13, fontWeight: '700', fill: 0xe8cda9, letterSpacing: 0.6 }),
      640,
      672,
    ));

    const loadingShade = new Graphics();
    loadingShade.rect(0, 0, 1280, 720).fill({ color: 0x050100, alpha: 0.82 });
    loadingShade.roundRect(385, 278, 510, 164, 14).fill(0x160704).stroke({ color: 0xffa217, width: 4 });
    this.loadingGroup.addChild(loadingShade);
    this.loadingGroup.addChild(centeredText('CARICAMENTO', new TextStyle({
      fontFamily: DISPLAY_FONT, fontSize: 46, fontWeight: '900', fontStyle: 'italic', fill: 0xffc127,
      stroke: { color: 0x5b0800, width: 6 }, letterSpacing: 3,
    }), 640, 330));
    this.loadingGroup.addChild(centeredText('PREPARAZIONE DELLO ZEN...', new TextStyle({
      fontFamily: UI_FONT, fontSize: 16, fontWeight: '700', fill: 0xf2d9b5, letterSpacing: 2,
    }), 640, 378));
    const track = new Graphics();
    track.roundRect(470, 402, 340, 12, 6).fill(0x3b160c);
    this.loadingGroup.addChild(track, this.loadingBar);
    this.loadingGroup.visible = false;
    this.root.addChild(this.loadingGroup);
  }

  setLoading(value: boolean): void {
    this.loading = value;
    this.loadingGroup.visible = value;
    this.prompt.visible = !value;
    this.promptPlate.visible = !value;
  }

  update(dt: number, input: Input): void {
    this.elapsed += dt;
    if (this.loading) {
      const progress = (this.elapsed * 0.72) % 1;
      this.loadingBar.clear().roundRect(470 + progress * 244, 402, 96, 12, 6).fill(0xff9d16);
      return;
    }
    const pulse = 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(this.elapsed * 5));
    this.prompt.alpha = pulse;
    this.promptPlate.alpha = 0.84 + 0.16 * pulse;
    if (input.wasPressed('Enter', 'NumpadEnter')) this.startRequested = true;
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
