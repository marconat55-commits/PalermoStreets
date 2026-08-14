export class Input {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();

  constructor() {
    window.addEventListener('keydown', (event) => {
      const code = event.code;
      if (!this.held.has(code)) this.pressed.add(code);
      this.held.add(code);
      if (['KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space'].includes(code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => this.held.delete(event.code));
    window.addEventListener('blur', () => {
      this.held.clear();
      this.pressed.clear();
    });
  }

  isDown(...codes: string[]): boolean {
    return codes.some((code) => this.held.has(code));
  }

  wasPressed(...codes: string[]): boolean {
    return codes.some((code) => this.pressed.has(code));
  }

  endFrame(): void {
    this.pressed.clear();
  }
}
