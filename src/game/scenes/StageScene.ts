import { Container, Graphics, Sprite, Text, TextStyle, type Texture } from 'pixi.js';
import type { Scene } from './Scene';
import type { Input } from '../input/Input';
import type { AssetCatalog } from '../assets/AssetCatalog';
import type { BackgroundLayerData, CharacterProfile, ModuleData, StageData, StageItemCatalog, StageItemDefinition, Vec2, WaveData } from '../types';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { EffectsLayer } from '../effects/EffectsLayer';
import { EnemyHudLayer } from '../ui/EnemyHudLayer';
import { Hud } from '../ui/Hud';
import { EXIT_TRIGGER_TOLERANCE, EXIT_X, LOGICAL_HEIGHT, LOGICAL_WIDTH, MODULE_ENTRY_LOCK, MODULE_FADE_SECONDS, PLAYER_START } from '../config';
import { preventCrossings, resolveEnemyAttack, resolvePlayerAttack, separateActors } from '../combat/combat';
import { cameraTargetForPlayer, resolveCameraBounds, smoothCamera, type HorizontalCameraBounds } from '../stage/camera';
import { resolveArcadeAction, resolveGrabAction } from '../input/arcadeControls';
import { SPIN_SPECIAL } from '../combat/attacks';
import { resolveWalkBand, sampleWalkBand } from '../stage/walkBand';
import { loadStage1Items } from '../data/loadData';
import { WorldObject } from '../objects/WorldObject';
import { isPickupKind, itemWithinRange, resolveItemInteraction } from '../objects/itemRules';
import { rectsIntersect } from '../../utils/math';
import {
  COMBO_GRAB_RANGE,
  COMBO_GRAB_WINDOW_SECONDS,
  isForwardHeld,
  selectGrabCandidate,
} from '../combat/grabAssist';

const MELEE_SWING_SECONDS = 0.28;
const MELEE_IMPACT_SECONDS = 0.14;

function authoredLayers(module: ModuleData): BackgroundLayerData[] {
  const enabled = module.background_layers?.filter((layer) => layer.enabled !== false);
  return enabled?.length
    ? enabled
    : [{ src: module.background, parallax: 1, plane: 'main' }];
}

export class StageScene implements Scene {
  readonly root = new Container();
  private readonly backgroundLayers = new Container();
  private readonly foregroundLayers = new Container();
  private readonly world = new Container();
  private readonly grade = new Graphics();
  private readonly ground = new Graphics();
  private readonly actors = new Container();
  private readonly warningGraphics = new Graphics();
  private readonly enemyHud = new EnemyHudLayer();
  private readonly effects = new EffectsLayer();
  private readonly screen = new Container();
  private readonly hud: Hud;
  private readonly messagePanel = new Graphics();
  private readonly messageText = new Text({
    text: '',
    style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 28, fontWeight: '700', fill: 0xfff5e1, align: 'center' }),
  });
  private readonly clearText = new Text({
    text: '',
    style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 22, fontWeight: '700', fill: 0xffeeb2 }),
  });
  private readonly exitGraphics = new Graphics();
  private readonly overlay = new Graphics();
  private readonly overlayTitle = new Text({
    text: '',
    style: new TextStyle({ fontFamily: 'Arial Black, Arial, sans-serif', fontSize: 44, fontWeight: '900', fill: 0xffbc2d }),
  });
  private readonly overlaySubtitle = new Text({
    text: '',
    style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 22, fill: 0xeee6da }),
  });
  private readonly fade = new Graphics();
  private readonly debug = new Graphics();
  private readonly stageCard = new Container();
  private readonly stageCardPanel = new Graphics();
  private readonly stageCardNumber = new Text({
    text: 'STAGE 1',
    style: new TextStyle({ fontFamily: 'Arial Black, Arial, sans-serif', fontSize: 24, fontWeight: '900', fill: 0x38dce8, letterSpacing: 6 }),
  });
  private readonly stageCardName = new Text({
    text: 'THE ZEN',
    style: new TextStyle({
      fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif', fontSize: 76, fontWeight: '900', fontStyle: 'italic',
      fill: 0xffb728, stroke: { color: 0x64162a, width: 7 }, letterSpacing: 4,
    }),
  });
  private readonly stageCardSubtitle = new Text({
    text: 'PALERMO — NO WAY BACK',
    style: new TextStyle({ fontFamily: 'Arial Black, Arial, sans-serif', fontSize: 16, fontWeight: '900', fill: 0xf5f7ff, letterSpacing: 4 }),
  });

  private readonly modules: ModuleData[];
  private readonly backgroundTextures: Array<Texture[] | null>;
  private readonly catalog: AssetCatalog;
  private readonly defaultEnemyId: string;
  private readonly moduleLoads = new Map<number, Promise<void>>();
  readonly player: Player;
  private enemies: Enemy[] = [];

  private moduleIndex = 0;
  private currentModule!: ModuleData;
  private waveData: WaveData[] = [];
  private waveIndex = -1;
  private nextWaveTimer = 0.70;
  private moduleClear = false;
  private clearTimer = 0;
  private exitX = EXIT_X;
  private entryLock = MODULE_ENTRY_LOCK;
  private checkpointModule = 0;

  private hitStop = 0;
  private screenShake = 0;
  private enemyAttackLock = 0;
  private message = '';
  private messageTimer = 0;
  private stageComplete = false;
  private paused = false;
  private debugDraw = false;
  private elapsed = 0;
  private transitionPhase: 'in' | 'out' | null = 'in';
  private transitionAlpha = 255;
  private transitionTarget = 0;
  private transitionLoading = false;
  private stageIntroTimer = 0;
  private stageIntroShown = false;
  private preloadTriggeredForModule = -1;
  private backgroundSprites: Array<{
    sprite: Sprite;
    layer: BackgroundLayerData;
    baseX: number;
    baseY: number;
    revealMask?: Graphics;
  }> = [];
  private worldWidth = LOGICAL_WIDTH;
  private playfieldTop: number = 565;
  private playfieldBottom: number = 684;
  private cameraX = 0;
  private cameraBounds: HorizontalCameraBounds = { min: 0, max: 0 };
  private shakeOffset: Vec2 = { x: 0, y: 0 };
  private specialFxTimer = 0;
  private comboGrabTargetId: number | null = null;
  private comboGrabTimer = 0;
  private readonly itemDefinitions: Map<string, StageItemDefinition>;
  private readonly itemTextures: Map<string, Texture>;
  private worldObjects: WorldObject[] = [];
  private heldObject: WorldObject | null = null;
  private meleeStrikeTimer = 0;
  private meleeSwingTimer = 0;
  private meleeStrikeResolved = true;
  private readonly breakableHits = new Set<WorldObject>();
  private breakableAttack: Player['currentAttack'] = null;
  private breakableAttackElapsed = 0;

  static async create(
    catalog: AssetCatalog,
    stageData: StageData,
    playerId: string,
    defaultEnemyId: string,
  ): Promise<StageScene> {
    const firstModule = stageData.modules[0];
    if (!firstModule) throw new Error('Stage senza moduli');
    const firstCharacters = new Set<string>([playerId]);
    for (const wave of firstModule.waves ?? []) firstCharacters.add(wave.character ?? defaultEnemyId);
    const itemCatalog = await loadStage1Items();
    const referencedItemIds = new Set(stageData.modules.flatMap((module) => (module.items ?? []).map((spawn) => spawn.item)));
    const referencedDefinitions = itemCatalog.items.filter((item) => referencedItemIds.has(item.id));
    for (const item of referencedDefinitions) if (item.drop_item) referencedItemIds.add(item.drop_item);
    const activeItems = itemCatalog.items.filter((item) => referencedItemIds.has(item.id));
    const [firstBackgrounds, , itemTextureList] = await Promise.all([
      Promise.all(authoredLayers(firstModule).map((layer) => catalog.loadBackground(layer.src))),
      Promise.all([...firstCharacters].map((id) => catalog.ensureCharacter(id))),
      Promise.all(activeItems.map((item) => catalog.loadBackground(item.asset))),
    ]);
    const backgrounds = Array<Texture[] | null>(stageData.modules.length).fill(null);
    backgrounds[0] = firstBackgrounds;
    return new StageScene(
      catalog,
      stageData,
      backgrounds,
      playerId,
      defaultEnemyId,
      itemCatalog,
      new Map(activeItems.map((item, index) => [item.id, itemTextureList[index]!])),
    );
  }

  private constructor(
    catalog: AssetCatalog,
    stageData: StageData,
    backgrounds: Array<Texture[] | null>,
    playerId: string,
    defaultEnemyId: string,
    itemCatalog: StageItemCatalog,
    itemTextures: Map<string, Texture>,
  ) {
    this.catalog = catalog;
    const playerProfile = this.catalog.getProfile(playerId);
    this.hud = new Hud(playerProfile.display_name);
    this.defaultEnemyId = defaultEnemyId;
    this.modules = stageData.modules;
    this.backgroundTextures = backgrounds;
    this.itemDefinitions = new Map(itemCatalog.items.map((item) => [item.id, item]));
    this.itemTextures = itemTextures;
    this.actors.sortableChildren = true;
    this.world.sortableChildren = true;
    this.root.sortableChildren = true;
    this.backgroundLayers.sortableChildren = true;
    this.foregroundLayers.sortableChildren = true;
    this.backgroundLayers.zIndex = -1000;
    this.world.zIndex = 0;
    this.foregroundLayers.zIndex = 1000;
    this.screen.zIndex = 2000;

    this.grade
      .rect(0, 0, LOGICAL_WIDTH, 120).fill({ color: 0x000000, alpha: 0.16 })
      .rect(0, LOGICAL_HEIGHT - 58, LOGICAL_WIDTH, 58).fill({ color: 0x000000, alpha: 0.11 })
      .rect(0, 0, 32, LOGICAL_HEIGHT).fill({ color: 0x000000, alpha: 0.11 })
      .rect(LOGICAL_WIDTH - 32, 0, 32, LOGICAL_HEIGHT).fill({ color: 0x000000, alpha: 0.11 });
    this.grade.zIndex = -900;
    this.ground.zIndex = 0;
    this.actors.zIndex = 10;
    this.warningGraphics.zIndex = 8500;
    this.effects.root.zIndex = 9000;

    this.debug.zIndex = 9500;
    this.world.addChild(this.ground, this.actors, this.warningGraphics, this.effects.root, this.enemyHud.root, this.debug);
    this.root.addChild(this.backgroundLayers, this.world, this.foregroundLayers, this.screen);

    this.stageCardPanel
      .rect(0, 0, LOGICAL_WIDTH, 198).fill({ color: 0x050915, alpha: 0.92 })
      .rect(0, 0, LOGICAL_WIDTH, 7).fill(0x2adce9)
      .rect(0, 191, LOGICAL_WIDTH, 7).fill(0xffa923)
      .moveTo(0, 198).lineTo(250, 198).lineTo(358, 232).lineTo(0, 232).fill({ color: 0xe94935, alpha: 0.92 })
      .moveTo(LOGICAL_WIDTH, 198).lineTo(1030, 198).lineTo(922, 232).lineTo(LOGICAL_WIDTH, 232).fill({ color: 0x23cedd, alpha: 0.92 });
    this.stageCardNumber.anchor.set(0.5);
    this.stageCardNumber.position.set(640, 45);
    this.stageCardName.anchor.set(0.5);
    this.stageCardName.position.set(640, 113);
    this.stageCardSubtitle.anchor.set(0.5);
    this.stageCardSubtitle.position.set(640, 169);
    this.stageCard.addChild(this.stageCardPanel, this.stageCardNumber, this.stageCardName, this.stageCardSubtitle);
    this.stageCard.position.y = 246;
    this.stageCard.visible = false;

    this.screen.addChild(
      this.grade, this.hud.root, this.exitGraphics, this.messagePanel, this.messageText, this.clearText,
      this.overlay, this.overlayTitle, this.overlaySubtitle, this.fade, this.stageCard,
    );
    this.messageText.anchor.set(0.5);
    this.messageText.position.set(640, 122);
    this.clearText.anchor.set(0.5);
    this.clearText.position.set(640, 119);
    this.overlayTitle.anchor.set(0.5);
    this.overlayTitle.position.set(640, 320);
    this.overlaySubtitle.anchor.set(0.5);
    this.overlaySubtitle.position.set(640, 378);

    const tuning = playerProfile.gameplay.player ?? {};
    this.player = new Player(
      this.catalog.getBank(playerId),
      { ...PLAYER_START },
      tuning.max_health ?? 120,
      tuning.move_speed ?? 285,
      tuning.depth_speed ?? 205,
    );
    this.actors.addChild(this.player.root);
    this.enterModule(0, false);
  }

  private ensureModuleLoaded(index: number): Promise<void> {
    if (this.backgroundTextures[index]) return Promise.resolve();
    const pending = this.moduleLoads.get(index);
    if (pending) return pending;
    const module = this.modules[index];
    if (!module) return Promise.reject(new Error(`Modulo non valido: ${index}`));
    const characterIds = new Set<string>();
    for (const wave of module.waves ?? []) characterIds.add(wave.character ?? this.defaultEnemyId);
    const loading = Promise.all([
      Promise.all(authoredLayers(module).map((layer) => this.catalog.loadBackground(layer.src))),
      Promise.all([...characterIds].map((id) => this.catalog.ensureCharacter(id))),
    ]).then(([backgrounds]) => {
      this.backgroundTextures[index] = backgrounds;
    }).finally(() => {
      this.moduleLoads.delete(index);
    });
    this.moduleLoads.set(index, loading);
    return loading;
  }

  private preloadNextModule(): void {
    if (this.preloadTriggeredForModule === this.moduleIndex) return;
    this.preloadTriggeredForModule = this.moduleIndex;
    const nextIndex = this.moduleIndex + 1;
    if (nextIndex >= this.modules.length) return;
    void this.ensureModuleLoaded(nextIndex).catch((error) => {
      console.warn(`Precaricamento modulo ${nextIndex + 1} fallito`, error);
    });
  }

  get wantsMenu(): boolean {
    return false;
  }

  private configureBackgroundLayers(module: ModuleData, textures: Texture[]): void {
    for (const item of this.backgroundSprites) {
      item.sprite.destroy();
      item.revealMask?.destroy();
    }
    this.backgroundSprites = [];
    this.backgroundLayers.removeChildren();
    this.foregroundLayers.removeChildren();
    const layers = authoredLayers(module);
    for (let index = 0; index < layers.length; index += 1) {
      const layer = layers[index]!;
      const texture = textures[index];
      if (!texture) throw new Error(`${module.id}: texture layer ${index + 1} mancante`);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0, 0);
      sprite.width = layer.width ?? this.worldWidth;
      sprite.height = layer.height ?? LOGICAL_HEIGHT;
      // Opaque MAIN art cannot reveal a layer behind it. A masked FAR layer is therefore
      // composited above MAIN, but only inside its conservative open-sky polygons.
      sprite.zIndex = layer.reveal_polygons?.length ? layers.length + index : index;
      const baseX = layer.x ?? 0;
      const baseY = layer.y ?? 0;
      sprite.position.set(baseX, baseY);
      const target = layer.plane === 'foreground' ? this.foregroundLayers : this.backgroundLayers;
      target.addChild(sprite);
      let revealMask: Graphics | undefined;
      if (layer.reveal_polygons?.length) {
        revealMask = new Graphics();
        for (const polygon of layer.reveal_polygons) {
          const [first, ...rest] = polygon;
          if (!first || rest.length < 2) continue;
          revealMask.moveTo(first[0], first[1]);
          for (const point of rest) revealMask.lineTo(point[0], point[1]);
          revealMask.closePath().fill(0xffffff);
        }
        target.addChild(revealMask);
        revealMask.zIndex = sprite.zIndex;
        sprite.mask = revealMask;
      }
      this.backgroundSprites.push({ sprite, layer, baseX, baseY, revealMask });
    }
  }

  private updateCamera(dt: number): void {
    const target = cameraTargetForPlayer(this.cameraX, this.player.position.x, LOGICAL_WIDTH, this.cameraBounds);
    this.cameraX = smoothCamera(this.cameraX, target, dt);
    if (Math.abs(this.cameraX - target) < 0.05) this.cameraX = target;
    this.world.position.set(-this.cameraX + this.shakeOffset.x, this.shakeOffset.y);
    for (const { sprite, layer, baseX, baseY, revealMask } of this.backgroundSprites) {
      const parallax = Math.max(0, layer.parallax);
      sprite.position.set(baseX - this.cameraX * parallax + this.shakeOffset.x * Math.min(1, parallax), baseY + this.shakeOffset.y * Math.min(1, parallax));
      revealMask?.position.set(-this.cameraX + this.shakeOffset.x, this.shakeOffset.y);
    }
  }

  private enterModule(index: number, preservePlayer: boolean): void {
    this.moduleIndex = index;
    this.checkpointModule = index;
    this.currentModule = this.modules[index]!;
    const backgrounds = this.backgroundTextures[index];
    if (!backgrounds) throw new Error(`Background non caricato per il modulo ${index + 1}`);
    this.worldWidth = Math.max(LOGICAL_WIDTH, this.currentModule.world_width ?? LOGICAL_WIDTH);
    [this.playfieldTop, this.playfieldBottom] = this.currentModule.playfield_y ?? [565, 684];
    this.cameraBounds = resolveCameraBounds(this.worldWidth, LOGICAL_WIDTH, this.currentModule.camera_bounds);
    this.cameraX = this.cameraBounds.min;
    this.shakeOffset = { x: 0, y: 0 };
    this.configureBackgroundLayers(this.currentModule, backgrounds);
    this.waveData = this.currentModule.waves ?? [];
    this.waveIndex = -1;
    this.nextWaveTimer = 0.70;
    this.moduleClear = false;
    this.clearTimer = 0;
    this.exitX = this.currentModule.exit_x ?? EXIT_X;
    this.entryLock = MODULE_ENTRY_LOCK;

    for (const enemy of this.enemies) {
      this.enemyHud.removeActor(enemy.actorId);
      enemy.destroy();
    }
    this.enemies = [];
    this.effects.clear();
    this.enemyAttackLock = 0;
    this.hitStop = 0;
    this.screenShake = 0;

    const entry = this.currentModule.entry ?? [PLAYER_START.x, PLAYER_START.y];
    this.player.position.x = entry[0];
    this.player.position.y = entry[1];
    this.player.velocity = { x: 0, y: 0 };
    this.player.currentAttack = null;
    this.player.queuedAttack = null;
    this.player.attackHits.clear();
    this.player.comboCounter = 0;
    this.player.comboDisplayTimer = 0;
    this.player.dead = false;
    this.player.removeReady = false;
    this.player.invulnerable = 0.32;
    this.player.releaseGrab();
    this.player.elevation = 0;
    this.player.alpha255 = 255;
    this.player.beginState('idle', 'idle');
    this.player.setPlayfieldBounds(45, this.worldWidth - 45, this.playfieldTop, this.playfieldBottom);
    this.player.setPlayfieldProfile((worldX) => resolveWalkBand(
      this.currentModule,
      worldX,
      [this.playfieldTop, this.playfieldBottom],
    ));
    if (preservePlayer) {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + (this.currentModule.heal ?? 0));
    } else {
      this.player.health = this.player.maxHealth;
      this.player.fury = 0;
    }
    this.player.syncVisual(true);
    this.spawnModuleItems();
    this.updateCamera(1);

    if (index === 0 && !preservePlayer && !this.stageIntroShown) {
      this.stageIntroTimer = 3.2;
      this.stageIntroShown = true;
    }

    this.message = `${this.currentModule.id} — ${this.currentModule.name.toUpperCase()}`;
    this.messageTimer = 2;
  }

  private spawnModuleItems(): void {
    for (const object of this.worldObjects) object.destroy();
    this.worldObjects = [];
    this.heldObject = null;
    for (const spawn of this.currentModule.items ?? []) {
      const definition = this.itemDefinitions.get(spawn.item);
      const texture = this.itemTextures.get(spawn.item);
      if (!definition || !texture) {
        console.warn(`${this.currentModule.id}: oggetto non disponibile: ${spawn.item}`);
        continue;
      }
      const object = new WorldObject(definition, texture, { x: spawn.position[0], y: spawn.position[1] });
      this.worldObjects.push(object);
      this.actors.addChild(object.root);
    }
  }

  private nearestPickup(): WorldObject | null {
    return this.worldObjects
      .filter((object) => object.state === 'ground'
        && isPickupKind(object.definition.kind)
        && itemWithinRange(this.player.position, object.position, 78, 42))
      .sort((a, b) => Math.abs(a.position.x - this.player.position.x) - Math.abs(b.position.x - this.player.position.x))[0] ?? null;
  }

  private nearestFood(): WorldObject | null {
    return this.worldObjects
      .filter((object) => object.state === 'ground'
        && object.definition.kind === 'food'
        && itemWithinRange(this.player.position, object.position, 78, 42))
      .sort((a, b) => Math.abs(a.position.x - this.player.position.x) - Math.abs(b.position.x - this.player.position.x))[0] ?? null;
  }

  private useOrPickupItem(): boolean {
    const food = this.heldObject ? null : this.nearestFood();
    if (food) {
      const healing = food.definition.healing ?? 0;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + healing);
      food.state = 'spent';
      food.root.visible = false;
      this.message = `${food.definition.display_name.toUpperCase()} — +${healing} SALUTE`;
      this.messageTimer = 0.9;
      return true;
    }
    const pickup = this.nearestPickup();
    const interaction = resolveItemInteraction(this.heldObject?.definition.kind ?? null, pickup !== null);
    if (interaction === 'pickup' && pickup) {
      this.heldObject = pickup;
      pickup.pickup();
      this.message = `${pickup.definition.display_name.toUpperCase()} — J USA`;
      this.messageTimer = 1.1;
      return true;
    }
    if (interaction === 'throw' && this.heldObject) {
      const displayName = this.heldObject.definition.display_name.toUpperCase();
      this.heldObject.throwFrom(this.player.position, this.player.facing);
      this.heldObject = null;
      this.player.requestArcadeAttack();
      this.message = `${displayName} — LANCIO`;
      this.messageTimer = 0.7;
      return true;
    }
    if (interaction === 'melee' && this.heldObject) {
      this.player.requestArcadeAttack();
      this.meleeSwingTimer = MELEE_SWING_SECONDS;
      this.meleeStrikeTimer = MELEE_IMPACT_SECONDS;
      this.meleeStrikeResolved = false;
      this.message = `${this.heldObject.definition.display_name.toUpperCase()} — COLPO`;
      this.messageTimer = 0.55;
      return true;
    }
    return false;
  }

  private resolveMeleeStrike(): void {
    if (!this.heldObject || this.heldObject.definition.kind !== 'melee') return;
    const enemy = this.enemies
      .filter((target) => !target.dead
        && (target.position.x - this.player.position.x) * this.player.facing >= -12
        && itemWithinRange(this.player.position, target.position, 150, 48))
      .sort((a, b) => Math.abs(a.position.x - this.player.position.x) - Math.abs(b.position.x - this.player.position.x))[0];
    if (!enemy) return;
    const damage = this.heldObject.definition.damage ?? 12;
    const result = enemy.receiveHit(damage, { x: this.player.facing * 310, y: 0 });
    if (!result.accepted) return;
    this.effects.hitSpark({ x: enemy.position.x, y: enemy.visualTop() + 75 }, false);
    this.effects.damageText({ x: enemy.position.x, y: enemy.visualTop() + 55 }, damage, false);
    this.hitStop = Math.max(this.hitStop, 0.055);
    this.screenShake = Math.max(this.screenShake, 3.5);
  }

  private spawnItem(itemId: string, position: Vec2): void {
    const definition = this.itemDefinitions.get(itemId);
    const texture = this.itemTextures.get(itemId);
    if (!definition || !texture) return;
    const drop = new WorldObject(definition, texture, position);
    this.worldObjects.push(drop);
    this.actors.addChild(drop.root);
  }

  private resolveBreakableHits(): void {
    const attackBox = this.player.activeAttackBox();
    if (!attackBox) return;
    if (this.breakableAttack !== this.player.currentAttack || this.player.attackElapsed < this.breakableAttackElapsed) {
      this.breakableHits.clear();
      this.breakableAttack = this.player.currentAttack;
    }
    this.breakableAttackElapsed = this.player.attackElapsed;
    for (const object of this.worldObjects) {
      if (object.definition.kind !== 'breakable' || object.state !== 'ground') continue;
      if (this.breakableHits.has(object)) continue;
      if (!rectsIntersect(attackBox, object.hurtbox)) continue;
      this.breakableHits.add(object);
      const destroyed = object.hitBreakable();
      this.effects.hitSpark({ x: object.position.x, y: object.position.y - 55 }, destroyed);
      this.hitStop = Math.max(this.hitStop, destroyed ? 0.07 : 0.035);
      this.screenShake = Math.max(this.screenShake, destroyed ? 5 : 2);
      if (destroyed && object.definition.drop_item) {
        this.spawnItem(object.definition.drop_item, { ...object.position });
        this.message = `${object.definition.display_name.toUpperCase()} ROTTO — OGGETTO RILASCIATO`;
        this.messageTimer = 1.0;
      }
    }
  }

  private restart(): void {
    const score = this.player.score;
    this.player.score = Math.max(0, score - 500);
    this.stageComplete = false;
    this.transitionPhase = 'in';
    this.transitionAlpha = 255;
    this.transitionTarget = this.checkpointModule;
    this.enterModule(this.checkpointModule, false);
    this.message = 'CHECKPOINT — RIPROVA';
    this.messageTimer = 1.3;
  }

  private enemyDefaults(profile: CharacterProfile): Required<NonNullable<CharacterProfile['gameplay']['enemy']>> {
    const d = profile.gameplay.enemy ?? {};
    return {
      health: d.health ?? 82,
      aggression: d.aggression ?? 1,
      move_speed_scale: d.move_speed_scale ?? 1,
      damage_scale: d.damage_scale ?? 1,
      attack_speed_scale: d.attack_speed_scale ?? 1,
      heavy_chance: d.heavy_chance ?? 0.13,
      attack_pattern: d.attack_pattern ?? 'weighted',
      cooldown_scale: d.cooldown_scale ?? 1,
      collision_scale: d.collision_scale ?? 1,
      dodge_chance: d.dodge_chance ?? 0,
      dodge_cooldown: d.dodge_cooldown ?? 2.6,
      label: d.label ?? profile.display_name,
    };
  }

  private spawnNextWave(): void {
    this.waveIndex += 1;
    if (this.waveIndex >= this.waveData.length) return;
    const wave = this.waveData[this.waveIndex]!;
    const boss = wave.boss ?? false;
    const characterId = wave.character ?? this.defaultEnemyId;
    const profile = this.catalog.getProfile(characterId);
    const defaults = this.enemyDefaults(profile);
    for (let index = 0; index < wave.spawns.length; index += 1) {
      const spawn = wave.spawns[index]!;
      const enemy = new Enemy(this.catalog.getBank(characterId), { x: spawn[0], y: spawn[1] }, {
        health: wave.health ?? defaults.health,
        aggression: (wave.aggression ?? defaults.aggression) + index * 0.035,
        boss,
        displayName: wave.name ?? (boss ? profile.display_name : defaults.label),
        variantIndex: index % 3,
        characterId,
        moveSpeedScale: wave.move_speed_scale ?? defaults.move_speed_scale,
        damageScale: wave.damage_scale ?? defaults.damage_scale,
        attackSpeedScale: wave.attack_speed_scale ?? defaults.attack_speed_scale,
        heavyChance: wave.heavy_chance ?? defaults.heavy_chance,
        attackPattern: wave.attack_pattern ?? defaults.attack_pattern,
        cooldownScale: wave.cooldown_scale ?? defaults.cooldown_scale,
        collisionScale: wave.collision_scale ?? defaults.collision_scale,
        dodgeChance: wave.dodge_chance ?? defaults.dodge_chance,
        dodgeCooldown: wave.dodge_cooldown ?? defaults.dodge_cooldown,
      });
      enemy.setPlayfieldBounds(45, this.worldWidth - 45, this.playfieldTop, this.playfieldBottom);
      enemy.setPlayfieldProfile((worldX) => resolveWalkBand(
        this.currentModule,
        worldX,
        [this.playfieldTop, this.playfieldBottom],
      ));
      this.enemies.push(enemy);
      this.actors.addChild(enemy.root);
    }
    if (boss) {
      const bossName = (wave.name ?? profile.display_name).toUpperCase();
      this.message = `${bossName} — RESA DEI CONTI`;
      this.messageTimer = 2.1;
      this.screenShake = 5;
    } else {
      this.message = `ONDATA ${this.waveIndex + 1}/${this.waveData.length}`;
      this.messageTimer = 1.05;
    }
  }

  private startTransition(): void {
    if (this.transitionPhase !== null) return;
    this.transitionPhase = 'out';
    this.transitionAlpha = 0;
    this.transitionTarget = this.moduleIndex + 1;
    this.player.beginState('idle', 'idle');
    this.player.velocity = { x: 0, y: 0 };
  }

  private finishTransitionWhenLoaded(index: number): void {
    if (this.transitionLoading) return;
    this.transitionLoading = true;
    void this.ensureModuleLoaded(index).then(() => {
      if (this.transitionPhase !== 'out' || this.transitionTarget !== index) return;
      this.enterModule(index, true);
      this.transitionPhase = 'in';
      this.transitionAlpha = 255;
      this.transitionLoading = false;
    }).catch((error) => {
      console.error(`Caricamento modulo ${index + 1} fallito`, error);
      this.message = 'ERRORE DI CARICAMENTO — RIPROVA';
      this.messageTimer = 2;
      this.transitionLoading = false;
    });
  }

  private updateTransition(dt: number): void {
    const rate = 255 / Math.max(0.05, MODULE_FADE_SECONDS);
    if (this.transitionPhase === 'out') {
      this.transitionAlpha = Math.min(255, this.transitionAlpha + rate * dt);
      if (this.transitionAlpha >= 255) {
        if (this.transitionTarget >= this.modules.length) {
          this.stageComplete = true;
          this.transitionPhase = null;
          this.transitionAlpha = 0;
          return;
        }
        this.finishTransitionWhenLoaded(this.transitionTarget);
      }
    } else if (this.transitionPhase === 'in') {
      this.transitionAlpha = Math.max(0, this.transitionAlpha - rate * dt);
      if (this.transitionAlpha <= 0) this.transitionPhase = null;
    }
  }

  private tryStartGrab(preferredActorId: number | null = null, comboAssist = false): boolean {
    if (!this.player.canStartGrab) return false;
    const target = selectGrabCandidate(
      this.player.position,
      this.player.facing,
      this.enemies,
      comboAssist ? COMBO_GRAB_RANGE : undefined,
      preferredActorId,
    );
    const started = target ? this.player.beginGrab(target) : false;
    if (started) {
      this.comboGrabTargetId = null;
      this.comboGrabTimer = 0;
    }
    return started;
  }

  update(dt: number, input: Input): void {
    if (input.wasPressed('KeyP')) this.paused = !this.paused;
    if (input.wasPressed('F3')) this.debugDraw = !this.debugDraw;
    if (input.wasPressed('KeyR') && this.player.dead) this.restart();
    if (!this.paused && !this.stageComplete && this.transitionPhase === null && this.stageIntroTimer <= 0) {
      const attackPressed = input.wasPressed('KeyJ');
      const jumpPressed = input.wasPressed('KeyK');
      const forwardHeld = isForwardHeld(
        this.player.facing,
        input.isDown('KeyA'),
        input.isDown('KeyD'),
      );
      if (forwardHeld && this.comboGrabTimer > 0 && this.comboGrabTargetId !== null) {
        this.tryStartGrab(this.comboGrabTargetId, true);
      }
      const action = resolveArcadeAction({
        attackPressed,
        jumpPressed,
        attackHeld: input.isDown('KeyJ'),
        jumpHeld: input.isDown('KeyK'),
      });
      const grabAction = this.player.grabbedTarget
        ? resolveGrabAction({ attackPressed, jumpPressed })
        : null;
      if (grabAction === 'throw') this.player.requestThrow();
      else if (grabAction === 'strike') this.player.requestGrabStrike();
      else if (action === 'special') this.player.requestSpinSpecial();
      else {
        if (action === 'jump') {
          const horizontalIntent = Number(input.isDown('KeyD')) - Number(input.isDown('KeyA'));
          this.player.requestJump(horizontalIntent);
        }
        if (action === 'attack') {
          if (this.player.isAirborne) this.player.requestAirKick();
          else if (!this.useOrPickupItem() && !this.tryStartGrab()) this.player.requestArcadeAttack();
        }
      }
    }

    if (this.paused) {
      this.updateVisualLayers(dt);
      return;
    }
    this.elapsed += dt;
    this.comboGrabTimer = Math.max(0, this.comboGrabTimer - dt);
    if (this.comboGrabTimer <= 0) this.comboGrabTargetId = null;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    if (this.transitionPhase !== null) {
      this.updateTransition(dt);
      this.updateVisualLayers(dt);
      return;
    }
    if (this.stageIntroTimer > 0) {
      this.stageIntroTimer = Math.max(0, this.stageIntroTimer - dt);
      this.player.update(dt, input, false);
      this.updateVisualLayers(dt);
      return;
    }
    this.preloadNextModule();
    if (this.stageComplete) {
      this.updateVisualLayers(dt);
      return;
    }

    this.entryLock = Math.max(0, this.entryLock - dt);
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      this.updateVisualLayers(dt);
      return;
    }

    this.screenShake = Math.max(0, this.screenShake - 24 * dt);
    if (this.screenShake > 0) {
      const amount = Math.min(8, this.screenShake);
      this.shakeOffset = { x: (Math.random() * 2 - 1) * amount, y: (Math.random() * 2 - 1) * amount };
    } else {
      this.shakeOffset = { x: 0, y: 0 };
    }

    this.enemyAttackLock = Math.max(0, this.enemyAttackLock - dt);
    const previous = new Map<number, Vec2>();
    for (const actor of [this.player, ...this.enemies]) previous.set(actor.actorId, { ...actor.position });

    const liveBefore = this.enemies.filter((enemy) => !enemy.dead && enemy.state !== 'spawn');
    const combatReady = liveBefore.filter((enemy) => !['hit', 'knockdown', 'getup'].includes(enemy.state));
    const targetPool = combatReady.length ? combatReady : liveBefore;
    const nearest = [...targetPool].sort((a, b) =>
      (Math.abs(a.position.x - this.player.position.x) + Math.abs(a.position.y - this.player.position.y) * 1.35) -
      (Math.abs(b.position.x - this.player.position.x) + Math.abs(b.position.y - this.player.position.y) * 1.35)
    )[0];
    this.player.setAutoTarget(nearest?.position.x ?? null);
    this.player.update(dt, input, this.entryLock <= 0);
    if (this.heldObject) {
      const useProgress = this.meleeSwingTimer > 0
        ? 1 - this.meleeSwingTimer / MELEE_SWING_SECONDS
        : 0;
      this.heldObject.holdAt(this.player.position, this.player.facing, useProgress);
    }
    this.meleeSwingTimer = Math.max(0, this.meleeSwingTimer - dt);
    this.meleeStrikeTimer = Math.max(0, this.meleeStrikeTimer - dt);
    if (!this.meleeStrikeResolved && this.meleeStrikeTimer <= 0) {
      this.meleeStrikeResolved = true;
      this.resolveMeleeStrike();
    }
    for (const object of this.worldObjects) {
      object.update(dt);
      if (object.state !== 'thrown') continue;
      for (const enemy of this.enemies) {
        if (enemy.dead || object.hitActors.has(enemy.actorId)) continue;
        if (!itemWithinRange(object.position, enemy.position, 58, 44) || object.elevation > 135) continue;
        const damage = object.definition.damage ?? 10;
        const direction = Math.sign(object.velocity.x) || this.player.facing;
        const result = enemy.receiveHit(damage, { x: direction * 440, y: 0 }, true, 330);
        if (!result.accepted) continue;
        object.hitActors.add(enemy.actorId);
        object.state = 'spent';
        object.root.visible = false;
        this.effects.hitSpark({ x: enemy.position.x, y: enemy.visualTop() + 70 }, true);
        this.effects.damageText({ x: enemy.position.x, y: enemy.visualTop() + 50 }, damage, true);
        this.hitStop = Math.max(this.hitStop, 0.085);
        this.screenShake = Math.max(this.screenShake, 6);
        break;
      }
    }
    if (this.player.isSpinSpecialActive) {
      this.specialFxTimer -= dt;
      if (this.specialFxTimer <= 0) {
        this.effects.fireRush({
          x: this.player.position.x + this.player.facing * 72,
          y: this.player.position.y - this.player.elevation - 92,
        }, this.player.facing);
        this.specialFxTimer = 0.045;
      }
    } else {
      this.specialFxTimer = 0;
    }
    const playerCanBePressured = !['hit', 'knockdown', 'getup'].includes(this.player.state) && !this.player.dead;
    let activeAttacker = combatReady.find((enemy) => enemy.state === 'attack');
    if (!activeAttacker && combatReady.length && this.enemyAttackLock <= 0 && playerCanBePressured) {
      activeAttacker = [...combatReady].sort((a, b) => {
        const ca = Math.max(0, a.attackCooldown) * 95 + Math.abs(a.position.x - this.player.position.x) + Math.abs(a.position.y - this.player.position.y) * 1.7;
        const cb = Math.max(0, b.attackCooldown) * 95 + Math.abs(b.position.x - this.player.position.x) + Math.abs(b.position.y - this.player.position.y) * 1.7;
        return ca - cb;
      })[0];
    }
    const supporters = liveBefore.filter((enemy) => enemy !== activeAttacker).sort((a, b) => a.actorId - b.actorId);
    const supportRank = new Map(supporters.map((enemy, index) => [enemy.actorId, index]));
    const attackBefore = new Map(this.enemies.map((enemy) => [enemy.actorId, enemy.state === 'attack']));
    for (const enemy of this.enemies) enemy.update(dt, this.player, this.enemies, enemy === activeAttacker, supportRank.get(enemy.actorId) ?? 0);
    if (this.enemies.some((enemy) => attackBefore.get(enemy.actorId) && enemy.state !== 'attack')) this.enemyAttackLock = Math.max(this.enemyAttackLock, 0.40);

    for (const actor of [this.player, ...this.enemies]) {
      if (!actor.landedThisFrame) continue;
      const heavyLanding = actor.landingImpact >= 390;
      this.effects.landingDust(actor.position, heavyLanding);
      this.screenShake = Math.max(this.screenShake, heavyLanding ? 7 : 4);
      this.hitStop = Math.max(this.hitStop, heavyLanding ? 0.035 : 0.022);
    }

    for (const event of resolvePlayerAttack(this.player, this.enemies)) {
      if (!event.heavy && event.targetActorId !== undefined) {
        this.comboGrabTargetId = event.targetActorId;
        this.comboGrabTimer = COMBO_GRAB_WINDOW_SECONDS;
      }
      this.hitStop = Math.max(this.hitStop, event.hitStop);
      this.screenShake = Math.max(this.screenShake, event.shake);
      this.effects.hitSpark(event.position, event.heavy);
      this.effects.damageText(event.position, event.damage, event.heavy);
      if (this.player.currentAttack === SPIN_SPECIAL) this.effects.fireRush(event.position, this.player.facing, true);
    }
    this.resolveBreakableHits();
    for (const enemy of this.enemies) {
      const event = resolveEnemyAttack(enemy, this.player);
      if (!event) continue;
      this.hitStop = Math.max(this.hitStop, event.hitStop);
      this.screenShake = Math.max(this.screenShake, event.shake);
      this.effects.hitSpark(event.position, event.heavy);
      this.effects.damageText(event.position, event.damage, event.heavy);
      this.enemyAttackLock = Math.max(this.enemyAttackLock, 0.48);
    }

    separateActors([this.player, ...this.enemies], this.player);
    preventCrossings(this.player, this.enemies, previous);
    separateActors([this.player, ...this.enemies], this.player);
    for (const actor of [this.player, ...this.enemies]) actor.syncVisual();

    const removed = this.enemies.filter((enemy) => enemy.removeReady);
    this.enemies = this.enemies.filter((enemy) => !enemy.removeReady);
    for (const enemy of removed) {
      this.enemyHud.removeActor(enemy.actorId);
      enemy.destroy();
    }
    this.effects.update(dt);

    const liveEnemies = this.enemies.filter((enemy) => !enemy.dead);
    const anyEnemyObjects = this.enemies.length > 0;
    if (!liveEnemies.length && !anyEnemyObjects && this.waveIndex < this.waveData.length - 1) {
      const nextWave = this.waveData[this.waveIndex + 1];
      const triggerReached = this.player.position.x >= (nextWave?.trigger_x ?? 0);
      if (triggerReached) {
        this.nextWaveTimer -= dt;
        if (this.nextWaveTimer <= 0) {
          this.spawnNextWave();
          this.nextWaveTimer = 0.82;
        }
      } else {
        this.nextWaveTimer = 0.18;
      }
    } else if (!liveEnemies.length && !anyEnemyObjects && this.waveIndex === this.waveData.length - 1) {
      this.clearTimer += dt;
      if (this.clearTimer > 0.38) this.moduleClear = true;
      if (this.moduleClear && this.player.visualHorizontalBounds().right >= this.exitX - EXIT_TRIGGER_TOLERANCE) this.startTransition();
    } else {
      this.clearTimer = 0;
      this.moduleClear = false;
    }

    this.updateVisualLayers(dt);
  }

  private updateVisualLayers(dt: number): void {
    this.updateCamera(dt);
    const introProgress = 3.2 - this.stageIntroTimer;
    const showingStageIntro = this.stageIntroTimer > 0;
    this.stageCard.visible = showingStageIntro && !this.paused;
    this.hud.root.visible = !showingStageIntro;
    if (this.stageCard.visible) {
      this.stageCard.alpha = Math.min(1, introProgress / 0.22, this.stageIntroTimer / 0.42);
      const pulse = 1 + Math.sin(introProgress * 6) * 0.012;
      this.stageCardName.scale.set(pulse, pulse);
    }
    this.ground.clear();
    for (const actor of [this.player, ...this.enemies]) {
      const fallen = actor.state === 'knockdown' || actor.state === 'dead';
      const radius = actor.collisionRadius;
      const airborneScale = Math.max(0.45, 1 - actor.elevation / 480);
      this.ground
        .ellipse(actor.position.x, actor.position.y + 1, radius.x * (fallen ? 1.18 : 0.92) * airborneScale, (fallen ? 5 : 8) * airborneScale)
        .fill({ color: 0x100b08, alpha: (actor.dead ? 0.10 : 0.20) * airborneScale });
    }
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const color = enemy.isBoss ? 0xb02a24 : (enemy.variantIndex === 1 ? 0x69499b : 0x415c80);
      const width = enemy.isBoss ? 104 : 76;
      this.ground.ellipse(enemy.position.x, enemy.position.y - 1.5, width / 2, 6.5).stroke({ color, width: 2, alpha: 0.95 });
    }

    this.warningGraphics.clear();
    for (const enemy of this.enemies) {
      const ratio = enemy.attackWarningRatio;
      if (ratio <= 0 || enemy.dead) continue;
      const cx = enemy.position.x + (enemy.isBoss ? 58 : 46);
      const cy = enemy.visualTop() - 20;
      const radius = 13 + ratio * 6;
      this.warningGraphics.circle(cx, cy, radius).stroke({ color: 0xffd44a, width: 3, alpha: 0.95 });
      this.warningGraphics.moveTo(cx, cy - 7).lineTo(cx, cy + 2).stroke({ color: 0xfff0b4, width: 3 });
      this.warningGraphics.circle(cx, cy + 7, 1.8).fill(0xfff0b4);
    }

    this.enemyHud.update(this.enemies);
    this.hud.update(this.player, this.enemies, this.moduleIndex, this.currentModule.id, this.waveIndex, this.waveData.length, this.modules.length);

    this.exitGraphics.clear();
    this.clearText.visible = false;
    if (this.moduleClear && this.transitionPhase === null) {
      const pulse = 185 + 55 * Math.abs(Math.sin(this.elapsed * 4.2));
      const x = Math.min(1255, Math.round(this.exitX - this.cameraX + 34));
      this.exitGraphics.moveTo(x - 42, 530).lineTo(x, 555).lineTo(x - 42, 580).closePath().fill({ color: (Math.round(pulse) << 8) + 0xff0000 + 45 });
      this.clearText.visible = this.messageTimer <= 0;
      this.clearText.text = this.moduleIndex === this.modules.length - 1 ? 'TETTO LIBERO — VAI A DESTRA' : 'AREA LIBERA — VAI A DESTRA';
    }

    this.messagePanel.clear();
    this.messageText.visible = this.messageTimer > 0 && !showingStageIntro;
    if (this.messageText.visible) {
      this.messageText.text = this.message;
      const width = Math.max(260, this.messageText.width + 34);
      this.messagePanel.roundRect(640 - width / 2, 100, width, 44, 4).fill({ color: 0x000000, alpha: 0.72 });
    }

    this.debug.clear();
    if (this.debugDraw) this.drawDebug();

    this.overlay.clear();
    this.overlayTitle.visible = false;
    this.overlaySubtitle.visible = false;
    if (this.paused) this.showCenterOverlay('PAUSA', 'PREMI P PER CONTINUARE');
    else if (this.player.dead) this.showCenterOverlay('MARCO È A TERRA', 'PREMI R — RIPARTI DAL CHECKPOINT');
    else if (this.stageComplete) this.showCenterOverlay('STAGE 1 COMPLETATO', 'ZEN — BOSS PROVVISORIO SCONFITTO');

    this.fade.clear();
    if (this.transitionPhase !== null && this.transitionAlpha > 0) {
      this.fade.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT).fill({ color: 0x000000, alpha: this.transitionAlpha / 255 });
    }
  }

  private showCenterOverlay(title: string, subtitle: string): void {
    this.overlay.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT).fill({ color: 0x000000, alpha: 0.70 });
    this.overlayTitle.visible = true;
    this.overlaySubtitle.visible = true;
    this.overlayTitle.text = title;
    this.overlaySubtitle.text = subtitle;
  }

  private drawDebug(): void {
    const g = this.debug;
    const walkBand = sampleWalkBand(
      this.currentModule,
      this.worldWidth,
      [this.playfieldTop, this.playfieldBottom],
      48,
    );
    const polygon = [
      ...walkBand.map(({ x, top }) => ({ x, y: top })),
      ...[...walkBand].reverse().map(({ x, bottom }) => ({ x, y: bottom })),
    ];
    g.poly(polygon).fill({ color: 0x28ff6e, alpha: 0.12 }).stroke({ color: 0x28ff6e, width: 2, alpha: 0.95 });
    if (this.currentModule.horizon_y !== undefined) {
      g.moveTo(0, this.currentModule.horizon_y).lineTo(this.worldWidth, this.currentModule.horizon_y)
        .stroke({ color: 0xff45d7, width: 2, alpha: 0.85 });
    }
    for (const actor of [this.player, ...this.enemies]) {
      const hb = actor.hurtbox;
      g.rect(hb.x, hb.y, hb.width, hb.height).stroke({ color: 0x50d2ff, width: 2 });
      const r = actor.collisionRadius;
      g.ellipse(actor.position.x, actor.position.y, r.x, r.y).stroke({ color: 0xb95aff, width: 2 });
      g.moveTo(actor.position.x, actor.position.y - 92).lineTo(actor.position.x + actor.facing * 58, actor.position.y - 92).stroke({ color: 0xffeb46, width: 3 });
    }
    const pb = this.player.activeAttackBox();
    if (pb) g.rect(pb.x, pb.y, pb.width, pb.height).stroke({ color: 0xffd228, width: 2 });
    for (const enemy of this.enemies) {
      const box = enemy.activeAttackBox();
      if (box) g.rect(box.x, box.y, box.width, box.height).stroke({ color: 0xff4646, width: 2 });
    }
  }

  destroy(): void {
    for (const enemy of this.enemies) enemy.destroy();
    this.player.destroy();
    this.root.destroy({ children: true });
  }
}
