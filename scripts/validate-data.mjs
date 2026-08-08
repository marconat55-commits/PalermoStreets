import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const pub = path.join(root, 'public');
const read = (relative) => JSON.parse(fs.readFileSync(path.join(pub, relative), 'utf8'));
const absolute = (relative) => path.join(pub, relative.replace(/^\//, ''));
const exists = (relative) => fs.existsSync(absolute(relative));
const posix = (value) => value.split(path.sep).join('/');
const errors = [];
const warnings = [];
const expectedPng = new Set();
const expectedMeta = new Set();

function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }
function frameName(index) { return `${String(index).padStart(2, '0')}.png`; }

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
}

const index = read('data/characters/index.json');
const stage = read('data/stage1_zen.json');
const meta = read('data/generated/frame_meta.json');
const ids = new Set(index.characters);
const profiles = new Map();

if (!ids.has(index.default_player)) fail(`default_player non registrato: ${index.default_player}`);
if (!ids.has(index.default_enemy)) fail(`default_enemy non registrato: ${index.default_enemy}`);
if (new Set(index.characters).size !== index.characters.length) fail('ID duplicati nel character index');

for (const id of index.characters) {
  const profilePath = `data/characters/${id}.json`;
  if (!exists(profilePath)) { fail(`Profilo mancante: ${profilePath}`); continue; }
  const profile = read(profilePath);
  profiles.set(id, profile);
  if (profile.id !== id) fail(`${id}: profile.id non coerente (${profile.id})`);
  if (profile.schema !== 1) fail(`${id}: schema profilo non supportato`);
  if (!Number.isFinite(profile.visual_height) || profile.visual_height <= 0) fail(`${id}: visual_height non valido`);
  const canvas = profile.factory?.animation_canvas;
  if (!Array.isArray(canvas) || canvas[0] !== 640 || canvas[1] !== 420) fail(`${id}: animation_canvas deve essere 640x420`);
  if (!String(profile.factory?.scale_mode ?? '').startsWith('baked')) fail(`${id}: scale_mode baked mancante`);

  const required = profile.role === 'player'
    ? [
      'idle', 'walk', 'walk_up', 'walk_down', 'run', 'brake', 'jump', 'air_attack', 'air_punch',
      'punch_left', 'punch_right', 'combo_finisher', 'kick_front', 'kick_right', 'kick_finisher', 'block', 'dodge',
      'grab', 'grab_strike', 'throw', 'super', 'hit', 'knockdown', 'getup', 'dead',
    ]
    : ['idle', 'walk', 'attack', 'heavy', 'hit', 'knockdown', 'getup', 'dead'];
  for (const name of required) if (!profile.animations[name]) fail(`${id}: animazione obbligatoria mancante: ${name}`);

  const atlasPath = profile.assets.texture_atlas;
  let atlas = null;
  if (!atlasPath || !exists(atlasPath)) fail(`${id}: texture_atlas mancante`);
  else {
    atlas = read(atlasPath);
    if (atlas.schema !== 1 || !Array.isArray(atlas.pages) || typeof atlas.frames !== 'object') fail(`${id}: manifest atlas non valido`);
    const atlasRoot = path.posix.dirname(atlasPath);
    for (const page of atlas.pages ?? []) {
      if (!exists(`${atlasRoot}/${page.file}`)) fail(`${id}: pagina atlas mancante: ${page.file}`);
      if (!(page.width > 0 && page.height > 0 && page.width <= 2048 && page.height <= 2048)) fail(`${id}: dimensioni pagina atlas non valide: ${page.file}`);
    }
  }

  for (const [name, spec] of Object.entries(profile.animations)) {
    if (!Number.isInteger(spec.frames) || spec.frames < 1) fail(`${id}/${name}: frames non valido`);
    if (!Array.isArray(spec.durations) || ![1, spec.frames].includes(spec.durations.length)) fail(`${id}/${name}: durations deve avere 1 o ${spec.frames} valori`);
    if ((spec.durations ?? []).some((value) => !Number.isFinite(value) || value <= 0)) fail(`${id}/${name}: durata non positiva`);
    if (spec.visual_scales !== undefined && (!Array.isArray(spec.visual_scales) || ![1, spec.frames].includes(spec.visual_scales.length))) fail(`${id}/${name}: visual_scales deve avere 1 o ${spec.frames} valori`);
    if ((spec.visual_scales ?? []).some((value) => !Number.isFinite(value) || value < 0.82 || value > 1.24)) fail(`${id}/${name}: visual_scales fuori intervallo 0.82-1.24`);
    if ((spec.visual_scales ?? []).some((value, indexValue, values) => indexValue > 0 && Math.abs(value - values[indexValue - 1]) > 0.08)) fail(`${id}/${name}: salto di scala visiva superiore a 0.08`);
    if (spec.reference_speed !== undefined && (!Number.isFinite(spec.reference_speed) || spec.reference_speed <= 0)) fail(`${id}/${name}: reference_speed non valida`);
    if (spec.contact_frame !== undefined && (!Number.isInteger(spec.contact_frame) || spec.contact_frame < 1 || spec.contact_frame > spec.frames)) fail(`${id}/${name}: contact_frame fuori range`);

    for (let frame = 1; frame <= spec.frames; frame += 1) {
      const filename = `${spec.folder}/${frameName(frame)}`;
      const relative = `${profile.assets.animation_root}/${filename}`;
      const metaKey = `/${relative}`;
      expectedPng.add(relative);
      expectedMeta.add(metaKey);
      if (!exists(relative)) fail(`${id}/${name}: asset mancante ${relative}`);
      const frameMeta = meta[metaKey];
      if (!frameMeta) fail(`${id}/${name}: metadata mancante ${metaKey}`);
      else {
        const [x, y, width, height] = frameMeta.bounds ?? [];
        if (frameMeta.width !== 640 || frameMeta.height !== 420) fail(`${id}/${name}: canvas metadata non 640x420`);
        if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0 || x < 0 || y < 0 || x + width > 640 || y + height > 420) fail(`${id}/${name}: bounds metadata non validi`);
        if (['idle', 'walk', 'walk_up', 'walk_down'].includes(name)) {
          const targetBottom = profile.factory.content_bottom_y ?? profile.factory.baseline_y;
          if (Math.abs(y + height - targetBottom) > 1) fail(`${id}/${name}: pivot piedi fuori target (${y + height} vs ${targetBottom})`);
          if (Math.abs(height - profile.visual_height) > 28) warn(`${id}/${name}: altezza visiva ${height}px distante dal target ${profile.visual_height}px`);
        }
      }
      if (atlas && !atlas.frames?.[filename]) fail(`${id}/${name}: frame assente dall'atlas: ${filename}`);
    }
  }

  const knockdownScales = profile.animations.knockdown.visual_scales ?? [1];
  const getupScales = profile.animations.getup.visual_scales ?? [1];
  if (Math.abs((knockdownScales.at(-1) ?? 1) - (getupScales[0] ?? 1)) > 0.0001) fail(`${id}: scala non continua tra knockdown e getup`);
  if (id !== 'barbetta' && Math.abs((getupScales.at(-1) ?? 1) - 1) > 0.0001) fail(`${id}: getup deve chiudere a scala 1`);
}

const runtimePng = index.characters.flatMap((id) => {
  const profile = profiles.get(id);
  if (!profile) return [];
  const rootDir = absolute(profile.assets.animation_root);
  return walkFiles(rootDir)
    .filter((file) => file.toLowerCase().endsWith('.png') && !file.includes(`${path.sep}atlas${path.sep}`))
    .map((file) => posix(path.relative(pub, file)));
});
for (const png of runtimePng) if (!expectedPng.has(png)) fail(`PNG runtime non referenziato: ${png}`);
for (const key of Object.keys(meta)) if (!expectedMeta.has(key)) fail(`Metadata orfano: ${key}`);

for (const module of stage.modules ?? []) {
  if (!exists(module.background)) fail(`${module.id}: background mancante ${module.background}`);
  for (const wave of module.waves ?? []) {
    const character = wave.character ?? index.default_enemy;
    if (!ids.has(character)) fail(`${module.id}: personaggio non registrato ${character}`);
    if (!Array.isArray(wave.spawns) || wave.spawns.length === 0) fail(`${module.id}: wave senza spawn`);
    for (const spawn of wave.spawns ?? []) {
      if (!Array.isArray(spawn) || spawn.length !== 2 || !spawn.every(Number.isFinite)) fail(`${module.id}: coordinate spawn non valide`);
    }
  }
}

for (const warning of warnings) console.warn(`WARNING - ${warning}`);
if (errors.length) {
  console.error(`VALIDATION FAILED (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`VALIDATION PASS - ${index.characters.length} personaggi, ${stage.modules.length} moduli, ${expectedPng.size} PNG runtime, ${Object.keys(meta).length} metadata.`);
