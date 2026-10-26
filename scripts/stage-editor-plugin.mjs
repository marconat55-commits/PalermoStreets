import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const IMAGE_EXTENSIONS = new Set(['.png', '.webp']);
const DEVELOPMENT_BRANCH = 'crowdfunding-rebuild';
const DEFAULT_STAGE_DOCUMENT_ID = 'stage1_zen';
const STAGE_DOCUMENTS = [
  {
    id: 'stage1_zen',
    label: 'Stage 1 — Zen',
    file: 'stage1_zen.json',
    publishable: true,
    validateWithProject: true,
  },
  {
    id: 'stage2_san_lorenzo',
    label: 'Stage 2 — San Lorenzo',
    file: 'stage2_san_lorenzo.json',
    publishable: true,
    validateWithProject: true,
  },
  {
    id: 'stage_prova_cattedrale',
    label: 'Stage 3 — Cattedrale',
    file: 'stage_prova_cattedrale.json',
    publishable: true,
    validateWithProject: true,
  },
];

function resolveStageDocument(value) {
  const requested = typeof value === 'string' && value.length > 0 ? value : DEFAULT_STAGE_DOCUMENT_ID;
  const document = STAGE_DOCUMENTS.find((candidate) => candidate.id === requested);
  if (!document) throw new Error(`Stage editor sconosciuto: ${requested}`);
  return document;
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function collectImages(root, publicRoot) {
  const results = [];
  async function visit(directory) {
    let entries = [];
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        const relative = path.relative(publicRoot, absolute).split(path.sep).join('/');
        results.push(relative);
      }
    }
  }
  await visit(root);
  return results.sort((a, b) => a.localeCompare(b, 'it'));
}

function categoryFor(assetPath) {
  const value = assetPath.toLowerCase();
  if (/vespa|moto|scooter|auto/.test(value)) return 'VEICOLI';
  if (/tree|alber|bush|piant|fiorier|veget|cipress|uliv|ficus|erba/.test(value)) return 'VEGETAZIONE';
  if (/franco|duracell|ragazz|npc|barbaccia/.test(value)) return 'NPC DI FONDO';
  if (/occlusion|foreground/.test(value)) return 'OCCLUSION';
  return 'PROPS STATICI';
}

function buildAssetLibrary(paths) {
  const groups = new Map();
  const singles = [];
  for (const assetPath of paths) {
    if (assetPath.includes('/static_props/') || assetPath.includes('/props/')) {
      singles.push({
        path: assetPath,
        frames: [assetPath, assetPath],
        name: path.basename(assetPath, path.extname(assetPath)),
        category: categoryFor(assetPath),
      });
      continue;
    }
    const directory = path.posix.dirname(assetPath);
    const group = groups.get(directory) ?? [];
    group.push(assetPath);
    groups.set(directory, group);
  }
  const sequences = [...groups.entries()].map(([directory, frames]) => ({
    path: frames[0],
    frames,
    name: path.posix.basename(directory),
    category: categoryFor(directory),
  }));
  return [...singles, ...sequences].sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

async function readBody(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 2_000_000) throw new Error('Richiesta troppo grande');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function send(response, status, payload) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function git(projectRoot, args, timeout = 60_000) {
  return spawnSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
    windowsHide: true,
    timeout,
  });
}

function commandMessage(result, fallback) {
  return result.stderr?.trim() || result.stdout?.trim() || fallback;
}

function publishablePaths(stage, projectRoot, publicRoot, stagePath) {
  const files = new Set([path.relative(projectRoot, stagePath)]);
  for (const module of stage.modules ?? []) {
    for (const actor of module.ambient ?? []) {
      if (actor.kind !== 'sprite_loop' || !Array.isArray(actor.frames)) continue;
      for (const frame of actor.frames) {
        if (typeof frame !== 'string' || frame.length === 0) continue;
        const absolute = path.resolve(publicRoot, frame);
        const relativeToPublic = path.relative(publicRoot, absolute);
        if (relativeToPublic.startsWith('..') || path.isAbsolute(relativeToPublic)) continue;
        files.add(path.relative(projectRoot, absolute));
      }
    }
  }
  return [...files];
}

function assertStage(stage) {
  if (!stage || typeof stage !== 'object' || !Array.isArray(stage.modules)) {
    throw new Error('Formato stage non valido');
  }
  const moduleIds = new Set();
  for (const module of stage.modules) {
    if (!module || typeof module.id !== 'string' || moduleIds.has(module.id)) {
      throw new Error('Modulo senza ID o duplicato');
    }
    moduleIds.add(module.id);
    if (!Array.isArray(module.ambient)) continue;
    const ambientIds = new Set();
    for (const actor of module.ambient) {
      if (!actor || typeof actor.id !== 'string' || ambientIds.has(actor.id)) {
        throw new Error(`${module.id}: oggetto ambientale senza ID o duplicato`);
      }
      ambientIds.add(actor.id);
      if (!Array.isArray(actor.position) || actor.position.length !== 2) throw new Error(`${module.id}/${actor.id}: posizione non valida`);
      if (!Array.isArray(actor.size) || actor.size.length !== 2 || actor.size.some((value) => !Number.isFinite(value) || value <= 0)) {
        throw new Error(`${module.id}/${actor.id}: dimensioni non valide`);
      }
      if (actor.interactive !== false) throw new Error(`${module.id}/${actor.id}: deve restare decorativo`);
    }
  }
}

export function stageEditorPlugin() {
  const projectRoot = process.cwd();
  const publicRoot = path.join(projectRoot, 'public');
  const dataRoot = path.join(publicRoot, 'data');
  const ambientRoot = path.join(publicRoot, 'assets', 'ambient');
  const backgroundRoot = path.join(publicRoot, 'assets', 'backgrounds');

  return {
    name: 'palermo-stage-editor',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        try {
          if (request.method === 'GET' && url.pathname === '/__stage-editor/state') {
            const stageDocument = resolveStageDocument(url.searchParams.get('stage'));
            const stagePath = path.join(dataRoot, stageDocument.file);
            const raw = await fs.readFile(stagePath, 'utf8');
            const [ambientAssets, backgrounds] = await Promise.all([
              collectImages(ambientRoot, publicRoot),
              collectImages(backgroundRoot, publicRoot),
            ]);
            const placeableBackgroundProps = backgrounds.filter((assetPath) => assetPath.includes('/props/'));
            send(response, 200, {
              stage: JSON.parse(raw),
              stageId: stageDocument.id,
              stageOptions: STAGE_DOCUMENTS.map((document) => ({
                id: document.id,
                label: document.label,
                canPublish: document.publishable,
              })),
              canPublish: stageDocument.publishable,
              revision: hash(raw),
              assets: buildAssetLibrary([...ambientAssets, ...placeableBackgroundProps]),
              backgrounds,
            });
            return;
          }

          if (request.method === 'POST' && url.pathname === '/__stage-editor/save') {
            const payload = await readBody(request);
            const stageDocument = resolveStageDocument(payload.stageId);
            const stagePath = path.join(dataRoot, stageDocument.file);
            assertStage(payload.stage);
            const current = await fs.readFile(stagePath, 'utf8');
            if (payload.revision !== hash(current)) {
              send(response, 409, { error: 'Il file stage è cambiato dopo l’apertura. Ricarica l’editor per evitare sovrascritture.' });
              return;
            }

            if (JSON.stringify(JSON.parse(current)) === JSON.stringify(payload.stage)) {
              send(response, 200, { revision: hash(current), message: 'Nessuna modifica da salvare.' });
              return;
            }

            const backupRoot = path.join(projectRoot, '.tmp', 'stage-editor-backups');
            await fs.mkdir(backupRoot, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            await fs.writeFile(path.join(backupRoot, `${stageDocument.id}-${timestamp}.json`), current, 'utf8');
            const nextRaw = `${JSON.stringify(payload.stage, null, 2)}\n`;
            await fs.writeFile(stagePath, nextRaw, 'utf8');

            if (stageDocument.validateWithProject) {
              const validation = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
                cwd: projectRoot,
                encoding: 'utf8',
                windowsHide: true,
                timeout: 30_000,
              });
              if (validation.status !== 0) {
                await fs.writeFile(stagePath, current, 'utf8');
                send(response, 422, { error: validation.stderr.trim() || validation.stdout.trim() || 'Validazione fallita; modifica annullata.' });
                return;
              }
            }

            send(response, 200, { revision: hash(nextRaw), message: 'Stage salvato e validato.' });
            return;
          }

          if (request.method === 'POST' && url.pathname === '/__stage-editor/publish') {
            const payload = await readBody(request);
            const stageDocument = resolveStageDocument(payload.stageId);
            if (!stageDocument.publishable) {
              send(response, 403, { error: 'Questo stage di prova resta locale all’editor.' });
              return;
            }
            const stagePath = path.join(dataRoot, stageDocument.file);
            const moduleId = typeof payload.moduleId === 'string' && /^[A-Z]{1,3}\d{2}$/.test(payload.moduleId) ? payload.moduleId : 'stage';
            const raw = await fs.readFile(stagePath, 'utf8');
            const stage = JSON.parse(raw);
            assertStage(stage);

            const branch = git(projectRoot, ['branch', '--show-current']);
            if (branch.status !== 0 || branch.stdout.trim() !== DEVELOPMENT_BRANCH) {
              send(response, 409, { error: `Apri prima il ramo ${DEVELOPMENT_BRANCH}.` });
              return;
            }

            const validation = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
              cwd: projectRoot,
              encoding: 'utf8',
              windowsHide: true,
              timeout: 30_000,
            });
            if (validation.status !== 0) {
              send(response, 422, { error: commandMessage(validation, 'Validazione dati fallita; pubblicazione annullata.') });
              return;
            }

            const fetched = git(projectRoot, ['fetch', 'origin', DEVELOPMENT_BRANCH], 120_000);
            if (fetched.status !== 0) {
              send(response, 503, { error: commandMessage(fetched, 'GitHub non raggiungibile.') });
              return;
            }
            const comparison = git(projectRoot, ['rev-list', '--left-right', '--count', `HEAD...origin/${DEVELOPMENT_BRANCH}`]);
            if (comparison.status !== 0) {
              send(response, 500, { error: commandMessage(comparison, 'Impossibile confrontare la copia locale con GitHub.') });
              return;
            }
            const [ahead, behind] = comparison.stdout.trim().split(/\s+/).map(Number);
            if (behind > 0) {
              send(response, 409, { error: 'GitHub contiene una versione più recente. Riavvia il server per sincronizzarla prima di pubblicare.' });
              return;
            }

            const files = publishablePaths(stage, projectRoot, publicRoot, stagePath);
            const added = git(projectRoot, ['add', '--', ...files]);
            if (added.status !== 0) {
              send(response, 500, { error: commandMessage(added, 'Impossibile preparare i file per Git.') });
              return;
            }
            const changed = git(projectRoot, ['diff', '--cached', '--quiet', '--', ...files]);
            let committed = false;
            if (changed.status === 1) {
              const committedResult = git(projectRoot, ['commit', '--only', '-m', `Stage editor: aggiorna ${moduleId}`, '--', ...files], 120_000);
              if (committedResult.status !== 0) {
                send(response, 500, { error: commandMessage(committedResult, 'Commit Git fallito.') });
                return;
              }
              committed = true;
            } else if (changed.status !== 0) {
              send(response, 500, { error: commandMessage(changed, 'Impossibile controllare le modifiche da pubblicare.') });
              return;
            }

            if (committed || ahead > 0) {
              const pushed = git(projectRoot, ['push', 'origin', DEVELOPMENT_BRANCH], 120_000);
              if (pushed.status !== 0) {
                send(response, 502, { error: commandMessage(pushed, 'Invio a GitHub fallito. Il commit locale è stato conservato.') });
                return;
              }
            }
            const head = git(projectRoot, ['rev-parse', '--short', 'HEAD']);
            send(response, 200, {
              commit: head.status === 0 ? head.stdout.trim() : undefined,
              message: committed || ahead > 0 ? 'Stage pubblicato su GitHub.' : 'GitHub è già aggiornato.',
            });
            return;
          }
        } catch (error) {
          send(response, 500, { error: error instanceof Error ? error.message : String(error) });
          return;
        }
        next();
      });
    },
  };
}
