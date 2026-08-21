import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const roots = ['public/assets', 'art_source'];
const groups = new Map();

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const root of roots) {
  for (const file of walk(root).filter((item) => item.toLowerCase().endsWith('.png'))) {
    const buffer = fs.readFileSync(file);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const key = `${buffer.length}:${hash}`;
    const list = groups.get(key) ?? [];
    list.push(file.split(path.sep).join('/'));
    groups.set(key, list);
  }
}

const duplicates = [...groups.values()]
  .filter((files) => files.length > 1)
  .sort((a, b) => a[0].localeCompare(b[0]));
const output = {
  schema: 1,
  generated_at: new Date().toISOString(),
  duplicate_groups: duplicates.length,
  groups: duplicates,
};
fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/asset-duplicates.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(`ASSET DUPLICATE AUDIT PASS - ${duplicates.length} gruppi; report build/asset-duplicates.json`);
