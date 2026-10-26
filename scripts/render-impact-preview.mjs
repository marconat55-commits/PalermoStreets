import fs from 'node:fs';
import path from 'node:path';
import { synthesizeImpact } from '../src/game/audio/ImpactAudio.ts';

const rate = 44_100;
const gap = Math.round(rate * 0.32);
const clips = ['light', 'light', 'heavy', 'throw'].map((kind, index) => synthesizeImpact(kind, index));
const sampleCount = clips.reduce((total, clip) => total + clip.length + gap, 0);
const wav = Buffer.alloc(44 + sampleCount * 2);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(sampleCount * 2, 40);
let offset = 44;
for (const clip of clips) {
  for (const sample of clip) {
    wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), offset);
    offset += 2;
  }
  offset += gap * 2;
}
const destination = path.resolve('drafts/audio/impact-arcade-preview.wav');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, wav);
console.log(destination);
