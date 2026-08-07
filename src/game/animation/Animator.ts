import type { AnimationBank, AnimationClip, VisualFrame } from '../types';

export class Animator {
  readonly bank: AnimationBank;
  name = 'idle';
  frameIndex = 0;
  frameElapsed = 0;
  finished = false;

  constructor(bank: AnimationBank, initial = 'idle') {
    this.bank = bank;
    this.play(initial, true);
  }

  private clipByName(name: string): AnimationClip {
    return this.bank.clips.get(name) ?? this.bank.clips.get('idle')!;
  }

  play(name: string, restart = false): void {
    if (name === this.name && !restart) return;
    this.name = this.bank.clips.has(name) ? name : 'idle';
    this.frameIndex = 0;
    this.frameElapsed = 0;
    this.finished = false;
  }

  update(dt: number): boolean {
    const clip = this.clip;
    if (clip.frames.length === 0 || this.finished) return false;
    const before = this.frameIndex;
    this.frameElapsed += dt;
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
    return before !== this.frameIndex;
  }

  get clip(): AnimationClip {
    return this.clipByName(this.name);
  }

  get frame(): VisualFrame {
    return this.clip.frames[Math.min(this.frameIndex, this.clip.frames.length - 1)]!;
  }

  get sourceFacing(): -1 | 1 {
    return this.clip.sourceFacing;
  }
}
