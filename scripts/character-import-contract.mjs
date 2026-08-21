import fs from 'node:fs';
import path from 'node:path';

export function readPngHeader(file) {
  const buffer = fs.readFileSync(file);
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 26 || buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error(`${file}: PNG non valido`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

export function collectExpectedFrames(profile, sourceRoot) {
  const frames = new Map();
  const clips = [
    ...Object.entries(profile.animations ?? {}),
    ...Object.entries(profile.archived_animations ?? {}),
  ];
  for (const [clip, spec] of clips) {
    const count = spec.source_frames ?? spec.frames;
    if (!Number.isInteger(count) || count < 1) throw new Error(`${profile.id}/${clip}: frame count non valido`);
    for (let index = 1; index <= count; index += 1) {
      const name = `${String(index).padStart(2, '0')}.png`;
      const key = `${spec.folder}/${name}`;
      frames.set(key, path.join(sourceRoot, spec.folder, name));
    }
  }
  return frames;
}

export function validateImportSpec(spec, projectRoot) {
  const errors = [];
  if (spec.schema !== 1) errors.push('schema import non supportato');
  if (!/^[a-z][a-z0-9_]*$/.test(spec.id ?? '')) errors.push('id non valido');
  const sourceRoot = path.resolve(projectRoot, spec.source_root ?? '');
  const profilePath = path.resolve(projectRoot, spec.profile_source ?? '');
  if (!fs.existsSync(sourceRoot)) errors.push(`source_root mancante: ${sourceRoot}`);
  if (!fs.existsSync(profilePath)) errors.push(`profile_source mancante: ${profilePath}`);
  if (errors.length) return { errors, sourceRoot, profilePath, profile: null, frames: new Map() };

  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  if (profile.id !== spec.id) errors.push(`profile.id ${profile.id} diverso da ${spec.id}`);
  if (profile.schema !== 1) errors.push(`${spec.id}: schema profilo non supportato`);
  if (!profile.assets?.animation_root?.endsWith(`/${spec.id}_anim`)) errors.push(`${spec.id}: animation_root non canonico`);
  if (!profile.assets?.texture_atlas?.endsWith('/atlas/atlas.json')) errors.push(`${spec.id}: texture_atlas non canonico`);
  if (!profile.assets?.frame_meta?.endsWith(`/${spec.id}.frame_meta.json`)) errors.push(`${spec.id}: frame_meta non canonico`);
  if (profile.factory?.animation_canvas?.[0] !== 640 || profile.factory?.animation_canvas?.[1] !== 420) {
    errors.push(`${spec.id}: animation_canvas deve essere 640x420`);
  }

  const frames = collectExpectedFrames(profile, sourceRoot);
  for (const [key, file] of frames) {
    if (!fs.existsSync(file)) {
      errors.push(`${spec.id}: frame mancante ${key}`);
      continue;
    }
    try {
      const header = readPngHeader(file);
      if (header.width !== 640 || header.height !== 420) errors.push(`${spec.id}/${key}: canvas ${header.width}x${header.height}`);
      if (![4, 6].includes(header.colorType)) errors.push(`${spec.id}/${key}: PNG senza canale alpha`);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { errors, sourceRoot, profilePath, profile, frames };
}
