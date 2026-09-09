export interface AmbientPoint {
  x: number;
  y: number;
  flap: number;
}

export function stableUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function wrapRange(value: number, length: number): number {
  if (!(length > 0)) return 0;
  return ((value % length) + length) % length;
}

export function birdPoint(
  elapsed: number,
  seed: number,
  rect: [number, number, number, number],
  speed: number,
): AmbientPoint {
  const [left, top, width, height] = rect;
  const horizontalOffset = stableUnit(seed) * width;
  const x = left + wrapRange(horizontalOffset + elapsed * speed, width);
  const lane = 0.18 + stableUnit(seed + 31) * 0.64;
  const wave = Math.sin(elapsed * (1.15 + stableUnit(seed + 47) * 0.7) + seed) * Math.min(12, height * 0.12);
  const y = top + height * lane + wave;
  const flap = Math.sin(elapsed * (7.5 + stableUnit(seed + 73) * 2.5) + seed * 0.7);
  return { x, y, flap };
}
