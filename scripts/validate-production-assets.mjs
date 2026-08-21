import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { isLooseAnimationPng, readCharacterAnimationRoots, walkFiles } from './production-asset-contract.mjs';

const root = process.cwd();
const errors = [];
let atlasPages = 0;

for (const entry of readCharacterAnimationRoots(root)) {
  const animationRoot = path.join(root, 'dist', ...entry.animationRoot.split('/'));
  const loose = walkFiles(animationRoot).filter((file) => isLooseAnimationPng(file, animationRoot));
  if (loose.length) errors.push(`${entry.id}: ${loose.length} PNG sciolti nella build`);
  const atlasPath = path.join(root, 'dist', ...entry.atlas.split('/'));
  if (!fs.existsSync(atlasPath)) {
    errors.push(`${entry.id}: atlas manifest mancante`);
    continue;
  }
  const atlas = JSON.parse(fs.readFileSync(atlasPath, 'utf8'));
  const atlasRoot = path.dirname(atlasPath);
  for (const page of atlas.pages ?? []) {
    atlasPages += 1;
    if (!fs.existsSync(path.join(atlasRoot, page.file))) errors.push(`${entry.id}: pagina atlas mancante ${page.file}`);
  }
  if (!Object.keys(atlas.frames ?? {}).length) errors.push(`${entry.id}: atlas senza frame`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`PRODUCTION ASSET PASS - runtime atlas-only, ${atlasPages} pagine verificate.`);
