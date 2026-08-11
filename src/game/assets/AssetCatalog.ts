import { Assets, Rectangle, Texture } from 'pixi.js';
import type { AnimationBank, AnimationClip, CharacterProfile, FrameMeta, VisualFrame } from '../types';
import { publicUrl } from '../data/paths';

interface AtlasPage {
  file: string;
  width: number;
  height: number;
}

interface AtlasFrame {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  source_width: number;
  source_height: number;
  source_x: number;
  source_y: number;
}

interface AtlasManifest {
  schema: number;
  pages: AtlasPage[];
  frames: Record<string, AtlasFrame>;
}

function expandedValues(frames: number, values: number[] | undefined, fallback: number, label: string): number[] {
  if (!values?.length) return Array.from({ length: frames }, () => fallback);
  if (values.length === 1) return Array.from({ length: frames }, () => values[0] ?? fallback);
  if (values.length !== frames) throw new Error(`${label} non coerenti: ${values.length} per ${frames} frame`);
  return [...values];
}

function frameName(index: number): string {
  return `${index.toString().padStart(2, '0')}.png`;
}

function relativeRoot(path: string): string {
  const separator = path.lastIndexOf('/');
  return separator >= 0 ? path.slice(0, separator + 1) : '';
}

export class AssetCatalog {
  private readonly banks = new Map<string, AnimationBank>();
  private readonly pendingBanks = new Map<string, Promise<AnimationBank>>();
  private readonly profiles = new Map<string, CharacterProfile>();
  private readonly frameMeta: Record<string, FrameMeta>;

  constructor(frameMeta: Record<string, FrameMeta>) {
    this.frameMeta = frameMeta;
  }

  registerProfile(profile: CharacterProfile): void {
    this.profiles.set(profile.id, profile);
  }

  getProfile(id: string): CharacterProfile {
    const profile = this.profiles.get(id);
    if (!profile) throw new Error(`Profilo non registrato: ${id}`);
    return profile;
  }

  getBank(id: string): AnimationBank {
    const bank = this.banks.get(id);
    if (!bank) throw new Error(`AnimationBank non caricata: ${id}`);
    return bank;
  }

  async ensureCharacter(id: string): Promise<AnimationBank> {
    const cached = this.banks.get(id);
    if (cached) return cached;
    const pending = this.pendingBanks.get(id);
    if (pending) return pending;
    const loading = this.loadCharacter(this.getProfile(id));
    this.pendingBanks.set(id, loading);
    try {
      return await loading;
    } finally {
      this.pendingBanks.delete(id);
    }
  }

  async loadBackground(path: string): Promise<Texture> {
    return Assets.load<Texture>(publicUrl(path));
  }

  private async loadAtlas(profile: CharacterProfile): Promise<Map<string, Texture> | null> {
    const atlasPath = profile.assets.texture_atlas;
    if (!atlasPath) return null;
    const response = await fetch(publicUrl(atlasPath));
    if (!response.ok) throw new Error(`${profile.id}: atlas non caricabile (${response.status})`);
    const manifest = await response.json() as AtlasManifest;
    if (manifest.schema !== 1) throw new Error(`${profile.id}: schema atlas non supportato`);
    const root = relativeRoot(atlasPath);
    const pages = await Promise.all(
      manifest.pages.map((page) => Assets.load<Texture>(publicUrl(`${root}${page.file}`))),
    );
    const textures = new Map<string, Texture>();
    for (const [name, item] of Object.entries(manifest.frames)) {
      const page = pages[item.page];
      if (!page) throw new Error(`${profile.id}: pagina atlas mancante per ${name}`);
      textures.set(name, new Texture({
        source: page.source,
        label: `${profile.id}/${name}`,
        frame: new Rectangle(item.x, item.y, item.width, item.height),
        orig: new Rectangle(0, 0, item.source_width, item.source_height),
        trim: new Rectangle(item.source_x, item.source_y, item.width, item.height),
      }));
    }
    return textures;
  }

  async loadCharacter(profile: CharacterProfile): Promise<AnimationBank> {
    this.registerProfile(profile);
    const cached = this.banks.get(profile.id);
    if (cached) return cached;

    const atlas = await this.loadAtlas(profile);
    const clips = new Map<string, AnimationClip>();
    for (const [name, spec] of Object.entries(profile.animations)) {
      const durations = expandedValues(spec.frames, spec.durations, 0.1, 'Durate');
      const visualScales = expandedValues(spec.frames, spec.visual_scales, 1, 'Scale visive');
      const frameSequence = spec.frame_sequence ?? Array.from({ length: spec.frames }, (_, index) => index + 1);
      const frames: VisualFrame[] = [];
      for (let i = 0; i < spec.frames; i += 1) {
        const sourceFrame = frameSequence[i] ?? i + 1;
        const filename = `${spec.folder}/${frameName(sourceFrame)}`;
        const rel = `${profile.assets.animation_root}/${filename}`;
        const texture = atlas?.get(filename) ?? await Assets.load<Texture>(publicUrl(rel));
        const key = `/${rel}`;
        const meta = this.frameMeta[key] ?? {
          width: texture.width,
          height: texture.height,
          bounds: [0, 0, texture.width, texture.height] as [number, number, number, number],
          offsetY: 0,
        };
        frames.push({
          texture,
          duration: durations[i] ?? durations[0] ?? 0.1,
          offsetX: 0,
          offsetY: meta.offsetY,
          scale: visualScales[i] ?? 1,
          bounds: meta.bounds,
          width: meta.width,
          height: meta.height,
        });
      }
      clips.set(name, {
        frames,
        loop: spec.loop ?? false,
        sourceFacing: spec.source_facing ?? 1,
        referenceSpeed: spec.reference_speed,
        contactFrame: spec.contact_frame,
        frameBlend: Math.max(0, spec.frame_blend ?? 0),
      });
    }
    if (!clips.has('idle')) throw new Error(`${profile.id}: clip idle mancante`);
    const bank = { clips } satisfies AnimationBank;
    this.banks.set(profile.id, bank);
    return bank;
  }
}
