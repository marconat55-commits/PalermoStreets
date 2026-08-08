import { Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { Input } from '../input/Input';
import { publicUrl } from '../data/paths';
import type { Scene } from './Scene';

const DISPLAY_FONT = 'Impact, Haettenschweiler, Arial Black, sans-serif';
const UI_FONT = 'Arial Black, Arial, sans-serif';

function label(text: string, style: TextStyle, x: number, y: number, anchorX = 0): Text {
  const value = new Text({ text, style });
  value.anchor.set(anchorX, 0.5);
  value.position.set(x, y);
  return value;
}

export class CharacterSelectScene implements Scene {
  readonly root = new Container();
  confirmRequested = false;
  private elapsed = 0;
  private loading = false;
  private readonly selectionFrame = new Graphics();
  private readonly confirmPrompt: Text;
  private readonly loadingGroup = new Container();
  private readonly loadingBar = new Graphics();

  static async create(): Promise<CharacterSelectScene> {
    const portrait = await Assets.load<Texture>(publicUrl('assets/ui/character_select/marco_portrait.png'));
    return new CharacterSelectScene(portrait);
  }

  private constructor(portraitTexture: Texture) {
    const background = new Graphics();
    background.rect(0, 0, 1280, 720).fill(0x060914);
    for (let index = -2; index < 12; index += 1) {
      const x = index * 158;
      background.moveTo(x, 0).lineTo(x + 260, 0).lineTo(x - 42, 720).lineTo(x - 302, 720)
        .fill({ color: index % 3 === 0 ? 0xb51f35 : index % 3 === 1 ? 0x0c7590 : 0x172240, alpha: 0.34 });
    }
    background.moveTo(0, 595).lineTo(1280, 432).lineTo(1280, 720).lineTo(0, 720).fill(0xd8432e);
    background.moveTo(0, 630).lineTo(1280, 498).lineTo(1280, 720).lineTo(0, 720).fill(0xf6ad22);
    background.moveTo(0, 672).lineTo(1280, 548).lineTo(1280, 720).lineTo(0, 720).fill(0x09152c);
    this.root.addChild(background);

    const dots = new Graphics();
    for (let y = 18; y < 700; y += 22) {
      for (let x = 18; x < 1260; x += 22) {
        if ((x + y) % 5 < 2) dots.circle(x, y, 2.1).fill({ color: 0xffffff, alpha: 0.065 });
      }
    }
    this.root.addChild(dots);

    const header = new Graphics();
    header.moveTo(0, 0).lineTo(922, 0).lineTo(850, 106).lineTo(0, 106).fill(0x101a37);
    header.moveTo(0, 88).lineTo(875, 88).lineTo(848, 106).lineTo(0, 106).fill(0x20c8d8);
    this.root.addChild(header);
    this.root.addChild(label('SELECT YOUR FIGHTER', new TextStyle({
      fontFamily: DISPLAY_FONT, fontSize: 54, fontStyle: 'italic', fontWeight: '900', fill: 0xffffff,
      stroke: { color: 0x111b3d, width: 6 }, letterSpacing: 2,
    }), 42, 49));
    this.root.addChild(label('PLAYER 1', new TextStyle({
      fontFamily: UI_FONT, fontSize: 22, fontWeight: '900', fill: 0xffc72f, letterSpacing: 4,
    }), 1040, 45, 0.5));
    this.root.addChild(label('CHOOSE YOUR STREET LEGEND', new TextStyle({
      fontFamily: UI_FONT, fontSize: 13, fontWeight: '700', fill: 0xbdeeff, letterSpacing: 3,
    }), 1040, 77, 0.5));

    const portraitPlate = new Graphics();
    portraitPlate.moveTo(58, 139).lineTo(576, 112).lineTo(650, 555).lineTo(104, 590).fill(0xf1e5cf);
    portraitPlate.moveTo(58, 139).lineTo(576, 112).lineTo(585, 158).lineTo(66, 183).fill(0xffc226);
    portraitPlate.moveTo(104, 590).lineTo(650, 555).lineTo(641, 507).lineTo(96, 541).fill(0xc72d3a);
    portraitPlate.stroke({ color: 0xffffff, width: 5 });
    this.root.addChild(portraitPlate);

    const portraitMask = new Graphics();
    portraitMask.roundRect(86, 145, 520, 402, 8).fill(0xffffff);
    const portrait = new Sprite(portraitTexture);
    portrait.position.set(70, 105);
    portrait.width = 550;
    portrait.height = 550;
    portrait.mask = portraitMask;
    this.root.addChild(portrait, portraitMask);

    const nameSlash = new Graphics();
    nameSlash.moveTo(58, 486).lineTo(642, 452).lineTo(658, 548).lineTo(91, 584).fill({ color: 0x071126, alpha: 0.94 });
    nameSlash.moveTo(78, 543).lineTo(645, 507).lineTo(651, 544).lineTo(85, 580).fill(0x22cada);
    this.root.addChild(nameSlash);
    this.root.addChild(label('MARCO', new TextStyle({
      fontFamily: DISPLAY_FONT, fontSize: 72, fontStyle: 'italic', fontWeight: '900', fill: 0xffc42c,
      stroke: { color: 0x7d172c, width: 7 }, letterSpacing: 3,
    }), 130, 513));
    this.root.addChild(label('THE STREET KING', new TextStyle({
      fontFamily: UI_FONT, fontSize: 15, fontWeight: '900', fill: 0x071126, letterSpacing: 4,
    }), 147, 561));

    const stats = new Graphics();
    stats.roundRect(694, 132, 514, 154, 12).fill({ color: 0x071226, alpha: 0.92 }).stroke({ color: 0x22ccda, width: 3 });
    this.root.addChild(stats);
    this.root.addChild(label('MARCO', new TextStyle({
      fontFamily: DISPLAY_FONT, fontSize: 48, fontStyle: 'italic', fontWeight: '900', fill: 0xffffff,
      stroke: { color: 0x951d35, width: 5 }, letterSpacing: 2,
    }), 724, 174));
    this.root.addChild(label('POTENZA', new TextStyle({ fontFamily: UI_FONT, fontSize: 14, fill: 0xaed4ed }), 726, 225));
    this.root.addChild(label('VELOCITÀ', new TextStyle({ fontFamily: UI_FONT, fontSize: 14, fill: 0xaed4ed }), 726, 254));
    for (const [row, amount, color] of [[0, 5, 0xffb927], [1, 4, 0x20cedb]] as const) {
      for (let pip = 0; pip < 5; pip += 1) {
        stats.roundRect(842 + pip * 59, 214 + row * 29, 47, 12, 5).fill(pip < amount ? color : 0x23304c);
      }
    }

    const slotPositions = [[694, 316], [956, 316], [694, 478], [956, 478]] as const;
    for (let index = 0; index < slotPositions.length; index += 1) {
      const [x, y] = slotPositions[index]!;
      const slot = new Graphics();
      slot.roundRect(x, y, 238, 138, 10).fill(index === 0 ? 0x15315c : 0x0b1021)
        .stroke({ color: index === 0 ? 0xffc426 : 0x3b4563, width: index === 0 ? 4 : 2 });
      slot.moveTo(x, y + 105).lineTo(x + 238, y + 88).lineTo(x + 238, y + 138).lineTo(x, y + 138)
        .fill(index === 0 ? 0xc62f3e : 0x171d30);
      this.root.addChild(slot);
      if (index === 0) {
        const thumb = new Sprite(portraitTexture);
        thumb.position.set(x + 12, y + 9);
        thumb.width = 82;
        thumb.height = 82;
        this.root.addChild(thumb);
        this.root.addChild(label('MARCO', new TextStyle({ fontFamily: DISPLAY_FONT, fontSize: 32, fontWeight: '900', fontStyle: 'italic', fill: 0xffffff }), x + 104, y + 47));
        this.root.addChild(label('READY', new TextStyle({ fontFamily: UI_FONT, fontSize: 14, fontWeight: '900', fill: 0xffe26e, letterSpacing: 3 }), x + 119, y + 119, 0.5));
      } else {
        this.root.addChild(label('?', new TextStyle({ fontFamily: DISPLAY_FONT, fontSize: 61, fontWeight: '900', fill: 0x48516c }), x + 119, y + 52, 0.5));
        this.root.addChild(label('SLOT VUOTO', new TextStyle({ fontFamily: UI_FONT, fontSize: 13, fontWeight: '900', fill: 0x707993, letterSpacing: 2 }), x + 119, y + 117, 0.5));
      }
    }

    this.selectionFrame.roundRect(686, 308, 254, 154, 13).stroke({ color: 0xffffff, width: 3 });
    this.root.addChild(this.selectionFrame);
    const promptPlate = new Graphics();
    promptPlate.roundRect(688, 643, 518, 50, 10).fill({ color: 0x050a16, alpha: 0.94 }).stroke({ color: 0xffbd25, width: 3 });
    this.root.addChild(promptPlate);
    this.confirmPrompt = label('INVIO  CONFERMA     ESC  INDIETRO', new TextStyle({
      fontFamily: UI_FONT, fontSize: 16, fontWeight: '900', fill: 0xffffff, letterSpacing: 2,
    }), 947, 668, 0.5);
    this.root.addChild(this.confirmPrompt);

    const loadingShade = new Graphics();
    loadingShade.rect(0, 0, 1280, 720).fill({ color: 0x030611, alpha: 0.82 });
    loadingShade.roundRect(388, 286, 504, 148, 14).fill(0x08132b).stroke({ color: 0xffc12b, width: 4 });
    this.loadingGroup.addChild(loadingShade);
    this.loadingGroup.addChild(label('FIGHTER READY', new TextStyle({
      fontFamily: DISPLAY_FONT, fontSize: 45, fontWeight: '900', fontStyle: 'italic', fill: 0xffffff,
      stroke: { color: 0x9b2036, width: 5 }, letterSpacing: 3,
    }), 640, 337, 0.5));
    const barTrack = new Graphics();
    barTrack.roundRect(470, 392, 340, 12, 6).fill(0x1c2741);
    this.loadingGroup.addChild(barTrack, this.loadingBar);
    this.loadingGroup.visible = false;
    this.root.addChild(this.loadingGroup);
  }

  setLoading(value: boolean): void {
    this.loading = value;
    this.loadingGroup.visible = value;
    this.confirmPrompt.visible = !value;
  }

  update(dt: number, input: Input): void {
    this.elapsed += dt;
    if (this.loading) {
      const progress = (this.elapsed * 0.88) % 1;
      this.loadingBar.clear().roundRect(470 + progress * 244, 392, 96, 12, 6).fill(0xffc32d);
      return;
    }
    const pulse = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(this.elapsed * 7));
    this.selectionFrame.alpha = pulse;
    this.confirmPrompt.alpha = 0.76 + pulse * 0.24;
    if (input.wasPressed('Enter', 'NumpadEnter')) this.confirmRequested = true;
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
