import type { Container } from 'pixi.js';
import type { Input } from '../input/Input';

export interface Scene {
  readonly root: Container;
  update(dt: number, input: Input): void;
  destroy(): void;
}
