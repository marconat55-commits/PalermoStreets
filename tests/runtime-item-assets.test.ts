import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const ids = ['metal_pipe', 'wood_bat', 'brick', 'trash_bin', 'trash_bag', 'arancina'];

test('M01 runtime objects are compact and retain scale compensation', () => {
  const catalog = JSON.parse(fs.readFileSync('public/data/items/stage1_zen.json', 'utf8'));
  const byId = new Map(catalog.items.map((item: { id: string }) => [item.id, item]));
  let bytes = 0;
  for (const id of ids) {
    const item = byId.get(id) as { asset: string; runtime_scale_compensation?: number } | undefined;
    assert.ok(item);
    assert.ok((item.runtime_scale_compensation ?? 0) > 2);
    const png = fs.readFileSync(`public/${item.asset}`);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    assert.ok(Math.max(width, height) <= 512);
    bytes += png.length;
  }
  assert.ok(bytes < 2 * 1024 * 1024);
});
