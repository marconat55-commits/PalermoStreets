import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseVideoPilotArgs, pilotRelativeRoot, selectVideoStream, validateProbe, validateVideoPilotOptions } from './video-pilot-contract.mjs';

function fail(message) {
  console.error(`VIDEO PILOT FAILED - ${message}`);
  process.exit(1);
}

function executableWorks(command) {
  const result = spawnSync(command, ['-version'], { encoding: 'utf8', windowsHide: true });
  return !result.error && result.status === 0;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, ...options });
  if (result.error) fail(`${command} non disponibile: ${result.error.message}`);
  if (result.status !== 0) fail(`${command}: ${(result.stderr || result.stdout || `exit ${result.status}`).trim()}`);
  return result.stdout;
}

const options = parseVideoPilotArgs(process.argv.slice(2));
if (!executableWorks('ffmpeg') || !executableWorks('ffprobe')) {
  fail('servono ffmpeg e ffprobe nel PATH; installarli e verificare con "ffmpeg -version" e "ffprobe -version"');
}
if (options.check) {
  console.log('VIDEO PILOT TOOLS PASS - ffmpeg e ffprobe disponibili.');
  process.exit(0);
}
const optionErrors = validateVideoPilotOptions(options);
if (optionErrors.length) fail(optionErrors.join('; '));

const projectRoot = process.cwd();
const videoPath = path.resolve(options.video);
if (!fs.existsSync(videoPath) || !fs.statSync(videoPath).isFile()) fail(`video non trovato: ${videoPath}`);
const identityPath = path.join(projectRoot, 'art_source', 'characters', options.character, 'approved', `${options.character.toUpperCase()}_MASTER_3Q.png`);
if (!fs.existsSync(identityPath)) fail(`master 3/4 non trovato: ${path.relative(projectRoot, identityPath)}`);

const videoHash = crypto.createHash('sha256').update(fs.readFileSync(videoPath)).digest('hex');
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', videoPath]));
const probeErrors = validateProbe(probe, options);
if (probeErrors.length) fail(probeErrors.join('; '));
const stream = selectVideoStream(probe);
const relativeRoot = pilotRelativeRoot(options.character, options.motion, videoHash);
const outputRoot = path.join(projectRoot, ...relativeRoot.split('/'));
const framesRoot = path.join(outputRoot, 'frames');
if (fs.existsSync(outputRoot)) fail(`pilot già estratto: ${relativeRoot}`);
fs.mkdirSync(framesRoot, { recursive: true });

run('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-ss', String(options.start), '-i', videoPath,
  '-t', String(options.duration), '-an', '-vf', `fps=${options.fps}`,
  '-fps_mode', 'vfr', path.join(framesRoot, 'frame_%04d.png'),
]);
const framePaths = fs.readdirSync(framesRoot).filter((name) => /^frame_\d{4}\.png$/.test(name)).sort();
if (!framePaths.length) fail('ffmpeg non ha estratto alcun frame');
const frames = framePaths.map((name, index) => {
  const data = fs.readFileSync(path.join(framesRoot, name));
  return { index: index + 1, file: `frames/${name}`, time_seconds: Number((index / options.fps).toFixed(4)), bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex'), status: 'candidate' };
});
const identityData = fs.readFileSync(identityPath);
const manifest = {
  schema: 1,
  kind: 'character_video_pilot',
  status: 'extracted_candidates',
  character: options.character,
  motion: options.motion,
  source_video: { filename: path.basename(videoPath), sha256: videoHash, interval: { start_seconds: options.start, duration_seconds: options.duration }, width: stream.width, height: stream.height, codec: stream.codec_name ?? null },
  identity_lock: { file: path.relative(projectRoot, identityPath).replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(identityData).digest('hex') },
  extraction: { fps: options.fps, frame_count: frames.length, tool: 'ffmpeg', no_runtime_integration: true },
  gates: { human_identity_approval: false, anatomy: 'pending', motion_readability: 'pending', alpha: 'pending', baseline_y_400: 'pending', runtime_scale_1: 'pending' },
  frames,
};
fs.writeFileSync(path.join(outputRoot, 'extraction-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`VIDEO PILOT EXTRACT PASS - ${frames.length} frame in ${relativeRoot}`);
console.log('Stato: candidate. Nessun asset runtime o profilo personaggio è stato modificato.');
