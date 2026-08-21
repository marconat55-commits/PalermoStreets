import fs from 'node:fs';
import path from 'node:path';

export function readCharacterAnimationRoots(projectRoot, dataRoot = 'public') {
  const profileRoot = path.join(projectRoot, dataRoot, 'data', 'characters');
  const index = JSON.parse(fs.readFileSync(path.join(profileRoot, 'index.json'), 'utf8'));
  return index.characters.map((id) => {
    const profile = JSON.parse(fs.readFileSync(path.join(profileRoot, `${id}.json`), 'utf8'));
    if (!profile.assets?.animation_root || !profile.assets?.texture_atlas) {
      throw new Error(`${id}: animation_root/texture_atlas mancanti`);
    }
    return { id, animationRoot: profile.assets.animation_root, atlas: profile.assets.texture_atlas };
  });
}

export function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
}

export function isLooseAnimationPng(file, animationRoot) {
  const relative = path.relative(animationRoot, file).split(path.sep).join('/');
  return relative.toLowerCase().endsWith('.png') && !relative.startsWith('atlas/');
}
