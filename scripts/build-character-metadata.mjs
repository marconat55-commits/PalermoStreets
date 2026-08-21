import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const profilesRoot = path.join(root, 'public', 'data', 'characters');
const outputRoot = path.join(root, 'public', 'data', 'generated', 'characters');
const globalMetaPath = path.join(root, 'public', 'data', 'generated', 'frame_meta.json');
const index = JSON.parse(fs.readFileSync(path.join(profilesRoot, 'index.json'), 'utf8'));
const globalMeta = JSON.parse(fs.readFileSync(globalMetaPath, 'utf8'));

fs.mkdirSync(outputRoot, { recursive: true });

for (const id of index.characters) {
  const profile = JSON.parse(fs.readFileSync(path.join(profilesRoot, `${id}.json`), 'utf8'));
  const animationRoot = profile.assets?.animation_root;
  if (!animationRoot) throw new Error(`${id}: animation_root mancante`);
  const prefix = `/${animationRoot}/`;
  const localMeta = Object.fromEntries(Object.entries(globalMeta).filter(([key]) => key.startsWith(prefix)));
  if (Object.keys(localMeta).length === 0) throw new Error(`${id}: nessun metadata trovato per ${prefix}`);
  fs.writeFileSync(
    path.join(outputRoot, `${id}.frame_meta.json`),
    `${JSON.stringify(localMeta, null, 2)}\n`,
  );
}

console.log(`CHARACTER METADATA PASS - ${index.characters.length} manifest generati.`);
