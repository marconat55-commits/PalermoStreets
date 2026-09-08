import type { ModuleData, StageItemDefinition } from '../types';

export function itemAssetPaths(item: StageItemDefinition): string[] {
  return [item.asset, item.damaged_asset, item.broken_asset, item.debris_asset]
    .filter((path): path is string => Boolean(path));
}

export function collectModuleItems(
  module: ModuleData,
  definitions: StageItemDefinition[],
): StageItemDefinition[] {
  const byId = new Map(definitions.map((item) => [item.id, item]));
  const pending = (module.items ?? []).map((spawn) => spawn.item);
  const collected = new Map<string, StageItemDefinition>();
  while (pending.length > 0) {
    const id = pending.shift()!;
    if (collected.has(id)) continue;
    const item = byId.get(id);
    if (!item) continue;
    collected.set(id, item);
    if (item.drop_item) pending.push(item.drop_item);
  }
  return [...collected.values()];
}

export function collectModuleItemAssets(
  module: ModuleData,
  definitions: StageItemDefinition[],
): string[] {
  const paths = collectModuleItems(module, definitions).flatMap(itemAssetPaths);
  return [...new Set(paths)];
}

/** Assets required to draw the module immediately. Damage/break variants stream in afterwards. */
export function collectModulePrimaryItemAssets(
  module: ModuleData,
  definitions: StageItemDefinition[],
): string[] {
  return [...new Set(collectModuleItems(module, definitions).map((item) => item.asset))];
}
