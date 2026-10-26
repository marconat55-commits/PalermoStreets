import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { Input } from '../input/Input';
import type { ModuleData } from '../types';
import type { Scene } from './Scene';

export interface StageSelectionOption {
  stageId: string;
  stageName: string;
  module: ModuleData;
}

const DISPLAY_FONT = 'Bangers, Impact, Arial Black, sans-serif';
const UI_FONT = 'Arial Black, Arial, sans-serif';
const CARD_WIDTH = 280;
const CARD_HEIGHT = 270;
const CARD_GAP = 24;
const MAX_CARDS_WIDTH = 1192;
const CARDS_PER_PAGE = 4;

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
  private readonly cards: Container[] = [];
  private readonly stageNameLabel: Text;
  private readonly pageLabel: Text;

  constructor(
    backgroundTexture: Texture,
    private readonly options: StageSelectionOption[],
    initialIndex: number,
  ) {
    this.selectedIndex = Math.max(0, Math.min(options.length - 1, initialIndex));
    const visibleCards = Math.min(CARDS_PER_PAGE, options.length);
    this.cardWidth = Math.min(CARD_WIDTH, Math.floor((MAX_CARDS_WIDTH - Math.max(0, visibleCards - 1) * CARD_GAP) / Math.max(1, visibleCards)));

    const background = new Sprite(backgroundTexture);
    background.width = 1280;
    background.height = 720;
    this.root.addChild(background);

    const grade = new Graphics();
    grade.rect(0, 0, 1280, 720).fill({ color: 0x090100, alpha: 0.72 });
    grade.moveTo(0, 0).lineTo(1070, 0).lineTo(1000, 112).lineTo(0, 112).closePath().fill(0x160502);
    grade.moveTo(0, 103).lineTo(1010, 103).lineTo(985, 118).lineTo(0, 118).closePath().fill(0xd92812);
    this.root.addChild(grade);

    this.root.addChild(centeredText('SCEGLI LO STAGE', new TextStyle({
      fontFamily: DISPLAY_FONT,
      fontSize: 56,
      fontWeight: '900',
      fontStyle: 'italic',
      fill: 0xffdf94,
      stroke: { color: 0x641000, width: 7 },
      letterSpacing: 4,
    }), 495, 57));
    this.stageNameLabel = centeredText('', new TextStyle({
      fontFamily: UI_FONT,
      fontSize: 16,
      fontWeight: '900',
      fill: 0x51dce7,
      letterSpacing: 3,
    }), 1060, 56);
    this.stageNameLabel.scale.set(Math.min(1, 390 / Math.max(1, this.stageNameLabel.width)));
    this.root.addChild(this.stageNameLabel);
    this.pageLabel = centeredText('', new TextStyle({
      fontFamily: UI_FONT,
      fontSize: 14,
      fontWeight: '900',
      fill: 0xffdf94,
      letterSpacing: 2,
    }), 640, 155);
    this.root.addChild(this.pageLabel);

    for (let index = 0; index < options.length; index += 1) {
      const { module, stageName } = options[index]!;
      const card = new Container();
      card.position.x = this.cardX(index);
      const plate = new Graphics();
      plate.moveTo(0, 208).lineTo(18, 190).lineTo(this.cardWidth, 190)
        .lineTo(this.cardWidth, 190 + CARD_HEIGHT - 18).lineTo(this.cardWidth - 18, 190 + CARD_HEIGHT)
        .lineTo(0, 190 + CARD_HEIGHT).closePath()
        .fill({ color: 0x1a0603, alpha: 0.95 }).stroke({ color: 0x9d3217, width: 4 });
      plate.rect(18, 212, this.cardWidth - 36, 82).fill({ color: 0xd82912, alpha: 0.82 });
      card.addChild(plate);

      const moduleId = centeredText(module.id, new TextStyle({
        fontFamily: DISPLAY_FONT,
        fontSize: 66,
        fontWeight: '900',
        fontStyle: 'italic',
        fill: 0xffc328,
        stroke: { color: 0x5d0d04, width: 7 },
        letterSpacing: 4,
      }), this.cardWidth / 2, 253);
      const stageLabel = centeredText(stageName, new TextStyle({
        fontFamily: UI_FONT,
        fontSize: 13,
        fontWeight: '900',
        fill: 0x51dce7,
        letterSpacing: 1,
      }), this.cardWidth / 2, 310);
      stageLabel.scale.set(Math.min(1, (this.cardWidth - 24) / Math.max(1, stageLabel.width)));
      const moduleName = centeredText(module.name, new TextStyle({
        fontFamily: DISPLAY_FONT,
        fontSize: 30,
        fontWeight: '900',
        fill: 0xffe1aa,
        letterSpacing: 2,
      }), this.cardWidth / 2, 352);
      moduleName.scale.set(Math.min(1, (this.cardWidth - 28) / Math.max(1, moduleName.width)));
      const length = Math.max(1, Math.ceil((module.world_width ?? 1280) / 1280));
      const lengthLabel = centeredText(`${length} ${length === 1 ? 'SEZIONE' : 'SEZIONI'}`, new TextStyle({
        fontFamily: UI_FONT,
        fontSize: 14,
        fontWeight: '900',
        fill: 0xf0c68e,
        letterSpacing: 2,
      }), this.cardWidth / 2, 398);
      const status = centeredText(module.art_status === 'placeholder_rebuild_required' ? 'IN LAVORAZIONE' : 'PRONTO', new TextStyle({
        fontFamily: UI_FONT,
        fontSize: 13,
        fontWeight: '900',
        fill: module.art_status === 'placeholder_rebuild_required' ? 0xffa315 : 0x55dce7,
        letterSpacing: 2,
      }), this.cardWidth / 2, 433);
      card.addChild(moduleId, stageLabel, moduleName, lengthLabel, status);
      this.cards.push(card);
      this.root.addChild(card);
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

  get selectedChoiceIndex(): number { return this.selectedIndex; }

  private cardX(index: number): number {
    const page = Math.floor(index / CARDS_PER_PAGE);
    const count = Math.min(CARDS_PER_PAGE, this.options.length - page * CARDS_PER_PAGE);
    const totalWidth = count * this.cardWidth + Math.max(0, count - 1) * CARD_GAP;
    return (1280 - totalWidth) / 2 + (index % CARDS_PER_PAGE) * (this.cardWidth + CARD_GAP);
  }

  private refreshSelection(): void {
    const page = Math.floor(this.selectedIndex / CARDS_PER_PAGE);
    this.cards.forEach((card, index) => { card.visible = Math.floor(index / CARDS_PER_PAGE) === page; });
    this.pageLabel.text = `PAGINA ${page + 1}/${Math.max(1, Math.ceil(this.options.length / CARDS_PER_PAGE))}`;
    this.stageNameLabel.text = this.options[this.selectedIndex]?.stageName ?? '';
    this.stageNameLabel.scale.set(Math.min(1, 390 / Math.max(1, this.stageNameLabel.width)));
    const x = this.cardX(this.selectedIndex);
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
    if (this.loading || this.options.length === 0) return;
    this.selectionFrame.alpha = 0.74 + 0.26 * (0.5 + 0.5 * Math.sin(this.elapsed * 7));
    const previous = this.selectedIndex;
    if (input.wasPressed('KeyD', 'KeyS')) this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
    if (input.wasPressed('KeyA', 'KeyW')) this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
    if (previous !== this.selectedIndex) this.refreshSelection();
    if (input.wasPressed('Enter', 'NumpadEnter')) this.confirmRequested = true;
  }

  destroy(): void { this.root.destroy({ children: true }); }
}
