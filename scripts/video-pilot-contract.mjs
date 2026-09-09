import path from 'node:path';

export const VIDEO_PILOT_FPS = 12;
export const VIDEO_PILOT_MAX_DURATION = 3;

export function parseVideoPilotArgs(argv) {
  const options = { character: 'julien', fps: VIDEO_PILOT_FPS, start: 0, duration: null, video: null, motion: null, check: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check') { options.check = true; continue; }
    const key = argument.startsWith('--') ? argument.slice(2) : '';
    if (!['character', 'video', 'motion', 'fps', 'start', 'duration'].includes(key)) throw new Error(`argomento non riconosciuto: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`valore mancante per --${key}`);
    index += 1;
    options[key] = ['fps', 'start', 'duration'].includes(key) ? Number(value) : value;
  }
  return options;
}

export function validateVideoPilotOptions(options, { requireVideo = true } = {}) {
  const errors = [];
  if (!/^[a-z][a-z0-9_]*$/.test(options.character ?? '')) errors.push('character deve usare minuscole, numeri e underscore');
  if (!/^[a-z][a-z0-9_]*$/.test(options.motion ?? '')) errors.push('motion obbligatoria: usare minuscole, numeri e underscore');
  if (requireVideo && !options.video) errors.push('video obbligatorio');
  if (options.fps !== VIDEO_PILOT_FPS) errors.push(`il pilot usa ${VIDEO_PILOT_FPS} fps fissi`);
  if (!Number.isFinite(options.start) || options.start < 0) errors.push('start deve essere un numero >= 0');
  if (!Number.isFinite(options.duration) || options.duration <= 0 || options.duration > VIDEO_PILOT_MAX_DURATION) {
    errors.push(`duration deve essere compresa tra 0 e ${VIDEO_PILOT_MAX_DURATION} secondi`);
  }
  return errors;
}

export function pilotRelativeRoot(character, motion, videoHash) {
  return path.posix.join('character_factory', character, 'video_pilot', motion, videoHash.slice(0, 12));
}

export function selectVideoStream(probe) {
  return (probe?.streams ?? []).find((stream) => stream.codec_type === 'video') ?? null;
}

export function validateProbe(probe, options) {
  const errors = [];
  const stream = selectVideoStream(probe);
  if (!stream) return ['il file non contiene una traccia video'];
  if (!(stream.width > 0 && stream.height > 0)) errors.push('risoluzione video non valida');
  const totalDuration = Number(probe?.format?.duration ?? stream.duration);
  if (!Number.isFinite(totalDuration)) errors.push('durata video non leggibile');
  else if (options.start + options.duration > totalDuration + 0.05) errors.push('l’intervallo richiesto supera la durata del video');
  return errors;
}
