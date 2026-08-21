import { Application, Assets, Texture } from 'pixi.js';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './config';
import { Input } from './input/Input';
import { getStageEntry, loadCharacterFrameMeta, loadCharacterIndex, loadCharacterProfile, loadRuntimeManifest, loadStage } from './data/loadData';
import { AssetCatalog } from './assets/AssetCatalog';
import { TitleScene } from './scenes/TitleScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { StageScene } from './scenes/StageScene';
import type { Scene } from './scenes/Scene';
import type { CharacterProfile, RuntimeStageEntry, StageData } from './types';
import { publicUrl } from './data/paths';

export class Game {
  readonly app = new Application();
  readonly input = new Input();
  private scene: Scene | null = null;
  private titleScene: TitleScene | null = null;
  private characterSelectScene: CharacterSelectScene | null = null;
  private catalog!: AssetCatalog;
  private stageData!: StageData;
  private stageEntry!: RuntimeStageEntry;
  private defaultPlayerId = 'marco';
  private defaultEnemyId = 'talebano';
  private titleBackground!: Texture;
  private startingStage = false;
  private openingCharacterSelect = false;
  private initialStagePreload: Promise<void> | null = null;
  private initialStageLoadCompleted = 0;
  private initialStageLoadTotal = 0;
  private playerProfiles: CharacterProfile[] = [];

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

    const [runtime, index, titleBackground] = await Promise.all([
      loadRuntimeManifest(),
      loadCharacterIndex(),
      Assets.load<Texture>(publicUrl('assets/ui/title/palermo_night.png')),
    ]);
    this.stageEntry = getStageEntry(runtime);
    this.stageData = await loadStage(this.stageEntry);
    this.titleBackground = titleBackground;
    this.defaultPlayerId = index.default_player;
    this.defaultEnemyId = index.default_enemy;
    this.catalog = new AssetCatalog((profile) => loadCharacterFrameMeta(profile, runtime.legacy_frame_meta));
    const profiles = await Promise.all(index.characters.map((id) => loadCharacterProfile(id)));
    for (const profile of profiles) this.catalog.registerProfile(profile);
    this.playerProfiles = profiles.filter((profile) => profile.role === 'player');

    void this.preloadInitialStage().catch((error) => {
      console.error('Precaricamento stage iniziale fallito', error);
    });
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
      const selection = await CharacterSelectScene.create(this.playerProfiles, this.defaultPlayerId);
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
      this.updateInitialStageLoadProgress();
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
    this.updateInitialStageLoadProgress();
    try {
      await this.preloadInitialStage();
      const playerId = selection.selectedCharacterId;
      await this.catalog.ensureCharacter(playerId);
      const stage = await StageScene.create(
        this.catalog,
        this.stageData,
        this.stageEntry,
        playerId,
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

  private updateInitialStageLoadProgress(): void {
    const progress = this.initialStageLoadTotal > 0
      ? this.initialStageLoadCompleted / this.initialStageLoadTotal
      : 0;
    this.characterSelectScene?.setLoadingProgress(progress);
  }

  private preloadInitialStage(): Promise<void> {
    if (this.initialStagePreload) return this.initialStagePreload;
    const firstModule = this.stageData.modules[0];
    if (!firstModule) return Promise.reject(new Error('Stage senza moduli'));
    const enabledLayers = firstModule.background_layers?.filter((layer) => layer.enabled !== false);
    const backgroundPaths = enabledLayers?.length
      ? enabledLayers.map((layer) => layer.src)
      : [firstModule.background];
    const characterIds = new Set<string>([this.defaultPlayerId]);
    for (const wave of firstModule.waves ?? []) {
      characterIds.add(wave.character ?? this.defaultEnemyId);
    }
    const tasks: Array<Promise<unknown>> = [
      ...backgroundPaths.map((path) => this.catalog.loadBackground(path)),
      ...[...characterIds].map((id) => this.catalog.ensureCharacter(id)),
    ];
    this.initialStageLoadCompleted = 0;
    this.initialStageLoadTotal = tasks.length;
    this.updateInitialStageLoadProgress();
    this.initialStagePreload = Promise.all(tasks.map(async (task) => {
      await task;
      this.initialStageLoadCompleted += 1;
      this.updateInitialStageLoadProgress();
    })).then(() => undefined).catch((error: unknown) => {
      this.initialStagePreload = null;
      throw error;
    });
    return this.initialStagePreload;
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
