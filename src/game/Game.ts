import { Application, Container } from 'pixi.js';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './config';
import { Input } from './input/Input';
import { loadCharacterIndex, loadCharacterProfile, loadFrameMeta, loadStage1 } from './data/loadData';
import { AssetCatalog } from './assets/AssetCatalog';
import { TitleScene } from './scenes/TitleScene';
import { StageScene } from './scenes/StageScene';
import type { Scene } from './scenes/Scene';
import type { StageData } from './types';

export class Game {
  readonly app = new Application();
  readonly input = new Input();
  private scene: Scene | null = null;
  private titleScene: TitleScene | null = null;
  private catalog!: AssetCatalog;
  private stageData!: StageData;
  private defaultPlayerId = 'marco';
  private defaultEnemyId = 'barbetta';

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

    const [frameMeta, index, stageData] = await Promise.all([
      loadFrameMeta(),
      loadCharacterIndex(),
      loadStage1(),
    ]);
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
      }
    }

    this.scene?.update(dt, this.input);
    if (this.titleScene?.startRequested) void this.startStage();
  }

  private showTitle(): void {
    this.scene?.destroy();
    this.app.stage.removeChildren();
    this.titleScene = new TitleScene();
    this.scene = this.titleScene;
    this.app.stage.addChild(this.titleScene.root);
  }

  private async startStage(): Promise<void> {
    if (!this.titleScene) return;
    const old = this.scene;
    this.titleScene = null;
    const loading = new Container();
    this.app.stage.addChild(loading);
    old?.destroy();
    this.app.stage.removeChildren();
    const stage = await StageScene.create(
      this.catalog,
      this.stageData,
      this.defaultPlayerId,
      this.defaultEnemyId,
    );
    this.scene = stage;
    this.app.stage.addChild(stage.root);
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
