import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const pub = path.join(root, 'public');
const read = (p) => JSON.parse(fs.readFileSync(path.join(pub, p), 'utf8'));
const exists = (p) => fs.existsSync(path.join(pub, p.replace(/^\//, '')));
let errors = [];

const index = read('data/characters/index.json');
const stage = read('data/stage1_zen.json');
const meta = read('data/generated/frame_meta.json');

for (const id of index.characters) {
  const profilePath = `data/characters/${id}.json`;
  if (!exists(profilePath)) { errors.push(`Profilo mancante: ${profilePath}`); continue; }
  const profile = read(profilePath);
  for (const [name, spec] of Object.entries(profile.animations)) {
    for (let i = 1; i <= spec.frames; i++) {
      const file = `${profile.assets.animation_root}/${spec.folder}/${String(i).padStart(2, '0')}.png`;
      if (!exists(file)) errors.push(`${id}/${name}: asset mancante ${file}`);
      if (!meta[`/${file}`]) errors.push(`${id}/${name}: metadata mancante /${file}`);
    }
  }
}

for (const module of stage.modules) {
  if (!exists(module.background)) errors.push(`${module.id}: background mancante ${module.background}`);
  for (const wave of module.waves) {
    if (!index.characters.includes(wave.character)) errors.push(`${module.id}: personaggio non registrato ${wave.character}`);
    if (!Array.isArray(wave.spawns) || wave.spawns.length === 0) errors.push(`${module.id}: wave senza spawn`);
  }
}

if (errors.length) {
  console.error(`VALIDATION FAILED (${errors.length})`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`VALIDATION PASS — ${index.characters.length} personaggi, ${stage.modules.length} moduli, ${Object.keys(meta).length} frame metadata.`);
