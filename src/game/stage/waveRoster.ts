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

export function planWaveCharacters(wave: WaveData, fallback: string, random = Math.random): string[] {
  const roster = wave.spawns.map((_, index) => selectWaveCharacter(wave, index, fallback, random));
  const variant = wave.random_character;
  if (!variant?.min_count) return roster;

  let missing = variant.min_count - roster.filter((id) => id === variant.id).length;
  const available = roster.flatMap((id, index) => id === variant.id ? [] : [index]);
  while (missing > 0 && available.length > 0) {
    const choice = Math.floor(random() * available.length);
    const [index] = available.splice(choice, 1);
    roster[index!] = variant.id;
    missing -= 1;
  }
  return roster;
}
