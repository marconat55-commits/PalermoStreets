import type { CharacterProfile } from '../types';

export type CharacterProfileSource = Partial<CharacterProfile> & Pick<CharacterProfile, 'schema' | 'id'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (!isRecord(base) || !isRecord(override)) return override;
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = isRecord(value) && isRecord(result[key]) ? deepMerge(result[key], value) : value;
  }
  return result;
}

export function mergeCharacterProfile(base: CharacterProfile, source: CharacterProfileSource): CharacterProfile {
  return deepMerge(base, source) as CharacterProfile;
}
