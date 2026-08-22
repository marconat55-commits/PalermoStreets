import { Container, Graphics, Sprite } from 'pixi.js';
import type { Enemy } from '../entities/Enemy';

interface EnemyHudEntry {
  root: Container;
  portrait: Sprite;
  mask: Graphics;
}

const PANEL_WIDTH = 146;
const PANEL_HEIGHT = 48;
const PORTRAIT_SIZE = 42;
const PANEL_GAP = 8;
const RIGHT_EDGE = 1240;
const TOP = 48;

export function portraitTransform(
  bounds: [number, number, number, number],
  frameWidth: number,
  frameHeight: number,
): { x: number; y: number; scale: number } {
  const [left, top, width, height] = bounds;
  const headHeight = Math.max(1, height * 0.30);
  const scale = PORTRAIT_SIZE / headHeight;
  const headCenterX = left + width / 2;
  return {
    x: 3 + PORTRAIT_SIZE / 2 - (headCenterX - frameWidth / 2) * scale,
    y: 3 - (top - frameHeight) * scale,
    scale,
  };
}

/** Screen-space enemy energy panels. No world-space labels are rendered above actors. */
export class EnemyHudLayer {
  readonly root = new Container();
  private readonly graphics = new Graphics();
  private readonly entries = new Map<number, EnemyHudEntry>();

  constructor() {
    this.root.zIndex = 10000;
    this.root.addChild(this.graphics);
  }

  update(enemies: Enemy[]): void {
    this.graphics.clear();
    const live = enemies
      .filter((enemy) => !enemy.dead && enemy.alpha255 >= 120 && !enemy.isBoss)
      .sort((a, b) => a.actorId - b.actorId);
    const seen = new Set<number>();

    for (let index = 0; index < live.length; index += 1) {
      const enemy = live[index]!;
      seen.add(enemy.actorId);
      const panelX = RIGHT_EDGE - PANEL_WIDTH - index * (PANEL_WIDTH + PANEL_GAP);
      const panelY = TOP;
      let entry = this.entries.get(enemy.actorId);
      if (!entry) {
        entry = this.createEntry(enemy);
        this.entries.set(enemy.actorId, entry);
      }
      entry.root.visible = true;
      entry.root.position.set(panelX, panelY);

      const ratio = Math.max(0, Math.min(1, enemy.health / Math.max(1, enemy.maxHealth)));
      this.graphics.roundRect(panelX, panelY, PANEL_WIDTH, PANEL_HEIGHT, 5)
        .fill({ color: 0x09080b, alpha: 0.84 })
        .stroke({ color: 0xe0b966, width: 1.5 });
      this.graphics.rect(panelX + 50, panelY + 15, 88, 17).fill(0x281719);
      this.graphics.rect(panelX + 52, panelY + 17, 84, 13).fill(0x4a1d1b);
      if (ratio > 0) this.graphics.rect(panelX + 52, panelY + 17, 84 * ratio, 13).fill(0xd64128);
      this.graphics.rect(panelX + 52, panelY + 34, 84, 2).fill({ color: 0xf4c86d, alpha: 0.55 });
    }

    for (const [id, entry] of this.entries) {
      if (!seen.has(id)) entry.root.visible = false;
    }
  }

  removeActor(actorId: number): void {
    const entry = this.entries.get(actorId);
    if (!entry) return;
    entry.root.destroy({ children: true });
    this.entries.delete(actorId);
  }

  private createEntry(enemy: Enemy): EnemyHudEntry {
    const root = new Container();
    const mask = new Graphics().roundRect(3, 3, PORTRAIT_SIZE, PORTRAIT_SIZE, 4).fill(0xffffff);
    const frame = enemy.animator.bank.clips.get('idle')?.frames[0] ?? enemy.animator.frame;
    const portrait = new Sprite(frame.texture);
    const transform = portraitTransform(frame.bounds, frame.width, frame.height);
    portrait.anchor.set(0.5, 1);
    portrait.scale.set(transform.scale);
    portrait.position.set(transform.x, transform.y);
    portrait.mask = mask;
    root.addChild(portrait, mask);
    this.root.addChild(root);
    return { root, portrait, mask };
  }
}
