import type { CharacterIndex, CharacterProfile, FrameMeta, StageData, StageItemCatalog } from '../types';
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

export async function loadStage1(): Promise<StageData> {
  return getJson<StageData>('data/stage1_zen.json');
}

/** Loads the object catalogue without enabling pickup/combat behaviour. */
export async function loadStage1Items(): Promise<StageItemCatalog> {
  return getJson<StageItemCatalog>('data/items/stage1_zen.json');
}

export async function loadFrameMeta(): Promise<Record<string, FrameMeta>> {
  return getJson<Record<string, FrameMeta>>('data/generated/frame_meta.json');
}
