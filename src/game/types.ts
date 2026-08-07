import type { Texture } from 'pixi.js';

export type Vec2 = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };

export interface AnimationJson {
  folder: string;
  frames: number;
  durations: number[];
  loop?: boolean;
  source_facing?: -1 | 1;
  reference_speed?: number;
  contact_frame?: number;
}

export interface CharacterProfile {
  schema: number;
  id: string;
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
      cooldown_scale?: number;
      collision_scale?: number;
      label?: string;
    };
  };
  factory: Record<string, unknown>;
  animations: Record<string, AnimationJson>;
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
  cooldown_scale?: number;
  collision_scale?: number;
}

export interface ModuleData {
  id: string;
  name: string;
  background: string;
  entry?: [number, number];
  exit_x?: number;
  heal?: number;
  /** Optional world-space width used by a future scrolling camera. Defaults to 1280. */
  world_width?: number;
  /** Optional horizontal camera limits in world units. */
  camera_bounds?: [number, number];
  waves: WaveData[];
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
  bounds: [number, number, number, number];
  width: number;
  height: number;
  renderScaleX?: number;
}

export interface AnimationClip {
  frames: VisualFrame[];
  loop: boolean;
  sourceFacing: -1 | 1;
  referenceSpeed?: number;
  contactFrame?: number;
}

export interface AnimationBank {
  clips: Map<string, AnimationClip>;
}

export interface AttackData {
  name: string;
  damage: number;
  startup: number;
  active: number;
  recovery: number;
  rangeX: number;
  rangeY: number;
  knockbackX: number;
  knockbackY: number;
  furyGain: number;
  hitStop: number;
  shake: number;
  knockdown?: boolean;
  multiHit?: boolean;
}

export interface CombatEvent {
  position: Vec2;
  damage: number;
  heavy: boolean;
  hitStop: number;
  shake: number;
  targetKilled: boolean;
  blocked?: boolean;
}
