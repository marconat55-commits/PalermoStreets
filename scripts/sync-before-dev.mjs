import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const branch = 'crowdfunding-rebuild';

function git(args, timeout = 15000) {
  return spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    timeout,
    windowsHide: true,
  });
}

if (!existsSync(path.join(root, '.git'))) {
  console.log('Avvio la copia locale: questa cartella non è un checkout Git.');
  process.exit(0);
}

const active = git(['branch', '--show-current']);
if (active.status !== 0 || active.stdout.trim() !== branch) {
  console.error(`Il gioco aggiornato è sul ramo ${branch}. Aprilo con: git switch ${branch}`);
  process.exit(1);
}

const fetched = git(['fetch', 'origin', branch]);
if (fetched.status !== 0) {
  console.warn('GitHub non raggiungibile: avvio la versione locale già disponibile.');
  process.exit(0);
}

const comparison = git(['rev-list', '--left-right', '--count', `HEAD...origin/${branch}`]);
if (comparison.status !== 0) {
  console.error(comparison.stderr.trim() || 'Impossibile confrontare la versione locale con GitHub.');
  process.exit(1);
}
const [ahead, behind] = comparison.stdout.trim().split(/\s+/).map(Number);
if (behind === 0) {
  console.log(`Palermo Streets aggiornato (${branch}).`);
  process.exit(0);
}
if (ahead > 0) {
  console.error('La versione locale e quella online hanno modifiche diverse: controlla Git prima di avviare il gioco.');
  process.exit(1);
}

const updated = git(['merge', '--ff-only', `origin/${branch}`], 30000);
if (updated.status !== 0) {
  console.error('Aggiornamento fermato per conservare le modifiche locali. Controlla git status.');
  console.error(updated.stderr.trim() || updated.stdout.trim());
  process.exit(1);
}
console.log(`Palermo Streets aggiornato da GitHub (${branch}).`);
