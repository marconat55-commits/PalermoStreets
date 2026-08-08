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
    const [portrait, background] = await Promise.all([
      Assets.load<Texture>(publicUrl('assets/ui/character_select/marco_portrait.png')),
      Assets.load<Texture>(publicUrl('assets/ui/title/palermo_night.png')),
    ]);
    return new CharacterSelectScene(portrait, background);
  }

  private constructor(portraitTexture: Texture, backgroundTexture: Texture) {
    const background = new Sprite(backgroundTexture);
    background.width = 1280;
    background.height = 720;
    this.root.addChild(background);

    const grade = new Graphics();
    grade.rect(0, 0, 1280, 720).fill({ color: 0x050100, alpha: 0.62 });
    grade.moveTo(0, 0).lineTo(885, 0).lineTo(690, 720).lineTo(0, 720).closePath()
      .fill({ color: 0x120300, alpha: 0.72 });
    grade.moveTo(866, 0).lineTo(1280, 0).lineTo(1280, 720).lineTo(668, 720).closePath()
      .fill({ color: 0x020204, alpha: 0.72 });
    this.root.addChild(grade);

    const header = new Graphics();
    header.moveTo(0, 0).lineTo(1045, 0).lineTo(976, 96).lineTo(0, 96).closePath().fill(0x140502);
    header.moveTo(0, 88).lineTo(990, 88).lineTo(974, 102).lineTo(0, 102).closePath().fill(0xd92812);
    header.moveTo(0, 96).lineTo(980, 96).stroke({ color: 0xffa314, width: 4 });
    this.root.addChild(header);
    this.root.addChild(label('SCEGLI IL TUO COMBATTENTE', new TextStyle({
      fontFamily: DISPLAY_FONT, fontSize: 52, fontStyle: 'italic', fontWeight: '900', fill: 0xffdf94,
      stroke: { color: 0x641000, width: 7 }, letterSpacing: 2,
    }), 40, 48));
    this.root.addChild(label('PLAYER 1', new TextStyle({
      fontFamily: UI_FONT, fontSize: 20, fontWeight: '900', fill: 0xffb11b, letterSpacing: 4,
      stroke: { color: 0x160400, width: 4 },
    }), 1134, 43, 0.5));

    const portraitPlate = new Graphics();
    portraitPlate.moveTo(48, 138).lineTo(571, 108).lineTo(654, 574).lineTo(94, 610).closePath()
      .fill(0x170604).stroke({ color: 0xffa315, width: 6 });
    portraitPlate.moveTo(62, 154).lineTo(559, 127).lineTo(622, 545).lineTo(107, 579).closePath()
      .fill(0x6f1008).stroke({ color: 0xf02b14, width: 4 });
    this.root.addChild(portraitPlate);

    const portraitMask = new Graphics();
    portraitMask.moveTo(76, 164).lineTo(548, 139).lineTo(608, 526).lineTo(119, 557).closePath().fill(0xffffff);
    const portrait = new Sprite(portraitTexture);
    portrait.position.set(66, 105);
    portrait.width = 550;
    portrait.height = 550;
    portrait.mask = portraitMask;
    this.root.addChild(portrait, portraitMask);

    const nameBand = new Graphics();
    nameBand.moveTo(55, 493).lineTo(629, 457).lineTo(646, 563).lineTo(89, 603).closePath()
      .fill({ color: 0x090100, alpha: 0.95 });
    nameBand.moveTo(88, 576).lineTo(640, 538).stroke({ color: 0xff9e12, width: 5 });
    this.root.addChild(nameBand);
    this.root.addChild(label('MARCO', new TextStyle({
      fontFamily: DISPLAY_FONT, fontSize: 76, fontStyle: 'italic', fontWeight: '900', fill: 0xffc025,
      stroke: { color: 0x661006, width: 8 }, letterSpacing: 3,
    }), 120, 518));
    this.root.addChild(label('PALERMO STREET KING', new TextStyle({
      fontFamily: UI_FONT, fontSize: 14, fontWeight: '900', fill: 0xffe0a3, letterSpacing: 4,
    }), 138, 568));

    const statPanel = new Graphics();
    statPanel.roundRect(690, 124, 520, 145, 10).fill({ color: 0x0d0302, alpha: 0.92 })
      .stroke({ color: 0xff9e12, width: 3 });
    statPanel.rect(704, 139, 7, 116).fill(0xd82613);
    this.root.addChild(statPanel);
    this.root.addChild(label('MARCO', new TextStyle({
      fontFamily: DISPLAY_FONT, fontSize: 43, fontStyle: 'italic', fontWeight: '900', fill: 0xffdf9e,
      stroke: { color: 0x5e0d05, width: 5 },
    }), 730, 164));
    for (const [row, text, amount] of [[0, 'POTENZA', 5], [1, 'VELOCITÀ', 4]] as const) {
      this.root.addChild(label(text, new TextStyle({ fontFamily: UI_FONT, fontSize: 13, fill: 0xe8cda7 }), 733, 211 + row * 28));
      for (let pip = 0; pip < 5; pip += 1) {
        statPanel.roundRect(844 + pip * 59, 203 + row * 28, 47, 12, 5).fill(pip < amount ? 0xffa316 : 0x39201a);
      }
    }

    const slots = [[690, 300], [955, 300], [690, 468], [955, 468]] as const;
    for (let index = 0; index < slots.length; index += 1) {
      const [x, y] = slots[index]!;
      const slot = new Graphics();
      slot.roundRect(x, y, 242, 143, 8).fill({ color: index === 0 ? 0x571008 : 0x090405, alpha: 0.96 })
        .stroke({ color: index === 0 ? 0xffa315 : 0x5b382a, width: index === 0 ? 4 : 2 });
      slot.moveTo(x, y + 108).lineTo(x + 242, y + 90).lineTo(x + 242, y + 143).lineTo(x, y + 143).closePath()
        .fill(index === 0 ? 0xd82713 : 0x21110d);
      this.root.addChild(slot);
      if (index === 0) {
        const thumb = new Sprite(portraitTexture);
        thumb.position.set(x + 10, y + 8);
        thumb.width = 88;
        thumb.height = 88;
        this.root.addChild(thumb);
        this.root.addChild(label('MARCO', new TextStyle({
          fontFamily: DISPLAY_FONT, fontSize: 31, fontWeight: '900', fontStyle: 'italic', fill: 0xffe0a0,
        }), x + 106, y + 48));
        this.root.addChild(label('PRONTO', new TextStyle({
          fontFamily: UI_FONT, fontSize: 13, fontWeight: '900', fill: 0xffe06b, letterSpacing: 3,
        }), x + 121, y + 121, 0.5));
      } else {
        this.root.addChild(label('?', new TextStyle({ fontFamily: DISPLAY_FONT, fontSize: 58, fontWeight: '900', fill: 0x634332 }), x + 121, y + 54, 0.5));
        this.root.addChild(label('SLOT VUOTO', new TextStyle({
          fontFamily: UI_FONT, fontSize: 12, fontWeight: '900', fill: 0x83614e, letterSpacing: 2,
        }), x + 121, y + 120, 0.5));
      }
    }

    this.selectionFrame.roundRect(682, 292, 258, 159, 11).stroke({ color: 0xffedb3, width: 4 });
    this.root.addChild(this.selectionFrame);
    const promptPlate = new Graphics();
    promptPlate.roundRect(688, 642, 520, 52, 9).fill({ color: 0x0c0302, alpha: 0.95 }).stroke({ color: 0xff9f13, width: 3 });
    this.root.addChild(promptPlate);
    this.confirmPrompt = label('INVIO  CONFERMA     ESC  INDIETRO', new TextStyle({
      fontFamily: UI_FONT, fontSize: 15, fontWeight: '900', fill: 0xffe2ad, letterSpacing: 2,
    }), 948, 668, 0.5);
    this.root.addChild(this.confirmPrompt);

    const loadingShade = new Graphics();
    loadingShade.rect(0, 0, 1280, 720).fill({ color: 0x030100, alpha: 0.84 });
    loadingShade.roundRect(388, 286, 504, 148, 14).fill(0x160604).stroke({ color: 0xffa315, width: 4 });
    this.loadingGroup.addChild(loadingShade);
    this.loadingGroup.addChild(label('COMBATTENTE PRONTO', new TextStyle({
      fontFamily: DISPLAY_FONT, fontSize: 43, fontWeight: '900', fontStyle: 'italic', fill: 0xffdf9e,
      stroke: { color: 0x6b1007, width: 5 }, letterSpacing: 2,
    }), 640, 337, 0.5));
    const track = new Graphics();
    track.roundRect(470, 392, 340, 12, 6).fill(0x3b160c);
    this.loadingGroup.addChild(track, this.loadingBar);
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
      this.loadingBar.clear().roundRect(470 + progress * 244, 392, 96, 12, 6).fill(0xffa315);
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
