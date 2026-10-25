import type { WaveData } from '../types';

export function waveCharacterIds(wave: WaveData, fallback: string): string[] {
  const fixed = wave.characters?.length ? wave.characters : [wave.character ?? fallback];
  return [...new Set([...fixed, ...(wave.random_character ? [wave.random_character.id] : [])])];
}

export function selectWaveCharacter(wave: WaveData, index: number, fallback: string, random = Math.random): string {
  const fixed = wave.characters?.[index] ?? wave.character ?? fallback;
  const variant = wave.random_character;
  return variant && random() < variant.chance ? variant.id : fixed;
}
