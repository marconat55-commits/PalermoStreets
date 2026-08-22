import type { ModuleData } from '../types';

/**
 * Resolves the optional development-only `?module=` shortcut.
 * Accepts an authored module id (`M03`) or its one-based position (`3`).
 * Invalid values deliberately fall back to the normal first module.
 */
export function resolveStartModuleIndex(search: string, modules: ModuleData[]): number {
  const requested = new URLSearchParams(search).get('module')?.trim();
  if (!requested) return 0;

  const numeric = Number(requested);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= modules.length) return numeric - 1;

  const normalized = requested.toLocaleUpperCase('en-US');
  const index = modules.findIndex((module) => module.id.toLocaleUpperCase('en-US') === normalized);
  return index >= 0 ? index : 0;
}
