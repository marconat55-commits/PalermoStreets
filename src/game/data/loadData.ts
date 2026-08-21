import type { CharacterIndex, CharacterProfile, FrameMeta, RuntimeManifest, RuntimeStageEntry, StageData, StageItemCatalog } from '../types';
import { publicUrl } from './paths';
import { mergeCharacterProfile, type CharacterProfileSource } from './characterProfiles';

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(publicUrl(path));
  if (!response.ok) throw new Error(`Impossibile caricare ${path}: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function loadCharacterIndex(): Promise<CharacterIndex> {
  return getJson<CharacterIndex>('data/characters/index.json');
}

export async function loadCharacterProfile(id: string, chain: string[] = []): Promise<CharacterProfile> {
  if (chain.includes(id)) throw new Error(`Eredità circolare personaggio: ${[...chain, id].join(' -> ')}`);
  const source = await getJson<CharacterProfileSource>(`data/characters/${id}.json`);
  if (!source.extends) return source as CharacterProfile;
  const base = await loadCharacterProfile(source.extends, [...chain, id]);
  return mergeCharacterProfile(base, source);
}

export async function loadRuntimeManifest(): Promise<RuntimeManifest> {
  return getJson<RuntimeManifest>('data/runtime.json');
}

export function getStageEntry(manifest: RuntimeManifest, id = manifest.default_stage): RuntimeStageEntry {
  const entry = manifest.stages.find((stage) => stage.id === id);
  if (!entry) throw new Error(`Stage non registrato: ${id}`);
  return entry;
}

export async function loadStage(entry: RuntimeStageEntry): Promise<StageData> {
  return getJson<StageData>(entry.data);
}

/** Loads an optional stage object catalogue. */
export async function loadStageItems(entry: RuntimeStageEntry): Promise<StageItemCatalog> {
  if (!entry.items) return { schema: 1, stage_id: entry.id, items: [] };
  return getJson<StageItemCatalog>(entry.items);
}

export async function loadCharacterFrameMeta(
  profile: CharacterProfile,
  legacyPath = 'data/generated/frame_meta.json',
): Promise<Record<string, FrameMeta>> {
  return getJson<Record<string, FrameMeta>>(profile.assets.frame_meta ?? legacyPath);
}
