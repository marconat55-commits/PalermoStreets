import { publicUrl } from '../data/paths';

export class SelectionMusic {
  private readonly audio = new Audio(publicUrl('assets/audio/character_select.mp3'));
  private readonly retryOnGesture = (): void => { this.play(); };
  private stopped = false;

  constructor() {
    this.audio.loop = true;
    this.audio.volume = 0.34;
    this.audio.preload = 'auto';
    window.addEventListener('keydown', this.retryOnGesture);
    window.addEventListener('pointerdown', this.retryOnGesture);
    this.play();
  }

  private play(): void {
    if (this.stopped || !this.audio.paused) return;
    void this.audio.play().then(() => {
      window.removeEventListener('keydown', this.retryOnGesture);
      window.removeEventListener('pointerdown', this.retryOnGesture);
    }).catch(() => undefined);
  }

  destroy(): void {
    this.stopped = true;
    window.removeEventListener('keydown', this.retryOnGesture);
    window.removeEventListener('pointerdown', this.retryOnGesture);
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.src = '';
  }
}
