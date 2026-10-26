export type ImpactSound = 'light' | 'heavy' | 'throw';
export type ImpactCue = ImpactSound | 'slap' | 'grab' | 'kick' | 'head' | 'block' | 'special' | 'fall' | 'boss';

const CLIPS: Record<ImpactCue, readonly string[]> = {
  light: ['01_Pugno_Secco', '02_Pugno_Classico'],
  heavy: ['03_Pugno_Pesante', '06_Montante'],
  throw: ['05_Sberlone_Bud'],
  slap: ['04_Schiaffo'],
  grab: ['05_Sberlone_Bud'],
  kick: ['07_Calcio_Laterale'],
  head: ['08_Testata_Comica'],
  block: ['09_Parata'],
  special: ['10_Doppio_Pugno'],
  fall: ['11_Caduta_KO'],
  boss: ['12_Boss_Barbaccia'],
};

const CLIP_NAMES = [...new Set(Object.values(CLIPS).flat())];

export function playerImpactCue(attackName: string | undefined, heavy: boolean): ImpactCue {
  if (attackName === 'throw') return 'throw';
  if (attackName === 'grab_strike') return 'grab';
  if (attackName === 'spin_special' || attackName === 'super') return 'special';
  if (attackName === 'combo_elbow') return 'head';
  if (attackName?.startsWith('kick_') || attackName === 'air_attack') return 'kick';
  return heavy ? 'heavy' : 'light';
}

const SAMPLE_RATE = 44_100;

export function synthesizeImpact(kind: ImpactSound, variant: number): Float32Array {
  const duration = kind === 'light' ? 0.17 : kind === 'heavy' ? 0.27 : 0.37;
  const samples = new Float32Array(Math.ceil(duration * SAMPLE_RATE));
  let seed = 0x45d9f3b ^ (variant * 0x9e3779b9) ^ (kind === 'throw' ? 0x1201 : kind === 'heavy' ? 0x7859 : 0x3461);
  let fastNoise = 0;
  let slowNoise = 0;
  let peak = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / SAMPLE_RATE;
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    fastNoise += (noise - fastNoise) * 0.48;
    slowNoise += (noise - slowNoise) * 0.038;
    const smack = (fastNoise - slowNoise) * Math.exp(-time * (kind === 'light' ? 48 : 34));
    const attack = Math.min(1, time / 0.003);

    const lowStart = kind === 'light' ? 135 : kind === 'heavy' ? 105 : 88;
    const lowEnd = kind === 'light' ? 64 : kind === 'heavy' ? 48 : 39;
    const lowPhase = Math.PI * 2 * (lowStart * time + (lowEnd - lowStart) * time * time / (2 * duration));
    const thud = Math.sin(lowPhase) * Math.exp(-time * (kind === 'light' ? 24 : 14));

    // The brief descending overtone gives the heavier blows an arcade-comic "bwop".
    const rubberTime = Math.max(0, time - 0.018);
    const rubberSpan = kind === 'throw' ? 0.32 : 0.20;
    const rubberPhase = Math.PI * 2 * (245 * rubberTime - 150 * rubberTime * rubberTime / (2 * rubberSpan));
    const rubber = kind === 'light' || time < 0.018
      ? 0
      : Math.sin(rubberPhase)
        * Math.exp(-rubberTime * (kind === 'throw' ? 9 : 17));

    const value = attack * (smack * (kind === 'light' ? 0.98 : 0.78)
      + thud * (kind === 'light' ? 0.42 : 0.70)
      + rubber * (kind === 'throw' ? 0.38 : 0.22));
    samples[index] = value;
    peak = Math.max(peak, Math.abs(value));
  }

  const normalization = peak > 0 ? 0.88 / peak : 1;
  for (let index = 0; index < samples.length; index += 1) samples[index] = samples[index]! * normalization;
  return samples;
}

function makeImpactBuffer(context: AudioContext, kind: ImpactSound, variant: number): AudioBuffer {
  const samples = synthesizeImpact(kind, variant);
  const buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
  buffer.getChannelData(0).set(samples);
  return buffer;
}

export class ImpactAudio {
  private context: AudioContext | null = null;
  private buffers: Record<ImpactSound, AudioBuffer[]> | null = null;
  private readonly loadedClips = new Map<string, AudioBuffer>();
  private readonly clipRequests = new Map<string, Promise<ArrayBuffer | null>>();
  private readonly cueCounts = new Map<ImpactCue, number>();
  private playCount = 0;
  private lastImpactAt = -1;
  private destroyed = false;
  private readonly onUserGesture = (): void => { this.unlock(); };

  constructor() {
    window.addEventListener('keydown', this.onUserGesture);
    window.addEventListener('pointerdown', this.onUserGesture);
    for (const name of CLIP_NAMES) {
      const url = `${import.meta.env.BASE_URL}assets/audio/impacts/${name}.wav`;
      this.clipRequests.set(name, fetch(url)
        .then((response) => response.ok ? response.arrayBuffer() : null)
        .catch(() => null));
    }
  }

  private unlock(): void {
    if (!this.context) {
      if (typeof window.AudioContext !== 'function') return;
      this.context = new window.AudioContext();
      this.buffers = {
        light: [0, 1, 2].map((variant) => makeImpactBuffer(this.context!, 'light', variant)),
        heavy: [0, 1, 2].map((variant) => makeImpactBuffer(this.context!, 'heavy', variant)),
        throw: [0, 1, 2].map((variant) => makeImpactBuffer(this.context!, 'throw', variant)),
      };
      for (const [name, request] of this.clipRequests) {
        void request.then(async (bytes) => {
          if (!bytes || this.destroyed || !this.context) return;
          try {
            const buffer = await this.context.decodeAudioData(bytes);
            if (!this.destroyed) this.loadedClips.set(name, buffer);
          } catch { /* Synthesized impact remains available if decoding fails. */ }
        });
      }
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
  }

  play(kind: ImpactCue): void {
    const context = this.context;
    const buffers = this.buffers;
    if (!context || !buffers || context.state !== 'running') return;
    // A multi-hit on the same animation frame reads as one strong sound, not a blast of noise.
    if (context.currentTime - this.lastImpactAt < 0.035) return;
    this.lastImpactAt = context.currentTime;
    const source = context.createBufferSource();
    const choices = CLIPS[kind];
    const count = this.cueCounts.get(kind) ?? 0;
    this.cueCounts.set(kind, count + 1);
    const clip = this.loadedClips.get(choices[count % choices.length]!);
    const fallback: ImpactSound = kind === 'light' || kind === 'slap' || kind === 'block'
      ? 'light' : kind === 'throw' || kind === 'fall' ? 'throw' : 'heavy';
    source.buffer = clip ?? buffers[fallback][this.playCount % buffers[fallback].length]!;
    this.playCount += 1;
    source.playbackRate.value = 0.97 + (this.playCount % 4) * 0.02;
    const gain = context.createGain();
    gain.gain.value = kind === 'light' || kind === 'slap' ? 0.32 : kind === 'block' ? 0.26 : 0.39;
    source.connect(gain).connect(context.destination);
    source.start();
  }

  destroy(): void {
    this.destroyed = true;
    window.removeEventListener('keydown', this.onUserGesture);
    window.removeEventListener('pointerdown', this.onUserGesture);
    if (this.context) void this.context.close().catch(() => undefined);
    this.context = null;
    this.buffers = null;
    this.loadedClips.clear();
  }
}
