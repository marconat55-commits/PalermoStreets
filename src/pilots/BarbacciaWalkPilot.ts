import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

const WIDTH = 1280;
const HEIGHT = 720;
const BASELINE_Y = 590;
const ROOT = '/art_source/stage1_zen/barbaccia_arcade_v1/';
type FrameSpec = readonly [path: string, durationMs: number];
const CLIPS = {
  idle: [
    ['idle_frames_v1/inhale.png', 190],
    ['idle_frames_v1/rise.png', 180],
    ['idle_frames_v1/settle.png', 210],
    ['idle_frames_v1/adjust.png', 180],
  ],
  walk: [
    ['walk_frames_v1/contact_right.png', 145],
    ['walk_frames_v1/pass_right.png', 125],
    ['walk_frames_v1/contact_left.png', 145],
    ['walk_frames_v1/settle.png', 135],
    ['walk_frames_v1/pass_left.png', 125],
    ['walk_frames_v1/return_contact.png', 145],
  ],
  attack: [
    ['quick_attack_frames_v1/anticipation.png', 120],
    ['quick_attack_frames_v1/contact.png', 100],
    ['quick_attack_frames_v1/recovery.png', 190],
  ],
} as const satisfies Record<string, readonly FrameSpec[]>;
type ClipKey = keyof typeof CLIPS;
const requestedClip = new URLSearchParams(window.location.search).get('clip');
const CLIP_KEY: ClipKey = requestedClip === 'idle' || requestedClip === 'attack' ? requestedClip : 'walk';
const FRAMES: readonly FrameSpec[] = CLIPS[CLIP_KEY];

export class BarbacciaWalkPilot {
  private readonly app = new Application();
  private readonly actor = new Container();
  private readonly sprites: Sprite[] = [];
  private readonly status = new Text({
    text: '',
    style: { fill: '#fff', fontFamily: 'Arial', fontSize: 18, fontWeight: '700' },
  });
  private frameIndex = 0;
  private elapsedMs = 0;
  private playing = true;

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({ width: WIDTH, height: HEIGHT, background: '#15171d', antialias: true });
    host.replaceChildren(this.app.canvas);
    const [background, ...textures] = await Promise.all([
      Assets.load<Texture>('/assets/backgrounds/stage1_zen/final_v2/M01/M01_MAIN.png'),
      ...FRAMES.map(([path]) => Assets.load<Texture>(ROOT + path)),
    ]);
    const backdrop = new Sprite(background);
    backdrop.position.set(-870, -72);
    const shade = new Graphics().rect(0, 0, WIDTH, HEIGHT).fill({ color: 0x05070b, alpha: 0.18 });
    this.actor.position.set(790, BASELINE_Y);
    textures.forEach((texture, index) => {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 400 / 420);
      sprite.visible = index === 0;
      this.sprites.push(sprite);
      this.actor.addChild(sprite);
    });
    this.actor.zIndex = BASELINE_Y;
    this.status.position.set(24, 675);
    this.app.stage.addChild(backdrop, shade, this.actor, this.makeUi());
    window.addEventListener('keydown', this.onKey);
    this.showFrame(0);
    this.app.ticker.add((ticker) => this.update(ticker.deltaMS));
  }

  private makeUi(): Container {
    const ui = new Container();
    const panel = new Graphics().rect(18, 16, 640, 95).fill({ color: 0x09080b, alpha: 0.84 })
      .stroke({ color: 0xffb628, width: 2 });
    const title = new Text({
      text: `BARBACCIA ARCADE V1 - ${CLIP_KEY.toUpperCase()} ${FRAMES.length} POSE`,
      style: { fill: '#ffd078', fontFamily: 'Bangers, Arial Black', fontSize: 30 },
    });
    title.position.set(34, 26);
    const help = new Text({
      text: '1 idle | 2 walk | 3 attack | SPAZIO pausa | frecce: singola posa',
      style: { fill: '#fff', fontFamily: 'Arial', fontSize: 16 },
    });
    help.position.set(34, 72);
    ui.addChild(panel, title, help, this.status);
    return ui;
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    const clipByKey: Partial<Record<string, ClipKey>> = { Digit1: 'idle', Digit2: 'walk', Digit3: 'attack' };
    const selectedClip = clipByKey[event.code];
    if (selectedClip) {
      const params = new URLSearchParams(window.location.search);
      params.set('clip', selectedClip);
      window.location.search = params.toString();
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      this.playing = !this.playing;
      this.updateStatus();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.playing = false;
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      this.showFrame((this.frameIndex + direction + FRAMES.length) % FRAMES.length);
    }
  };

  private update(deltaMs: number): void {
    if (!this.playing) return;
    this.elapsedMs += deltaMs;
    const duration = FRAMES[this.frameIndex]![1];
    if (this.elapsedMs < duration) return;
    this.elapsedMs %= duration;
    this.showFrame((this.frameIndex + 1) % FRAMES.length);
  }

  private showFrame(index: number): void {
    this.frameIndex = index;
    this.sprites.forEach((sprite, spriteIndex) => { sprite.visible = spriteIndex === index; });
    this.updateStatus();
  }

  private updateStatus(): void {
    this.status.text = `Posa ${this.frameIndex + 1}/${FRAMES.length} - ${FRAMES[this.frameIndex]![1]} ms - ${this.playing ? 'IN MOVIMENTO' : 'PAUSA'}`;
  }
}

