import { Assets, Texture } from 'pixi.js';
import type { AnimationBank, AnimationClip, CharacterProfile, FrameMeta, VisualFrame } from '../types';
import { publicUrl } from '../data/paths';

function expandedDurations(frames: number, values: number[]): number[] {
  if (values.length === 1) return Array.from({ length: frames }, () => values[0] ?? 0.1);
  if (values.length !== frames) throw new Error(`Durate non coerenti: ${values.length} per ${frames} frame`);
  return [...values];
}

function frameName(index: number): string {
  return `${index.toString().padStart(2, '0')}.png`;
}

export class AssetCatalog {
  private readonly banks = new Map<string, AnimationBank>();
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

  async loadBackground(path: string): Promise<Texture> {
    return Assets.load<Texture>(publicUrl(path));
  }

  async loadCharacter(profile: CharacterProfile): Promise<AnimationBank> {
    this.registerProfile(profile);
    const cached = this.banks.get(profile.id);
    if (cached) return cached;

    const clips = new Map<string, AnimationClip>();
    for (const [name, spec] of Object.entries(profile.animations)) {
      const durations = expandedDurations(spec.frames, spec.durations);
      const frames: VisualFrame[] = [];
      for (let i = 1; i <= spec.frames; i += 1) {
        const rel = `${profile.assets.animation_root}/${spec.folder}/${frameName(i)}`;
        const url = publicUrl(rel);
        const texture = await Assets.load<Texture>(url);
        const key = `/${rel}`;
        const meta = this.frameMeta[key] ?? {
          width: texture.width,
          height: texture.height,
          bounds: [0, 0, texture.width, texture.height] as [number, number, number, number],
          offsetY: 0,
        };
        frames.push({
          texture,
          duration: durations[i - 1] ?? durations[0] ?? 0.1,
          offsetX: 0,
          offsetY: meta.offsetY,
          bounds: meta.bounds,
          width: meta.width,
          height: meta.height,
        });
      }
      clips.set(name, {
        frames,
        loop: spec.loop ?? false,
        sourceFacing: spec.source_facing ?? 1,
      });
    }
    if (!clips.has('idle')) throw new Error(`${profile.id}: clip idle mancante`);
    const bank = { clips } satisfies AnimationBank;
    this.banks.set(profile.id, bank);
    return bank;
  }
}
