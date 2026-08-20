import type { Texture } from 'pixi.js';

export type Vec2 = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type EnemyAttackPattern = 'weighted' | 'alternate' | 'single';

export interface AnimationJson {
  folder: string;
  /** Number of frames used by the runtime clip. */
  frames: number;
  /** Total authored frames preserved in the source folder. Defaults to `frames`. */
  source_frames?: number;
  /** One-based authored frame indexes selected by the runtime, in playback order. */
  frame_sequence?: number[];
  durations: number[];
  /** Optional per-frame display scale. Use this only to preserve perceived body size across foreshortened poses. */
  visual_scales?: number[];
  loop?: boolean;
  source_facing?: -1 | 1;
  reference_speed?: number;
  contact_frame?: number;
  /** Short cross-fade between authored frames; useful for dense painted locomotion. */
  frame_blend?: number;
}

export interface CharacterProfile {
  schema: number;
  id: string;
  /** Optional data inheritance used by variants and technical prototypes. */
  extends?: string;
  display_name: string;
  role: 'player' | 'enemy' | 'elite' | 'boss';
  height_cm: number;
  body_type: string;
  visual_height: number;
  assets: {
    master_root: string;
    animation_root: string;
    texture_atlas?: string;
  };
  identity: Record<string, unknown>;
  gameplay: {
    player?: {
      max_health?: number;
      move_speed?: number;
      depth_speed?: number;
    };
    enemy?: {
      health?: number;
      aggression?: number;
      move_speed_scale?: number;
      damage_scale?: number;
      attack_speed_scale?: number;
      heavy_chance?: number;
      /** Selection policy for one-slot, alternating two-slot, or weighted enemies. */
      attack_pattern?: EnemyAttackPattern;
      cooldown_scale?: number;
      collision_scale?: number;
      /** Uniform feet-anchored scale for the whole character, never per-frame. */
      visual_scale?: number;
      /** Optional reactive evade used by agile enemy templates. */
      dodge_chance?: number;
      /** Minimum seconds between successful evades. */
      dodge_cooldown?: number;
      label?: string;
    };
  };
  factory: Record<string, unknown>;
  animations: Record<string, AnimationJson>;
  /** Preserved authored clips excluded from loading and gameplay. */
  archived_animations?: Record<string, AnimationJson>;
  selection?: {
    portrait?: string;
    subtitle?: string;
    stats?: { strength: number; speed: number; technique: number };
    prototype?: boolean;
  };
}

export interface CharacterIndex {
  schema: number;
  characters: string[];
  default_player: string;
  default_enemy: string;
}

export interface WaveData {
  health?: number;
  aggression?: number;
  spawns: [number, number][];
  character?: string;
  name?: string;
  boss?: boolean;
  move_speed_scale?: number;
  damage_scale?: number;
  attack_speed_scale?: number;
  heavy_chance?: number;
  attack_pattern?: EnemyAttackPattern;
  cooldown_scale?: number;
  collision_scale?: number;
  dodge_chance?: number;
  dodge_cooldown?: number;
  /** World-space X that unlocks this wave in a scrolling module. */
  trigger_x?: number;
}

export interface BackgroundLayerData {
  src: string;
  /** Disabled authored placeholders are ignored by loading and rendering. */
  enabled?: boolean;
  /** 0 is fixed to the horizon, 1 follows the gameplay camera. */
  parallax: number;
  plane?: 'far' | 'main' | 'foreground';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** Main-world polygons where this layer is visible through an otherwise opaque layer above it. */
  reveal_polygons?: Array<Array<[number, number]>>;
}

export interface ModuleData {
  id: string;
  name: string;
  /** Art approval is separate from runtime/playability status. */
  art_status?: 'approved' | 'placeholder_rebuild_required';
  reference_actor_height?: number;
  horizon_y?: number;
  background: string;
  /** Ordered authored layers. `background` remains the backwards-compatible main fallback. */
  background_layers?: BackgroundLayerData[];
  entry?: [number, number];
  exit_x?: number;
  heal?: number;
  /** Optional world-space width used by a future scrolling camera. Defaults to 1280. */
  world_width?: number;
  /** Optional horizontal camera limits in world units. */
  camera_bounds?: [number, number];
  /** Homogeneous walkable band expressed as [top feet Y, bottom feet Y]. */
  playfield_y?: [number, number];
  /** World-space samples describing the upper edge of the walkable feet band. */
  walk_top?: Array<[number, number]>;
  /** World-space samples describing the lower edge of the walkable feet band. */
  walk_bottom?: Array<[number, number]>;
  /** Optional [worldX, screenYOffset] samples for ramps, rises and descents. */
  ground_profile?: Array<[number, number]>;
  /** Data-driven objects placed in world space for this module. */
  items?: StageItemSpawn[];
  waves: WaveData[];
}

export interface StageItemSpawn {
  item: string;
  position: [number, number];
}

export type PlayerSlot = 1 | 2 | 3 | 4;
export type CombatTeam = 'players' | 'enemies' | 'neutral';

export interface PlayerSlotConfig {
  slot: PlayerSlot;
  characterId: string;
  inputDevice: 'keyboard' | 'gamepad';
  gamepadIndex?: number;
}

export interface CameraBounds {
  left: number;
  right: number;
  viewportWidth: number;
}

export type WeaponKind = 'melee' | 'throwable' | 'firearm';

export interface WeaponDefinition {
  id: string;
  kind: WeaponKind;
  damage: number;
  ammo?: number;
  projectileSpeed?: number;
  pickupAnimation?: string;
  attackAnimation: string;
  dropOnHit?: boolean;
}

export type StageItemKind = 'melee' | 'throwable' | 'food' | 'breakable' | 'scenery';

export interface StageItemDefinition {
  id: string;
  display_name: string;
  kind: StageItemKind;
  asset: string;
  /** Source master is retained outside the runtime build for future reprocessing. */
  source_master: string;
  gameplay_status: 'prototype' | 'catalogued' | 'reference_only';
  damage?: number;
  healing?: number;
  ammo?: number;
  world_scale?: number;
  held_scale?: number;
  held_angle?: number;
  throw_speed?: number;
  durability?: number;
  drop_item?: string;
  notes?: string[];
}

export interface StageItemCatalog {
  schema: number;
  stage_id: string;
  items: StageItemDefinition[];
}

export interface EnemyMoveSet {
  characterId: string;
  attacks: string[];
}

export interface StageData {
  schema: number;
  build_scope: string;
  stage_name: string;
  modules: ModuleData[];
}

export interface FrameMeta {
  width: number;
  height: number;
  bounds: [number, number, number, number];
  offsetY: number;
}

export interface VisualFrame {
  texture: Texture;
  duration: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  bounds: [number, number, number, number];
  width: number;
  height: number;
}

export interface AnimationClip {
  frames: VisualFrame[];
  loop: boolean;
  sourceFacing: -1 | 1;
  referenceSpeed?: number;
  contactFrame?: number;
  frameBlend?: number;
}

export interface AnimationBank {
  clips: Map<string, AnimationClip>;
}

export interface AttackData {
  name: string;
  /** Animation clip used when it differs from the gameplay action name. */
  animation?: string;
  damage: number;
  startup: number;
  active: number;
  recovery: number;
  rangeX: number;
  rangeY: number;
  knockbackX: number;
  knockbackY: number;
  /** Upward launch speed for exaggerated arcade knockdowns. */
  launchVelocity?: number;
  furyGain: number;
  hitStop: number;
  shake: number;
  knockdown?: boolean;
  multiHit?: boolean;
}

export interface CombatEvent {
  /** Actor that accepted the hit; used by short, local combat assists. */
  targetActorId?: number;
  position: Vec2;
  damage: number;
  heavy: boolean;
  hitStop: number;
  shake: number;
  targetKilled: boolean;
  blocked?: boolean;
}
