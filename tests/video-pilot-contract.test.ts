import assert from 'node:assert/strict';
import test from 'node:test';
import { parseVideoPilotArgs, pilotRelativeRoot, validateProbe, validateVideoPilotOptions } from '../scripts/video-pilot-contract.mjs';

test('Julien pilot accepts one short 12 fps motion interval', () => {
  const options = parseVideoPilotArgs(['--character', 'julien', '--motion', 'direct_punch', '--video', 'julien.mp4', '--start', '0.25', '--duration', '1.5']);
  assert.deepEqual(validateVideoPilotOptions(options), []);
  assert.equal(pilotRelativeRoot(options.character, options.motion, 'abcdef1234567890'), 'character_factory/julien/video_pilot/direct_punch/abcdef123456');
});

test('pilot rejects long clips and arbitrary extraction rates', () => {
  const options = parseVideoPilotArgs(['--motion', 'direct_punch', '--video', 'julien.mp4', '--fps', '24', '--duration', '8']);
  assert.deepEqual(validateVideoPilotOptions(options), ['il pilot usa 12 fps fissi', 'duration deve essere compresa tra 0 e 3 secondi']);
});

test('probe contract prevents extraction beyond the source duration', () => {
  const probe = { streams: [{ codec_type: 'video', width: 1920, height: 1080 }], format: { duration: '2.0' } };
  assert.deepEqual(validateProbe(probe, { start: 1, duration: 1.5 }), ['l’intervallo richiesto supera la durata del video']);
  assert.deepEqual(validateProbe(probe, { start: 0.25, duration: 1.5 }), []);
});
