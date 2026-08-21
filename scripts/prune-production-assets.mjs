import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { isLooseAnimationPng, readCharacterAnimationRoots, walkFiles } from './production-asset-contract.mjs';

const root = process.cwd();
let removedFiles = 0;
let removedBytes = 0;

for (const entry of readCharacterAnimationRoots(root)) {
  const animationRoot = path.join(root, 'dist', ...entry.animationRoot.split('/'));
  for (const file of walkFiles(animationRoot)) {
    if (!isLooseAnimationPng(file, animationRoot)) continue;
    removedBytes += fs.statSync(file).size;
    fs.rmSync(file);
    removedFiles += 1;
  }
  for (const directory of fs.readdirSync(animationRoot, { withFileTypes: true })) {
    if (!directory.isDirectory() || directory.name === 'atlas') continue;
    const full = path.join(animationRoot, directory.name);
    if (walkFiles(full).length === 0) fs.rmSync(full, { recursive: true });
  }
}

console.log(`PRODUCTION PRUNE PASS - ${removedFiles} PNG sciolti esclusi (${(removedBytes / 1048576).toFixed(2)} MiB).`);
