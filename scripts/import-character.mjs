import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { validateImportSpec } from './character-import-contract.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: process.cwd(), stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error(`Comando fallito: ${command} ${args.join(' ')}`);
}

const specArg = argument('--spec');
if (!specArg) throw new Error('Uso: npm run character:import -- --spec <file.json> [--check-only]');
const root = process.cwd();
const specPath = path.resolve(root, specArg);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const validation = validateImportSpec(spec, root);
if (validation.errors.length) {
  console.error(validation.errors.join('\n'));
  process.exit(1);
}

console.log(`IMPORT GATE PASS - ${spec.id}: ${validation.frames.size} frame 640x420 RGBA verificati.`);
if (process.argv.includes('--check-only')) process.exit(0);
if (process.argv.includes('--replace')) throw new Error('--replace è intenzionalmente vietato: creare un nuovo ID o rimuovere manualmente il vecchio profilo dopo un checkpoint');

const profileDestination = path.join(root, 'public', 'data', 'characters', `${spec.id}.json`);
const animationDestination = path.join(root, 'public', ...validation.profile.assets.animation_root.split('/'));
const indexPath = path.join(root, 'public', 'data', 'characters', 'index.json');
const globalMetaPath = path.join(root, 'public', 'data', 'generated', 'frame_meta.json');
const localMetaPath = path.join(root, 'public', 'data', 'generated', 'characters', `${spec.id}.frame_meta.json`);
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
if (index.characters.includes(spec.id) || fs.existsSync(profileDestination) || fs.existsSync(animationDestination)) {
  throw new Error(`${spec.id}: destinazione già esistente; import annullato senza modifiche`);
}

const originalIndex = fs.readFileSync(indexPath);
const originalGlobalMeta = fs.readFileSync(globalMetaPath);
try {
  fs.mkdirSync(animationDestination, { recursive: true });
  for (const [relative, source] of validation.frames) {
    const destination = path.join(animationDestination, ...relative.split('/'));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  fs.copyFileSync(validation.profilePath, profileDestination);
  index.characters.push(spec.id);
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  run('python', ['scripts/build-frame-metadata.py', '.', '--character', spec.id]);
  run('python', ['scripts/build-character-atlases.py', '.', '--character', spec.id]);
  run('npm.cmd', ['run', 'assets:manifests']);
  run('npm.cmd', ['run', 'validate:data']);
} catch (error) {
  fs.writeFileSync(indexPath, originalIndex);
  fs.writeFileSync(globalMetaPath, originalGlobalMeta);
  fs.rmSync(profileDestination, { force: true });
  fs.rmSync(animationDestination, { recursive: true, force: true });
  fs.rmSync(localMetaPath, { force: true });
  console.error(`${spec.id}: import fallito; rollback completato senza lasciare asset runtime.`);
  throw error;
}
console.log(`IMPORT COMPLETE - ${spec.id}: profilo, frame, metadata e atlas generati.`);
