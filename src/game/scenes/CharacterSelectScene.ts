import { Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { Input } from '../input/Input';
import { publicUrl } from '../data/paths';
import type { CharacterProfile } from '../types';
import type { Scene } from './Scene';

const DISPLAY_FONT = 'Impact, Haettenschweiler, Arial Black, sans-serif';
const UI_FONT = 'Arial Black, Arial, sans-serif';
const SLOTS = [[690, 300], [955, 300], [690, 468], [955, 468]] as const;

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
  private loadProgress = 0;
  private selectedIndex = 0;
  private readonly selectionFrame = new Graphics();
  private readonly confirmPrompt: Text;
  private readonly loadingGroup = new Container();
  private readonly loadingBar = new Graphics();
  private readonly loadingPercent: Text;
  private readonly portrait: Sprite;
  private readonly nameLarge: Text;
  private readonly nameStats: Text;
  private readonly subtitle: Text;
  private readonly statPips = new Graphics();

  static async create(profiles: CharacterProfile[], initialId: string): Promise<CharacterSelectScene> {
    const portraitPaths = profiles.map((profile) => profile.selection?.portrait ?? 'assets/ui/character_select/marco_portrait.png');
    const [portraits, background] = await Promise.all([
      Promise.all(portraitPaths.map((path) => Assets.load<Texture>(publicUrl(path)))),
      Assets.load<Texture>(publicUrl('assets/ui/title/palermo_night.png')),
    ]);
    return new CharacterSelectScene(profiles, portraits, background, initialId);
  }

  private constructor(
    private readonly profiles: CharacterProfile[],
    private readonly portraits: Texture[],
    backgroundTexture: Texture,
    initialId: string,
  ) {
    this.selectedIndex = Math.max(0, profiles.findIndex((profile) => profile.id === initialId));
    const background = new Sprite(backgroundTexture);
    background.width = 1280;
    background.height = 720;
    this.root.addChild(background);
    const grade = new Graphics();
    grade.rect(0, 0, 1280, 720).fill({ color: 0x050100, alpha: 0.7 });
    grade.moveTo(0, 0).lineTo(885, 0).lineTo(690, 720).lineTo(0, 720).closePath().fill({ color: 0x120300, alpha: 0.72 });
    this.root.addChild(grade);

    const header = new Graphics();
    header.moveTo(0, 0).lineTo(1045, 0).lineTo(976, 96).lineTo(0, 96).closePath().fill(0x140502);
    header.moveTo(0, 88).lineTo(990, 88).lineTo(974, 102).lineTo(0, 102).closePath().fill(0xd92812);
    this.root.addChild(header);
    this.root.addChild(label('SCEGLI IL TUO COMBATTENTE', new TextStyle({ fontFamily: DISPLAY_FONT, fontSize: 52, fontStyle: 'italic', fontWeight: '900', fill: 0xffdf94, stroke: { color: 0x641000, width: 7 } }), 40, 48));
    this.root.addChild(label('PLAYER 1', new TextStyle({ fontFamily: UI_FONT, fontSize: 20, fontWeight: '900', fill: 0xffb11b }), 1134, 43, 0.5));

    const portraitPlate = new Graphics();
    portraitPlate.moveTo(48, 138).lineTo(571, 108).lineTo(654, 574).lineTo(94, 610).closePath().fill(0x170604).stroke({ color: 0xffa315, width: 6 });
    this.root.addChild(portraitPlate);
    const portraitMask = new Graphics();
    portraitMask.moveTo(76, 164).lineTo(548, 139).lineTo(608, 526).lineTo(119, 557).closePath().fill(0xffffff);
    this.portrait = new Sprite(portraits[this.selectedIndex] ?? Texture.EMPTY);
    this.portrait.position.set(66, 105);
    this.portrait.width = 550;
    this.portrait.height = 550;
    this.portrait.mask = portraitMask;
    this.root.addChild(this.portrait, portraitMask);
    const nameBand = new Graphics();
    nameBand.moveTo(55, 493).lineTo(629, 457).lineTo(646, 563).lineTo(89, 603).closePath().fill({ color: 0x090100, alpha: 0.95 });
    this.root.addChild(nameBand);
    this.nameLarge = label('', new TextStyle({ fontFamily: DISPLAY_FONT, fontSize: 76, fontStyle: 'italic', fontWeight: '900', fill: 0xffc025, stroke: { color: 0x661006, width: 8 } }), 120, 518);
    this.subtitle = label('', new TextStyle({ fontFamily: UI_FONT, fontSize: 14, fontWeight: '900', fill: 0xffe0a3, letterSpacing: 4 }), 138, 568);
    this.root.addChild(this.nameLarge, this.subtitle);

    const statPanel = new Graphics();
    statPanel.roundRect(690, 124, 520, 164, 10).fill({ color: 0x0d0302, alpha: 0.92 }).stroke({ color: 0xff9e12, width: 3 });
    this.root.addChild(statPanel);
    this.nameStats = label('', new TextStyle({ fontFamily: DISPLAY_FONT, fontSize: 43, fontStyle: 'italic', fontWeight: '900', fill: 0xffdf9e, stroke: { color: 0x5e0d05, width: 5 } }), 730, 164);
    this.root.addChild(this.nameStats);
    for (const [row, text] of [[0, 'FORZA'], [1, 'VELOCITÀ'], [2, 'TECNICA']] as const) {
      this.root.addChild(label(text, new TextStyle({ fontFamily: UI_FONT, fontSize: 13, fill: 0xe8cda7 }), 733, 207 + row * 26));
    }
    this.root.addChild(this.statPips);

    for (let index = 0; index < SLOTS.length; index += 1) {
      const [x, y] = SLOTS[index]!;
      const profile = profiles[index];
      const slot = new Graphics();
      slot.roundRect(x, y, 242, 143, 8).fill({ color: profile ? 0x571008 : 0x090405, alpha: 0.96 }).stroke({ color: profile ? 0xffa315 : 0x5b382a, width: profile ? 4 : 2 });
      this.root.addChild(slot);
      if (profile) {
        const thumb = new Sprite(portraits[index] ?? Texture.EMPTY);
        thumb.position.set(x + 10, y + 8);
        thumb.width = 88;
        thumb.height = 88;
        this.root.addChild(thumb);
        this.root.addChild(label(profile.display_name, new TextStyle({ fontFamily: DISPLAY_FONT, fontSize: 31, fontWeight: '900', fontStyle: 'italic', fill: 0xffe0a0 }), x + 106, y + 48));
        this.root.addChild(label(profile.selection?.prototype ? 'PROTOTIPO' : 'PRONTO', new TextStyle({ fontFamily: UI_FONT, fontSize: 12, fontWeight: '900', fill: 0xffe06b }), x + 121, y + 121, 0.5));
      } else {
        this.root.addChild(label('?', new TextStyle({ fontFamily: DISPLAY_FONT, fontSize: 58, fontWeight: '900', fill: 0x634332 }), x + 121, y + 54, 0.5));
        this.root.addChild(label('SLOT VUOTO', new TextStyle({ fontFamily: UI_FONT, fontSize: 12, fill: 0x83614e }), x + 121, y + 120, 0.5));
      }
    }
    this.root.addChild(this.selectionFrame);
    const promptPlate = new Graphics();
    promptPlate.roundRect(688, 642, 520, 52, 9).fill({ color: 0x0c0302, alpha: 0.95 }).stroke({ color: 0xff9f13, width: 3 });
    this.root.addChild(promptPlate);
    this.confirmPrompt = label('WASD  SCEGLI     INVIO  CONFERMA', new TextStyle({ fontFamily: UI_FONT, fontSize: 15, fontWeight: '900', fill: 0xffe2ad }), 948, 668, 0.5);
    this.root.addChild(this.confirmPrompt);

    const loadingShade = new Graphics();
    loadingShade.rect(0, 0, 1280, 720).fill({ color: 0x030100, alpha: 0.84 });
    loadingShade.roundRect(388, 286, 504, 148, 14).fill(0x160604).stroke({ color: 0xffa315, width: 4 });
    this.loadingGroup.addChild(loadingShade);
    this.loadingGroup.addChild(label('COMBATTENTE PRONTO', new TextStyle({ fontFamily: DISPLAY_FONT, fontSize: 43, fontWeight: '900', fontStyle: 'italic', fill: 0xffdf9e }), 640, 337, 0.5));
    const track = new Graphics();
    track.roundRect(470, 392, 340, 12, 6).fill(0x3b160c);
    this.loadingPercent = label('CARICAMENTO 0%', new TextStyle({ fontFamily: UI_FONT, fontSize: 13, fontWeight: '900', fill: 0xffd980 }), 640, 418, 0.5);
    this.loadingGroup.addChild(track, this.loadingBar, this.loadingPercent);
    this.loadingGroup.visible = false;
    this.root.addChild(this.loadingGroup);
    this.refreshSelection();
  }

  get selectedCharacterId(): string { return this.profiles[this.selectedIndex]?.id ?? 'marco'; }

  private refreshSelection(): void {
    const profile = this.profiles[this.selectedIndex];
    if (!profile) return;
    this.portrait.texture = this.portraits[this.selectedIndex] ?? Texture.EMPTY;
    this.nameLarge.text = profile.display_name;
    this.nameStats.text = profile.display_name;
    this.subtitle.text = profile.selection?.subtitle ?? '';
    const stats = profile.selection?.stats ?? { strength: 3, speed: 3, technique: 3 };
    const amounts = [stats.strength, stats.speed, stats.technique];
    this.statPips.clear();
    for (let row = 0; row < 3; row += 1) for (let pip = 0; pip < 5; pip += 1) {
      this.statPips.roundRect(844 + pip * 59, 199 + row * 26, 47, 12, 5).fill(pip < (amounts[row] ?? 0) ? 0xffa316 : 0x39201a);
    }
    const [x, y] = SLOTS[this.selectedIndex] ?? SLOTS[0];
    this.selectionFrame.clear().roundRect(x - 8, y - 8, 258, 159, 11).stroke({ color: 0xffedb3, width: 4 });
  }

  setLoading(value: boolean): void { this.loading = value; this.loadingGroup.visible = value; this.confirmPrompt.visible = !value; this.drawLoadProgress(); }
  setLoadingProgress(value: number): void { this.loadProgress = Math.max(0, Math.min(1, value)); this.drawLoadProgress(); }
  private drawLoadProgress(): void {
    const width = 340 * this.loadProgress;
    this.loadingBar.clear();
    if (width > 0) this.loadingBar.roundRect(470, 392, width, 12, 6).fill(0xffa315);
    this.loadingPercent.text = `CARICAMENTO ${Math.round(this.loadProgress * 100)}%`;
  }

  update(dt: number, input: Input): void {
    this.elapsed += dt;
    if (this.loading) return;
    const pulse = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(this.elapsed * 7));
    this.selectionFrame.alpha = pulse;
    const previous = this.selectedIndex;
    if (input.wasPressed('KeyD')) this.selectedIndex = Math.min(this.profiles.length - 1, this.selectedIndex + 1);
    if (input.wasPressed('KeyA')) this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    if (input.wasPressed('KeyS')) this.selectedIndex = Math.min(this.profiles.length - 1, this.selectedIndex + 2);
    if (input.wasPressed('KeyW')) this.selectedIndex = Math.max(0, this.selectedIndex - 2);
    if (previous !== this.selectedIndex) this.refreshSelection();
    if (input.wasPressed('Enter', 'NumpadEnter')) this.confirmRequested = true;
  }

  destroy(): void { this.root.destroy({ children: true }); }
}
