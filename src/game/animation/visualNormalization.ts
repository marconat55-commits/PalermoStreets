export function finalGetupScale(characterId: string, idleWidths: number[], getupWidth: number): number {
  if (characterId === 'barbetta' || getupWidth <= 0 || idleWidths.length === 0) return 1;
  const idleWidth = idleWidths.reduce((sum, width) => sum + width, 0) / idleWidths.length;
  return Math.max(0.88, Math.min(1.08, idleWidth / getupWidth));
}
