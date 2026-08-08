import { Application, Assets, Texture } from 'pixi.js';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './config';
import { Input } from './input/Input';
import { loadCharacterIndex, loadCharacterProfile, loadFrameMeta, loadStage1 } from './data/loadData';
import { AssetCatalog } from './assets/AssetCatalog';
import { TitleScene } from './scenes/TitleScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { StageScene } from './scenes/StageScene';
import type { Scene } from './scenes/Scene';
import type { StageData } from './types';
import { publicUrl } from './data/paths';

export class Game {
  readonly app = new Application();
  readonly input = new Input();
  private scene: Scene | null = null;
  private titleScene: TitleScene | null = null;
  private characterSelectScene: CharacterSelectScene | null = null;
  private catalog!: AssetCatalog;
  private stageData!: StageData;
  private defaultPlayerId = 'marco';
  private defaultEnemyId = 'barbetta';
  private titleBackground!: Texture;
  private startingStage = false;
  private openingCharacterSelect = false;

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({
      width: LOGICAL_WIDTH,
      height: LOGICAL_HEIGHT,
      background: 0x000000,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: ['webgpu', 'webgl'],
    });
    host.appendChild(this.app.canvas);
    this.app.stage.sortableChildren = true;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    const [frameMeta, index, stageData, titleBackground] = await Promise.all([
      loadFrameMeta(),
      loadCharacterIndex(),
      loadStage1(),
      Assets.load<Texture>(publicUrl('assets/ui/title/palermo_night.png')),
    ]);
    this.titleBackground = titleBackground;
    this.stageData = stageData;
    this.defaultPlayerId = index.default_player;
    this.defaultEnemyId = index.default_enemy;
    this.catalog = new AssetCatalog(frameMeta);
    const profiles = await Promise.all(index.characters.map((id) => loadCharacterProfile(id)));
    for (const profile of profiles) this.catalog.registerProfile(profile);

    this.showTitle();
    this.app.ticker.add((ticker: { deltaMS: number }) => {
      const dt = Math.min(0.05, ticker.deltaMS / 1000);
      this.update(dt);
      this.input.endFrame();
    });
  }

  private update(dt: number): void {
    if (this.input.wasPressed('F11')) void this.toggleFullscreen();
    if (this.input.wasPressed('Escape')) {
      if (this.titleScene) {
        // Nel browser ESC è anche riservato all'uscita dal fullscreen: non chiudiamo la pagina.
      } else {
        this.showTitle();
        return;
      }
    }

    this.scene?.update(dt, this.input);
    if (this.titleScene?.startRequested) void this.showCharacterSelect();
    if (this.characterSelectScene?.confirmRequested) void this.startStage();
  }

  private showTitle(): void {
    this.startingStage = false;
    this.scene?.destroy();
    this.app.stage.removeChildren();
    this.titleScene = new TitleScene(this.titleBackground);
    this.characterSelectScene = null;
    this.scene = this.titleScene;
    this.app.stage.addChild(this.titleScene.root);
  }

  private async showCharacterSelect(): Promise<void> {
    const title = this.titleScene;
    if (!title || this.openingCharacterSelect) return;
    this.openingCharacterSelect = true;
    title.setLoading(true);
    try {
      const selection = await CharacterSelectScene.create();
      if (this.titleScene !== title) {
        selection.destroy();
        return;
      }
      title.destroy();
      this.app.stage.removeChildren();
      this.titleScene = null;
      this.characterSelectScene = selection;
      this.scene = selection;
      this.app.stage.addChild(selection.root);
    } catch (error) {
      console.error('Selezione personaggio non caricabile', error);
      title.startRequested = false;
      title.setLoading(false);
    } finally {
      this.openingCharacterSelect = false;
    }
  }

  private async startStage(): Promise<void> {
    if (!this.characterSelectScene || this.startingStage) return;
    this.startingStage = true;
    const selection = this.characterSelectScene;
    selection.setLoading(true);
    try {
      const stage = await StageScene.create(
        this.catalog,
        this.stageData,
        this.defaultPlayerId,
        this.defaultEnemyId,
      );
      selection.destroy();
      this.app.stage.removeChildren();
      this.characterSelectScene = null;
      this.scene = stage;
      this.app.stage.addChild(stage.root);
    } catch (error) {
      console.error('Avvio stage fallito', error);
      this.startingStage = false;
      selection.confirmRequested = false;
      selection.setLoading(false);
    }
  }

  private resizeCanvas(): void {
    const ratio = LOGICAL_WIDTH / LOGICAL_HEIGHT;
    let width = window.innerWidth;
    let height = width / ratio;
    if (height > window.innerHeight) {
      height = window.innerHeight;
      width = height * ratio;
    }
    this.app.canvas.style.width = `${Math.floor(width)}px`;
    this.app.canvas.style.height = `${Math.floor(height)}px`;
  }

  private async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }
}
