import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { Input } from '../input/Input';
import type { ModuleData } from '../types';
import type { Scene } from './Scene';

const DISPLAY_FONT = 'Bangers, Impact, Arial Black, sans-serif';
const UI_FONT = 'Arial Black, Arial, sans-serif';
const CARD_WIDTH = 280;
const CARD_HEIGHT = 270;
const CARD_GAP = 24;
const MAX_CARDS_WIDTH = 1192;

function centeredText(text: string, style: TextStyle, x: number, y: number): Text {
  const value = new Text({ text, style });
  value.anchor.set(0.5);
  value.position.set(x, y);
  return value;
}

/** Module picker shown after character selection. */
export class StageSelectScene implements Scene {
  readonly root = new Container();
  confirmRequested = false;
  private elapsed = 0;
  private loading = false;
  private loadProgress = 0;
  private selectedIndex: number;
  private readonly selectionFrame = new Graphics();
  private readonly loadingGroup = new Container();
  private readonly loadingBar = new Graphics();
  private readonly loadingPercent: Text;
  private readonly cardWidth: number;

  constructor(
    backgroundTexture: Texture,
    private readonly modules: ModuleData[],
    initialIndex: number,
  ) {
    this.selectedIndex = Math.max(0, Math.min(modules.length - 1, initialIndex));
    this.cardWidth = Math.min(CARD_WIDTH, Math.floor((MAX_CARDS_WIDTH - Math.max(0, modules.length - 1) * CARD_GAP) / Math.max(1, modules.length)));

    const background = new Sprite(backgroundTexture);
    background.width = 1280;
    background.height = 720;
    this.root.addChild(background);

    const grade = new Graphics();
    grade.rect(0, 0, 1280, 720).fill({ color: 0x090100, alpha: 0.72 });
    grade.moveTo(0, 0).lineTo(1070, 0).lineTo(1000, 112).lineTo(0, 112).closePath().fill(0x160502);
    grade.moveTo(0, 103).lineTo(1010, 103).lineTo(985, 118).lineTo(0, 118).closePath().fill(0xd92812);
    this.root.addChild(grade);

    this.root.addChild(centeredText('SCEGLI IL MODULO', new TextStyle({
      fontFamily: DISPLAY_FONT,
      fontSize: 56,
      fontWeight: '900',
      fontStyle: 'italic',
      fill: 0xffdf94,
      stroke: { color: 0x641000, width: 7 },
      letterSpacing: 4,
    }), 495, 57));
    this.root.addChild(centeredText('STAGE 1 — ZEN', new TextStyle({
      fontFamily: UI_FONT,
      fontSize: 16,
      fontWeight: '900',
      fill: 0x51dce7,
      letterSpacing: 3,
    }), 1120, 56));

    const totalWidth = modules.length * this.cardWidth + Math.max(0, modules.length - 1) * CARD_GAP;
    const startX = (1280 - totalWidth) / 2;
    for (let index = 0; index < modules.length; index += 1) {
      const module = modules[index]!;
      const x = startX + index * (this.cardWidth + CARD_GAP);
      const plate = new Graphics();
      plate.moveTo(x, 208).lineTo(x + 18, 190).lineTo(x + this.cardWidth, 190)
        .lineTo(x + this.cardWidth, 190 + CARD_HEIGHT - 18).lineTo(x + this.cardWidth - 18, 190 + CARD_HEIGHT)
        .lineTo(x, 190 + CARD_HEIGHT).closePath()
        .fill({ color: 0x1a0603, alpha: 0.95 }).stroke({ color: 0x9d3217, width: 4 });
      plate.rect(x + 18, 212, this.cardWidth - 36, 82).fill({ color: 0xd82912, alpha: 0.82 });
      this.root.addChild(plate);

      const moduleId = centeredText(module.id, new TextStyle({
        fontFamily: DISPLAY_FONT,
        fontSize: 66,
        fontWeight: '900',
        fontStyle: 'italic',
        fill: 0xffc328,
        stroke: { color: 0x5d0d04, width: 7 },
        letterSpacing: 4,
      }), x + this.cardWidth / 2, 253);
      const moduleName = centeredText(module.name, new TextStyle({
        fontFamily: DISPLAY_FONT,
        fontSize: 30,
        fontWeight: '900',
        fill: 0xffe1aa,
        letterSpacing: 2,
      }), x + this.cardWidth / 2, 338);
      moduleName.scale.set(Math.min(1, (this.cardWidth - 28) / Math.max(1, moduleName.width)));
      const length = Math.max(1, Math.ceil((module.world_width ?? 1280) / 1280));
      const lengthLabel = centeredText(`${length} ${length === 1 ? 'SEZIONE' : 'SEZIONI'}`, new TextStyle({
        fontFamily: UI_FONT,
        fontSize: 14,
        fontWeight: '900',
        fill: 0xf0c68e,
        letterSpacing: 2,
      }), x + this.cardWidth / 2, 392);
      const status = centeredText(module.art_status === 'placeholder_rebuild_required' ? 'IN LAVORAZIONE' : 'PRONTO', new TextStyle({
        fontFamily: UI_FONT,
        fontSize: 13,
        fontWeight: '900',
        fill: module.art_status === 'placeholder_rebuild_required' ? 0xffa315 : 0x55dce7,
        letterSpacing: 2,
      }), x + this.cardWidth / 2, 430);
      this.root.addChild(moduleId, moduleName, lengthLabel, status);
    }
    this.root.addChild(this.selectionFrame);

    const promptPlate = new Graphics();
    promptPlate.moveTo(300, 572).lineTo(324, 552).lineTo(980, 552).lineTo(956, 618).lineTo(300, 618).closePath()
      .fill({ color: 0x100402, alpha: 0.96 }).stroke({ color: 0xffa315, width: 4 });
    this.root.addChild(promptPlate);
    this.root.addChild(centeredText('FRECCE O WASD  SCEGLI       INVIO  CONFERMA', new TextStyle({
      fontFamily: UI_FONT,
      fontSize: 17,
      fontWeight: '900',
      fill: 0xffe2ad,
      letterSpacing: 2,
    }), 640, 585));

    const loadingShade = new Graphics();
    loadingShade.rect(0, 0, 1280, 720).fill({ color: 0x030100, alpha: 0.86 });
    loadingShade.roundRect(388, 286, 504, 148, 14).fill(0x160604).stroke({ color: 0xffa315, width: 4 });
    this.loadingGroup.addChild(loadingShade);
    this.loadingGroup.addChild(centeredText('CARICAMENTO MODULO', new TextStyle({
      fontFamily: DISPLAY_FONT,
      fontSize: 42,
      fontWeight: '900',
      fontStyle: 'italic',
      fill: 0xffdf9e,
      stroke: { color: 0x641000, width: 5 },
      letterSpacing: 3,
    }), 640, 334));
    const track = new Graphics();
    track.roundRect(470, 386, 340, 12, 6).fill(0x3b160c);
    this.loadingPercent = centeredText('CARICAMENTO 0%', new TextStyle({
      fontFamily: UI_FONT,
      fontSize: 13,
      fontWeight: '900',
      fill: 0xffd980,
    }), 640, 416);
    this.loadingGroup.addChild(track, this.loadingBar, this.loadingPercent);
    this.loadingGroup.visible = false;
    this.root.addChild(this.loadingGroup);
    this.refreshSelection();
  }

  get selectedModuleIndex(): number { return this.selectedIndex; }

  private refreshSelection(): void {
    const totalWidth = this.modules.length * this.cardWidth + Math.max(0, this.modules.length - 1) * CARD_GAP;
    const startX = (1280 - totalWidth) / 2;
    const x = startX + this.selectedIndex * (this.cardWidth + CARD_GAP);
    this.selectionFrame.clear().roundRect(x - 8, 182, this.cardWidth + 16, CARD_HEIGHT + 16, 14)
      .stroke({ color: 0xffefb5, width: 6 });
  }

  setLoading(value: boolean): void {
    this.loading = value;
    this.loadingGroup.visible = value;
    this.drawLoadProgress();
  }

  setLoadingProgress(value: number): void {
    this.loadProgress = Math.max(0, Math.min(1, value));
    this.drawLoadProgress();
  }

  private drawLoadProgress(): void {
    const width = 340 * this.loadProgress;
    this.loadingBar.clear();
    if (width > 0) this.loadingBar.roundRect(470, 386, width, 12, 6).fill(0xffa315);
    this.loadingPercent.text = `CARICAMENTO ${Math.round(this.loadProgress * 100)}%`;
  }

  update(dt: number, input: Input): void {
    this.elapsed += dt;
    if (this.loading || this.modules.length === 0) return;
    this.selectionFrame.alpha = 0.74 + 0.26 * (0.5 + 0.5 * Math.sin(this.elapsed * 7));
    const previous = this.selectedIndex;
    if (input.wasPressed('KeyD', 'KeyS')) this.selectedIndex = (this.selectedIndex + 1) % this.modules.length;
    if (input.wasPressed('KeyA', 'KeyW')) this.selectedIndex = (this.selectedIndex - 1 + this.modules.length) % this.modules.length;
    if (previous !== this.selectedIndex) this.refreshSelection();
    if (input.wasPressed('Enter', 'NumpadEnter')) this.confirmRequested = true;
  }

  destroy(): void { this.root.destroy({ children: true }); }
}
