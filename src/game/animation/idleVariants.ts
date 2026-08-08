const PREFIX = 'idle_variant_';

export function orderedIdleVariants(names: Iterable<string>): string[] {
  return [...names]
    .filter((name) => name.startsWith(PREFIX))
    .sort((first, second) => {
      const a = Number(first.slice(PREFIX.length));
      const b = Number(second.slice(PREFIX.length));
      return (Number.isFinite(a) ? a : 999) - (Number.isFinite(b) ? b : 999) || first.localeCompare(second);
    });
}

export function nextIdleVariant(variants: string[], currentIndex: number): { name: string | null; nextIndex: number } {
  if (!variants.length) return { name: null, nextIndex: 0 };
  const index = ((currentIndex % variants.length) + variants.length) % variants.length;
  return { name: variants[index]!, nextIndex: (index + 1) % variants.length };
}
