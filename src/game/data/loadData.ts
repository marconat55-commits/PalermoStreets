import type { CharacterIndex, CharacterProfile, FrameMeta, StageData } from '../types';
import { publicUrl } from './paths';

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(publicUrl(path));
  if (!response.ok) throw new Error(`Impossibile caricare ${path}: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function loadCharacterIndex(): Promise<CharacterIndex> {
  return getJson<CharacterIndex>('data/characters/index.json');
}

export async function loadCharacterProfile(id: string): Promise<CharacterProfile> {
  return getJson<CharacterProfile>(`data/characters/${id}.json`);
}

export async function loadStage1(): Promise<StageData> {
  return getJson<StageData>('data/stage1_zen.json');
}

export async function loadFrameMeta(): Promise<Record<string, FrameMeta>> {
  return getJson<Record<string, FrameMeta>>('data/generated/frame_meta.json');
}
