import type { ModuleData, StageItemDefinition } from '../types';

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
