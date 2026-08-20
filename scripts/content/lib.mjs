import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PIPELINE_SCHEMA = 1;
const POSIX = path.posix;

export function readJson(root, relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function isSafeRelative(value) {
  if (typeof value !== 'string' || !value || path.isAbsolute(value)) return false;
  const normalized = value.replaceAll('\\', '/');
  return !normalized.split('/').includes('..');
}

function finitePair(value) {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
}

function nearlyEqual(a, b, tolerance = 0.000001) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function actorSvg(actor, scale) {
  const x = actor.x_runtime / scale;
  const feet = actor.feet_y_runtime / scale;
  const height = actor.height_runtime / scale;
  const head = height * 0.09;
  const top = feet - height;
  const shoulder = top + height * 0.25;
  const hip = top + height * 0.58;
  const stroke = Math.max(10, height * 0.045);
  const color = actor.id.startsWith('talebano') ? '#f97316' : '#22d3ee';
  return [
    `<g aria-label="${escapeXml(actor.id)}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">`,
    `<circle cx="${x}" cy="${top + head}" r="${head}" fill="${color}" fill-opacity="0.22"/>`,
    `<path d="M ${x} ${shoulder} L ${x} ${hip} M ${x} ${shoulder + 18} L ${x - height * 0.16} ${top + height * 0.48} M ${x} ${shoulder + 18} L ${x + height * 0.16} ${top + height * 0.46} M ${x} ${hip} L ${x - height * 0.13} ${feet} M ${x} ${hip} L ${x + height * 0.15} ${feet}"/>`,
    `</g>`,
    `<text x="${x + 28}" y="${top + 24}" fill="${color}" font-family="Arial,sans-serif" font-size="24" font-weight="700">${escapeXml(actor.id)} ${actor.height_runtime}px</text>`,
  ].join('\n');
}

function sceneSvg(module, options = {}) {
  const { geometry, walk_band: walk, reference_actors: actors } = module;
  const [masterWidth, masterHeight] = geometry.master_size;
  const scale = geometry.master_to_runtime_scale;
  const viewX = options.viewXMaster ?? 0;
  const viewWidth = options.viewWidthMaster ?? masterWidth;
  const outputWidth = options.outputWidth ?? masterWidth;
  const outputHeight = options.outputHeight ?? masterHeight;
  const walkTop = walk.top_runtime_y / scale;
  const walkBottom = walk.bottom_runtime_y / scale;
  const horizon = geometry.horizon_runtime_y / scale;
  const split = geometry.screen_split_master_x;
  const cameraLabel = options.cameraLabel ? `<text x="${viewX + 36}" y="62" fill="#fff" font-family="Arial,sans-serif" font-size="30" font-weight="700">${escapeXml(options.cameraLabel)}</text>` : '';
  const verticalGrid = Array.from({ length: 17 }, (_, index) => {
    const x = index * 240;
    return `<line x1="${x}" y1="0" x2="${x}" y2="${masterHeight}"/>`;
  }).join('\n');
  const horizontalGrid = Array.from({ length: 10 }, (_, index) => {
    const y = index * 120;
    return `<line x1="0" y1="${y}" x2="${masterWidth}" y2="${y}"/>`;
  }).join('\n');
  const actorLayer = actors.map((actor) => actorSvg(actor, scale)).join('\n');
  const customArchitecture = (module.composition?.greybox_rects_master ?? []).map((rect) =>
    `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${escapeXml(rect.fill ?? '#475569')}" opacity="${rect.opacity ?? 1}"/>`
  ).join('\n');
  const customArchitectureLayer = customArchitecture ? `  ${customArchitecture}\r\n` : '';
  const legacyOpacity = customArchitecture ? 0 : 1;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="${viewX} 0 ${viewWidth} ${masterHeight}" role="img" aria-label="${escapeXml(module.id)} deterministic greybox">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#172554"/><stop offset="0.62" stop-color="#fb923c"/><stop offset="1" stop-color="#fed7aa"/></linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78716c"/><stop offset="1" stop-color="#292524"/></linearGradient>
  </defs>
  <rect width="${masterWidth}" height="${masterHeight}" fill="url(#sky)"/>
  <path d="M0 ${horizon} L420 335 L760 392 L1110 270 L1460 390 L1870 245 L2320 360 L2740 230 L3210 350 L3550 275 L3840 365 L3840 540 L0 540Z" fill="#334155" opacity="0.9"/>
  <g fill="#475569" opacity="${legacyOpacity * 0.92}">
    <rect x="0" y="390" width="340" height="190"/><rect x="365" y="420" width="300" height="160"/><rect x="700" y="370" width="420" height="210"/>
    <rect x="1160" y="410" width="330" height="170"/><rect x="1530" y="350" width="380" height="230"/><rect x="1950" y="400" width="320" height="180"/>
    <rect x="2310" y="365" width="410" height="215"/><rect x="2760" y="410" width="300" height="170"/><rect x="3100" y="345" width="390" height="235"/><rect x="3530" y="395" width="310" height="185"/>
  </g>
  <g opacity="${legacyOpacity}">
  <rect x="0" y="540" width="1140" height="${walkTop - 540}" fill="#57534e"/>
  <rect x="0" y="540" width="1140" height="42" fill="#1c1917"/>
  <g fill="#1c1917"><rect x="110" y="600" width="260" height="${walkTop - 600}"/><rect x="440" y="600" width="260" height="${walkTop - 600}"/><rect x="770" y="600" width="260" height="${walkTop - 600}"/></g>
  <g fill="#a8a29e"><rect x="80" y="580" width="38" height="${walkTop - 580}"/><rect x="370" y="580" width="38" height="${walkTop - 580}"/><rect x="700" y="580" width="38" height="${walkTop - 580}"/><rect x="1030" y="580" width="42" height="${walkTop - 580}"/></g>
  <rect x="2130" y="510" width="1710" height="${walkTop - 510}" fill="#57534e"/>
  <rect x="2130" y="510" width="1710" height="42" fill="#1c1917"/>
  <g fill="#1c1917"><rect x="2240" y="610" width="350" height="${walkTop - 610}"/><rect x="2680" y="610" width="350" height="${walkTop - 610}"/><rect x="3120" y="610" width="350" height="${walkTop - 610}"/><rect x="3560" y="610" width="230" height="${walkTop - 610}"/></g>
  <g fill="#a8a29e"><rect x="2180" y="570" width="44" height="${walkTop - 570}"/><rect x="2600" y="570" width="44" height="${walkTop - 570}"/><rect x="3040" y="570" width="44" height="${walkTop - 570}"/><rect x="3480" y="570" width="44" height="${walkTop - 570}"/><rect x="3790" y="570" width="44" height="${walkTop - 570}"/></g>
  </g>
${customArchitectureLayer}
  <rect x="0" y="${walkTop}" width="${masterWidth}" height="${walkBottom - walkTop}" fill="url(#ground)"/>
  <rect x="0" y="${walkTop}" width="${masterWidth}" height="${walkBottom - walkTop}" fill="#22c55e" fill-opacity="0.18" stroke="#4ade80" stroke-width="6"/>
  <rect x="0" y="${walkBottom}" width="${masterWidth}" height="${masterHeight - walkBottom}" fill="#111827"/>
  <g stroke="#ffffff" stroke-opacity="0.13" stroke-width="2">${verticalGrid}${horizontalGrid}</g>
  <line x1="0" y1="${horizon}" x2="${masterWidth}" y2="${horizon}" stroke="#facc15" stroke-width="5" stroke-dasharray="30 18"/>
  <line x1="${split}" y1="0" x2="${split}" y2="${masterHeight}" stroke="#f43f5e" stroke-width="8" stroke-dasharray="32 16"/>
  <text x="34" y="${walkTop - 20}" fill="#86efac" font-family="Arial,sans-serif" font-size="26" font-weight="700">WALK TOP ${walk.top_runtime_y}px runtime</text>
  <text x="34" y="${walkBottom - 18}" fill="#86efac" font-family="Arial,sans-serif" font-size="26" font-weight="700">WALK BOTTOM ${walk.bottom_runtime_y}px runtime</text>
  <text x="${split + 28}" y="104" fill="#fb7185" font-family="Arial,sans-serif" font-size="28" font-weight="700">SCREEN 2 / camera max</text>
  ${actorLayer}
${cameraLabel}
</svg>
`;
}

function walkMaskSvg(module) {
  const [width, height] = module.geometry.runtime_size;
  const top = module.walk_band.top_runtime_y;
  const bottom = module.walk_band.bottom_runtime_y;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(module.id)} walk mask">
  <rect width="${width}" height="${height}" fill="#000"/>
  <rect x="0" y="${top}" width="${width}" height="${bottom - top}" fill="#fff"/>
</svg>
`;
}

export function validateRepository(root, { verifyOutputs = false } = {}) {
  const errors = [];
  const warnings = [];
  const fail = (message) => errors.push(message);
  const warn = (message) => warnings.push(message);
  let catalog;
  try {
    catalog = readJson(root, 'content-src/catalog.json');
  } catch (error) {
    return { errors: [`catalog non leggibile: ${error.message}`], warnings, catalog: null, manifests: new Map() };
  }
  if (catalog.schema !== PIPELINE_SCHEMA) fail(`catalog.schema deve essere ${PIPELINE_SCHEMA}`);
  if (!/^\d+\.\d+\.\d+$/.test(catalog.pipeline_version ?? '')) fail('pipeline_version deve essere semver');
  if (!finitePair(catalog.runtime?.logical_viewport) || catalog.runtime.logical_viewport[0] !== 1280 || catalog.runtime.logical_viewport[1] !== 720) fail('logical_viewport deve essere 1280x720');
  if (!finitePair(catalog.runtime?.character_canvas) || catalog.runtime.character_canvas[0] !== 640 || catalog.runtime.character_canvas[1] !== 420) fail('character_canvas deve essere 640x420');
  const ids = new Set();
  const manifests = new Map();
  for (const entry of catalog.entries ?? []) {
    if (ids.has(entry.id)) fail(`catalog: ID duplicato ${entry.id}`);
    ids.add(entry.id);
    if (!isSafeRelative(entry.manifest)) { fail(`${entry.id}: percorso manifest non sicuro`); continue; }
    const absolute = path.join(root, entry.manifest);
    if (!fs.existsSync(absolute)) { fail(`${entry.id}: manifest mancante ${entry.manifest}`); continue; }
    let manifest;
    try { manifest = readJson(root, entry.manifest); } catch (error) { fail(`${entry.id}: JSON non valido (${error.message})`); continue; }
    manifests.set(entry.id, manifest);
    if (manifest.schema !== PIPELINE_SCHEMA) fail(`${entry.id}: schema non supportato`);
    if (manifest.kind !== entry.kind) fail(`${entry.id}: kind catalog/manifest non coerente`);
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(manifest.id ?? '')) fail(`${entry.id}: manifest.id non valido`);
    if (manifest.kind === 'character') {
      if (!isSafeRelative(manifest.source?.identity_lock) || !fs.existsSync(path.join(root, manifest.source.identity_lock))) {
        fail(`${entry.id}: identity_lock mancante`);
      }
      if (!isSafeRelative(manifest.runtime_profile) || !fs.existsSync(path.join(root, manifest.runtime_profile))) {
        fail(`${entry.id}: runtime_profile mancante`);
      } else {
        const runtime = readJson(root, manifest.runtime_profile);
        if (runtime.id !== manifest.id) fail(`${entry.id}: id diverso dal profilo runtime`);
        if (!finitePair(manifest.contracts?.canvas) || manifest.contracts.canvas.join('x') !== '640x420') fail(`${entry.id}: canvas deve essere 640x420`);
        if (manifest.contracts?.baseline_y !== 400) fail(`${entry.id}: baseline_y deve essere 400`);
        if (manifest.contracts?.runtime_scale !== 1) fail(`${entry.id}: runtime_scale deve essere 1.0`);
        if (runtime.visual_height !== manifest.contracts?.visual_height) fail(`${entry.id}: visual_height diverso dal runtime`);
      }
    }
    if (manifest.kind === 'stage') {
      if (!isSafeRelative(manifest.runtime_profile) || !fs.existsSync(path.join(root, manifest.runtime_profile))) {
        fail(`${entry.id}: runtime_profile stage mancante`);
      } else {
        const runtime = readJson(root, manifest.runtime_profile);
        const runtimeIds = new Set((runtime.modules ?? []).map((module) => module.id));
        for (const module of manifest.modules ?? []) {
          if (!runtimeIds.has(module.runtime_module_id)) fail(`${entry.id}/${module.id}: modulo runtime mancante`);
          if (module.authoring_manifest) {
            if (!isSafeRelative(module.authoring_manifest) || !fs.existsSync(path.join(root, module.authoring_manifest))) {
              fail(`${entry.id}/${module.id}: authoring_manifest mancante`);
            } else {
              const sourceModule = readJson(root, module.authoring_manifest);
              manifests.set(`${entry.id}.${module.id}`, sourceModule);
              validateStageModule(sourceModule, fail, root);
            }
          }
        }
      }
    }
  }
  if (!ids.has('character.marco')) warn('Marco non registrato nel catalogo di produzione');
  if (!ids.has('stage.stage1_zen')) warn('Stage 1 ZEN non registrato nel catalogo di produzione');
  if (verifyOutputs && !errors.length) {
    const outputs = renderBuildOutputs(root, { catalog, manifests });
    for (const [relative, expected] of outputs) {
      const absolute = path.join(root, relative);
      if (!fs.existsSync(absolute)) fail(`output generato mancante: ${relative}; eseguire npm run content:build`);
      else if (fs.readFileSync(absolute, 'utf8') !== expected) fail(`output generato non aggiornato: ${relative}; eseguire npm run content:build`);
    }
  }
  return { errors, warnings, catalog, manifests };
}

function validateStageModule(module, fail, root) {
  if (module.schema !== PIPELINE_SCHEMA || module.kind !== 'stage_module') fail(`${module.id ?? 'module'}: manifest modulo non valido`);
  const geometry = module.geometry ?? {};
  const master = geometry.master_size;
  const runtime = geometry.runtime_size;
  const viewport = geometry.viewport;
  const scale = geometry.master_to_runtime_scale;
  if (!finitePair(master) || master[0] !== 3840 || master[1] !== 1080) fail(`${module.id}: master_size deve essere 3840x1080`);
  if (!finitePair(runtime) || runtime[0] !== 2560 || runtime[1] !== 720) fail(`${module.id}: runtime_size deve essere 2560x720`);
  if (!finitePair(viewport) || viewport[0] !== 1280 || viewport[1] !== 720) fail(`${module.id}: viewport deve essere 1280x720`);
  if (!nearlyEqual(scale, 2 / 3)) fail(`${module.id}: master_to_runtime_scale deve essere 2/3`);
  if (finitePair(master) && finitePair(runtime) && Number.isFinite(scale)) {
    if (!nearlyEqual(master[0] * scale, runtime[0]) || !nearlyEqual(master[1] * scale, runtime[1])) fail(`${module.id}: master/runtime non proporzionali`);
  }
  if (geometry.screen_split_master_x !== 1920) fail(`${module.id}: split deve essere a 1920px master`);
  if (!finitePair(geometry.camera_bounds_runtime) || geometry.camera_bounds_runtime[0] !== 0 || geometry.camera_bounds_runtime[1] !== 1280) fail(`${module.id}: camera_bounds_runtime deve essere [0,1280]`);
  const walk = module.walk_band ?? {};
  if (!(walk.top_runtime_y >= 0 && walk.top_runtime_y < walk.bottom_runtime_y && walk.bottom_runtime_y <= 720)) fail(`${module.id}: walk band non valida`);
  if (!(walk.exit_runtime_x > walk.entry_runtime?.[0] && walk.exit_runtime_x <= 2560)) fail(`${module.id}: entry/exit non validi`);
  for (const actor of module.reference_actors ?? []) {
    if (!(actor.x_runtime >= 0 && actor.x_runtime <= 2560)) fail(`${module.id}/${actor.id}: actor X fuori modulo`);
    if (!(actor.feet_y_runtime >= walk.top_runtime_y && actor.feet_y_runtime <= walk.bottom_runtime_y)) fail(`${module.id}/${actor.id}: piedi fuori walk band`);
    if (!(actor.height_runtime >= 240 && actor.height_runtime <= 340)) fail(`${module.id}/${actor.id}: altezza reference actor non plausibile`);
  }
  const planes = new Set((module.layers ?? []).map((layer) => layer.plane));
  for (const required of ['far', 'main']) if (!planes.has(required)) fail(`${module.id}: layer ${required} mancante`);
  for (const rect of walk.blocked_rects_runtime ?? []) {
    if (!Array.isArray(rect) || rect.length !== 4 || !rect.every(Number.isFinite)) fail(`${module.id}: blocked rect non valida`);
  }
  const artManifestPath = module.art_candidate?.manifest;
  if (artManifestPath) {
    if (!isSafeRelative(artManifestPath) || !fs.existsSync(path.join(root, artManifestPath))) {
      fail(`${module.id}: manifest art candidate mancante`);
    } else {
      const artManifest = readJson(root, artManifestPath);
      if (artManifest.status !== 'approval_candidate' && artManifest.status !== 'approved') fail(`${module.id}: stato art candidate non valido`);
      if (artManifest.master_size?.join('x') !== '3840x1080') fail(`${module.id}: art master non 3840x1080`);
      if (artManifest.runtime_size?.join('x') !== '2560x720') fail(`${module.id}: art runtime candidate non 2560x720`);
      for (const [relative, expectedHash] of Object.entries(artManifest.sha256 ?? {})) {
        if (!isSafeRelative(relative) || !fs.existsSync(path.join(root, relative))) {
          fail(`${module.id}: file art candidate mancante ${relative}`);
          continue;
        }
        const actualHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
        if (actualHash !== expectedHash) fail(`${module.id}: checksum art candidate non coerente ${relative}`);
      }
    }
  }
}

function catalogMarkdown(catalog, manifests) {
  const lines = [
    '# Palermo Streets - Production content catalog',
    '',
    `Pipeline: \`${catalog.pipeline_version}\``,
    '',
    '| ID | Tipo | Stato | Manifest |',
    '|---|---|---|---|',
  ];
  for (const entry of catalog.entries) lines.push(`| ${entry.id} | ${entry.kind} | ${entry.status} | \`${entry.manifest}\` |`);
  lines.push('', '## Contratti globali', '', '- Viewport runtime: 1280x720', '- Canvas personaggi: 640x420; baseline Y=400', '- Scala personaggi runtime: 1.0', '- Master stage: 3840x1080 -> runtime 2560x720', '- Sorgenti portabili: JSON + PNG + BLEND/KRA; runtime PixiJS separato', '', '## Greybox moduli', '', '- Il greybox non sostituisce automaticamente lo sfondo runtime.', '- Approvare prima scala, orizzonte, walk band e tre inquadrature camera.', '- Solo dopo l’approvazione si produce FAR/MAIN/FOREGROUND finale.');
  return `${lines.join('\n')}\n`;
}

export function renderBuildOutputs(root, loaded = null) {
  const state = loaded ?? validateRepository(root);
  if (state.errors?.length) throw new Error(`Contenuti non validi:\n${state.errors.join('\n')}`);
  const registry = {
    schema: 1,
    pipeline_version: state.catalog.pipeline_version,
    generated_from: 'content-src/catalog.json',
    content: state.catalog.entries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      status: entry.status,
      manifest: entry.manifest,
    })),
  };
  const outputs = new Map();
  outputs.set('production-preview/content_registry.json', `${JSON.stringify(registry, null, 2)}\n`);
  outputs.set('production-preview/CONTENT_CATALOG.md', catalogMarkdown(state.catalog, state.manifests));
  const stageModules = [...state.manifests.entries()]
    .filter(([, manifest]) => manifest.kind === 'stage_module')
    .sort(([, a], [, b]) => a.id.localeCompare(b.id));
  for (const [, module] of stageModules) {
    outputs.set(`production-preview/${module.id}/${module.id}_GREYBOX_MASTER.svg`, sceneSvg(module));
    outputs.set(`production-preview/${module.id}/${module.id}_WALK_MASK.svg`, walkMaskSvg(module));
    const masterCameraWidth = 1280 / module.geometry.master_to_runtime_scale;
    for (const cameraX of [0, 640, 1280]) {
      outputs.set(
        `production-preview/${module.id}/${module.id}_CAMERA_X${String(cameraX).padStart(4, '0')}.svg`,
        sceneSvg(module, {
          viewXMaster: cameraX / module.geometry.master_to_runtime_scale,
          viewWidthMaster: masterCameraWidth,
          outputWidth: 1280,
          outputHeight: 720,
          cameraLabel: `${module.id} CAMERA X=${cameraX} runtime`,
        }),
      );
    }
  }
  return outputs;
}

export function writeBuildOutputs(root) {
  const state = validateRepository(root);
  if (state.errors.length) return state;
  for (const [relative, contents] of renderBuildOutputs(root, state)) {
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, contents, 'utf8');
  }
  return state;
}

export function scaffoldContent(root, kind, id, displayName = id.toUpperCase()) {
  const specs = {
    player: ['character-main.json', `content-src/drafts/characters/${id}.content.json`],
    enemy: ['character-enemy.json', `content-src/drafts/characters/${id}.content.json`],
    stage: ['stage.json', `content-src/drafts/stages/${id}.content.json`],
    object: ['object.json', `content-src/drafts/objects/${id}.content.json`],
    ambient: ['ambient-actor.json', `content-src/drafts/ambient/${id}.content.json`],
  };
  if (!specs[kind]) throw new Error(`tipo non supportato: ${kind}; usare player|enemy|stage|object|ambient`);
  if (!/^[a-z][a-z0-9_]*$/.test(id)) throw new Error('id non valido: usare minuscole, numeri e underscore');
  const [templateName, destination] = specs[kind];
  const absolute = path.join(root, destination);
  if (fs.existsSync(absolute)) throw new Error(`bozza gia esistente: ${destination}`);
  const template = fs.readFileSync(path.join(root, 'content-src/templates', templateName), 'utf8');
  const contents = template.replaceAll('__ID__', id).replaceAll('__DISPLAY_NAME__', displayName);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, contents, 'utf8');
  return destination.split(path.sep).join(POSIX.sep);
}
