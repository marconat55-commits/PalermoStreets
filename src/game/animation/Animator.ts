import type { AnimationBank, AnimationClip, VisualFrame } from '../types';

const MIN_PLAYBACK_RATE = 0.45;
const MAX_PLAYBACK_RATE = 2.25;
const DEFAULT_POSE_BLEND = 0.055;

function clipDuration(clip: AnimationClip): number {
  return clip.frames.reduce((sum, frame) => sum + frame.duration, 0);
}

export class Animator {
  readonly bank: AnimationBank;
  name = 'idle';
  frameIndex = 0;
  frameElapsed = 0;
  finished = false;
  playbackRate = 1;
  private blendFrom: VisualFrame | null = null;
  private blendSourceFacing: -1 | 1 = 1;
  private blendElapsed = DEFAULT_POSE_BLEND;
  private blendDuration = DEFAULT_POSE_BLEND;

  constructor(bank: AnimationBank, initial = 'idle') {
    this.bank = bank;
    this.play(initial, true);
  }

  private clipByName(name: string): AnimationClip {
    return this.bank.clips.get(name) ?? this.bank.clips.get('idle')!;
  }

  private phase(): number {
    const duration = this.duration;
    if (duration <= 0) return 0;
    let elapsed = this.frameElapsed;
    for (let index = 0; index < this.frameIndex; index += 1) {
      elapsed += this.clip.frames[index]?.duration ?? 0;
    }
    return Math.max(0, Math.min(0.999999, elapsed / duration));
  }

  private seekPhase(phase: number): void {
    const target = Math.max(0, Math.min(0.999999, phase)) * this.duration;
    this.frameIndex = 0;
    this.frameElapsed = target;
    while (
      this.frameIndex < this.clip.frames.length - 1 &&
      this.frameElapsed >= (this.clip.frames[this.frameIndex]?.duration ?? Number.POSITIVE_INFINITY)
    ) {
      this.frameElapsed -= this.clip.frames[this.frameIndex]?.duration ?? 0;
      this.frameIndex += 1;
    }
  }

  play(name: string, restart = false, preservePhase = false): void {
    if (name === this.name && !restart) return;
    const previousName = this.name;
    const previousFrame = this.frame;
    const previousFacing = this.sourceFacing;
    const previousPhase = preservePhase ? this.phase() : 0;
    this.name = this.bank.clips.has(name) ? name : 'idle';
    this.frameIndex = 0;
    this.frameElapsed = 0;
    this.finished = false;
    if (preservePhase) this.seekPhase(previousPhase);
    if (previousName !== this.name) {
      this.blendFrom = previousFrame;
      this.blendSourceFacing = previousFacing;
      this.blendElapsed = 0;
      this.blendDuration = preservePhase ? 0.035 : DEFAULT_POSE_BLEND;
    }
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(MIN_PLAYBACK_RATE, Math.min(MAX_PLAYBACK_RATE, rate));
  }

  fitDuration(targetSeconds: number): void {
    this.setPlaybackRate(targetSeconds > 0 ? this.duration / targetSeconds : 1);
  }

  /** Synchronizes a pose to an external motion curve, such as the jump parabola. */
  seekNormalized(phase: number): void {
    this.finished = false;
    this.seekPhase(Math.max(0, Math.min(0.999999, phase)));
  }

  update(dt: number): boolean {
    if (this.blendFrom) {
      this.blendElapsed += dt;
      if (this.blendElapsed >= this.blendDuration) this.blendFrom = null;
    }
    const clip = this.clip;
    if (clip.frames.length === 0 || this.finished) return false;
    const before = this.frameIndex;
    const beforeFrame = this.frame;
    const beforeFacing = this.sourceFacing;
    this.frameElapsed += dt * this.playbackRate;
    while (this.frameElapsed >= (clip.frames[this.frameIndex]?.duration ?? 999)) {
      this.frameElapsed -= clip.frames[this.frameIndex]?.duration ?? 0;
      this.frameIndex += 1;
      if (this.frameIndex >= clip.frames.length) {
        if (clip.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = Math.max(0, clip.frames.length - 1);
          this.finished = true;
          break;
        }
      }
    }
    const changed = before !== this.frameIndex;
    if (changed && (clip.frameBlend ?? 0) > 0) {
      this.blendFrom = beforeFrame;
      this.blendSourceFacing = beforeFacing;
      this.blendElapsed = 0;
      this.blendDuration = Math.min(clip.frameBlend ?? 0, (clip.frames[this.frameIndex]?.duration ?? 0.1) * 0.5);
    }
    return changed;
  }

  get clip(): AnimationClip {
    return this.clipByName(this.name);
  }

  get duration(): number {
    return clipDuration(this.clip);
  }

  get frame(): VisualFrame {
    return this.clip.frames[Math.min(this.frameIndex, this.clip.frames.length - 1)]!;
  }

  get sourceFacing(): -1 | 1 {
    return this.clip.sourceFacing;
  }

  get transitionFrame(): VisualFrame | null {
    return this.blendFrom;
  }

  get transitionAlpha(): number {
    if (!this.blendFrom || this.blendDuration <= 0) return 0;
    return Math.max(0, 1 - this.blendElapsed / this.blendDuration);
  }

  get transitionSourceFacing(): -1 | 1 {
    return this.blendSourceFacing;
  }
}
