import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Input } from '../input/Input';
import type { Scene } from './Scene';

const DISPLAY_FONT = 'Impact, Haettenschweiler, Arial Black, sans-serif';
const UI_FONT = 'Arial Black, Arial, sans-serif';

function centeredText(text: string, style: TextStyle, x: number, y: number): Text {
  const label = new Text({ text, style });
  label.anchor.set(0.5);
  label.position.set(x, y);
  return label;
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

  constructor() {
    const backdrop = new Graphics();
    const sky = [0x09142e, 0x101b3e, 0x1c2450, 0x35234c, 0x642637, 0xa33a28, 0xe66a27];
    for (let row = 0; row < sky.length; row += 1) {
      backdrop.rect(0, row * 76, 1280, 78).fill(sky[row]!);
    }
    backdrop.rect(0, 532, 1280, 188).fill(0x080c18);
    backdrop.circle(1060, 170, 132).fill({ color: 0xffc341, alpha: 0.92 });
    backdrop.circle(1060, 170, 93).fill({ color: 0xff7b27, alpha: 0.78 });

    // Skyline originale: geometria semplice, leggibile e leggera da renderizzare.
    const buildings = [
      [0, 350, 118, 196], [102, 302, 144, 244], [232, 377, 104, 169], [322, 328, 168, 218],
      [472, 385, 102, 161], [558, 288, 182, 258], [724, 348, 110, 198], [816, 310, 176, 236],
      [976, 370, 116, 176], [1076, 326, 204, 220],
    ] as const;
    for (const [x, y, width, height] of buildings) {
      backdrop.rect(x, y, width, height).fill(0x0b1123);
      for (let wx = x + 16; wx < x + width - 8; wx += 28) {
        for (let wy = y + 20; wy < y + height - 12; wy += 34) {
          if ((wx + wy) % 3 < 1.4) backdrop.rect(wx, wy, 8, 12).fill({ color: 0xffbd45, alpha: 0.48 });
        }
      }
    }
    backdrop.moveTo(0, 720).lineTo(488, 532).lineTo(792, 532).lineTo(1280, 720).fill(0x11172a);
    for (let lane = -4; lane <= 4; lane += 1) {
      const center = 640 + lane * 88;
      backdrop.moveTo(center - 8, 720).lineTo(640 + lane * 28 - 2, 532)
        .lineTo(640 + lane * 28 + 2, 532).lineTo(center + 8, 720)
        .fill({ color: lane % 2 === 0 ? 0x243050 : 0xf0a72d, alpha: lane % 2 === 0 ? 0.48 : 0.22 });
    }
    this.root.addChild(backdrop);

    const energy = new Graphics();
    energy.moveTo(-80, 132).lineTo(620, 55).lineTo(545, 114).lineTo(-80, 205).fill({ color: 0x17d7e8, alpha: 0.92 });
    energy.moveTo(1360, 326).lineTo(660, 396).lineTo(734, 338).lineTo(1360, 264).fill({ color: 0xffb21f, alpha: 0.92 });
    energy.moveTo(-100, 475).lineTo(540, 401).lineTo(476, 460).lineTo(-100, 535).fill({ color: 0xf04431, alpha: 0.72 });
    this.root.addChild(energy);

    const badge = new Graphics();
    badge.roundRect(465, 74, 350, 45, 8).fill(0x0a1023).stroke({ color: 0x35e1ee, width: 3 });
    this.root.addChild(badge);
    this.root.addChild(centeredText('PALERMO STREETS', new TextStyle({
      fontFamily: UI_FONT, fontSize: 22, fontWeight: '900', fill: 0xffffff, letterSpacing: 5,
    }), 640, 96));

    const titleStyle = new TextStyle({
      fontFamily: DISPLAY_FONT,
      fontSize: 112,
      fontWeight: '900',
      fontStyle: 'italic',
      fill: 0xffbd25,
      stroke: { color: 0x5f151d, width: 8 },
      letterSpacing: 2,
    });
    const shadowStyle = new TextStyle({
      ...titleStyle,
      fill: 0x090d1d,
      stroke: { color: 0x090d1d, width: 14 },
    });
    this.root.addChild(centeredText('MINCHIA', shadowStyle, 652, 206));
    this.root.addChild(centeredText('MINCHIA', titleStyle, 640, 194));

    const fightersShadow = centeredText('FIGHTERS', shadowStyle, 658, 315);
    fightersShadow.scale.set(1.12, 0.82);
    this.root.addChild(fightersShadow);
    const fighters = centeredText('FIGHTERS', new TextStyle({
      ...titleStyle,
      fill: 0xff5b32,
      stroke: { color: 0x52142b, width: 8 },
    }), 644, 301);
    fighters.scale.set(1.12, 0.82);
    this.root.addChild(fighters);

    const edition = new Graphics();
    edition.roundRect(466, 363, 348, 38, 19).fill(0x17cadb).stroke({ color: 0xffffff, width: 2 });
    this.root.addChild(edition);
    this.root.addChild(centeredText('PIXIJS ARCADE EDITION', new TextStyle({
      fontFamily: UI_FONT, fontSize: 17, fontWeight: '900', fill: 0x071127, letterSpacing: 3,
    }), 640, 382));

    this.promptPlate.roundRect(465, 444, 350, 68, 10)
      .fill({ color: 0x071020, alpha: 0.92 })
      .stroke({ color: 0xffd13b, width: 4 });
    this.root.addChild(this.promptPlate);
    this.prompt = centeredText('PREMI INVIO', new TextStyle({
      fontFamily: UI_FONT, fontSize: 28, fontWeight: '900', fill: 0xffffff, letterSpacing: 3,
    }), 640, 478);
    this.root.addChild(this.prompt);

    const controlsPlate = new Graphics();
    controlsPlate.roundRect(264, 552, 752, 104, 12).fill({ color: 0x050a16, alpha: 0.86 });
    controlsPlate.rect(286, 571, 4, 64).fill(0x19d8e6);
    controlsPlate.rect(990, 571, 4, 64).fill(0xffb62e);
    this.root.addChild(controlsPlate);
    this.root.addChild(centeredText(
      'WASD / FRECCE  MUOVI     J  PUGNO     I  CALCIO     L  SUPER\nP  PAUSA     F3  HITBOX     F11  FULLSCREEN     ESC  MENU',
      new TextStyle({ fontFamily: UI_FONT, fontSize: 16, fontWeight: '700', fill: 0xdcecff, align: 'center', lineHeight: 29 }),
      640,
      604,
    ));

    const loadingShade = new Graphics();
    loadingShade.rect(0, 0, 1280, 720).fill({ color: 0x030611, alpha: 0.76 });
    loadingShade.roundRect(390, 285, 500, 150, 14).fill(0x08132b).stroke({ color: 0x2bdce8, width: 4 });
    this.loadingGroup.addChild(loadingShade);
    this.loadingGroup.addChild(centeredText('CARICAMENTO', new TextStyle({
      fontFamily: DISPLAY_FONT, fontSize: 42, fontWeight: '900', fontStyle: 'italic', fill: 0xffbd2e,
      stroke: { color: 0x63152a, width: 5 }, letterSpacing: 3,
    }), 640, 335));
    this.loadingGroup.addChild(centeredText('PREPARAZIONE DELLO ZEN...', new TextStyle({
      fontFamily: UI_FONT, fontSize: 16, fontWeight: '700', fill: 0xcdeeff, letterSpacing: 2,
    }), 640, 380));
    const barTrack = new Graphics();
    barTrack.roundRect(470, 402, 340, 12, 6).fill(0x182443);
    this.loadingGroup.addChild(barTrack, this.loadingBar);
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
      const width = 96;
      const x = 470 + progress * (340 - width);
      this.loadingBar.clear().roundRect(x, 402, width, 12, 6).fill(0x28dce8);
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
