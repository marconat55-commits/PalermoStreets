import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Enemy } from '../entities/Enemy';

interface LabelEntry {
  label: Text;
}

export class EnemyHudLayer {
  readonly root = new Container();
  private readonly graphics = new Graphics();
  private readonly labels = new Map<number, LabelEntry>();
  private readonly labelStyle = new TextStyle({
    fontFamily: 'Arial, sans-serif',
    fontSize: 13,
    fontWeight: '800',
    fill: 0xffe5ac,
    stroke: { color: 0x120c0c, width: 3 },
  });

  constructor() {
    this.root.zIndex = 10000;
    this.root.addChild(this.graphics);
  }

  update(enemies: Enemy[]): void {
    this.graphics.clear();
    const live = enemies.filter((enemy) => !enemy.dead && enemy.alpha255 >= 120).sort((a, b) => b.position.y - a.position.y || b.actorId - a.actorId);
    const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];
    const seen = new Set<number>();

    for (const enemy of live) {
      seen.add(enemy.actorId);
      let entry = this.labels.get(enemy.actorId);
      if (!entry) {
        const label = new Text({ text: enemy.displayName.toUpperCase(), style: this.labelStyle });
        label.anchor.set(0.5, 1);
        this.root.addChild(label);
        entry = { label };
        this.labels.set(enemy.actorId, entry);
      }
      entry.label.visible = true;
      const ratio = Math.max(0, Math.min(1, enemy.health / Math.max(1, enemy.maxHealth)));
      const width = enemy.isBoss ? 112 : 88;
      const height = enemy.isBoss ? 9 : 7;
      const centerX = Math.round(enemy.position.x);
      let barY = enemy.visualTop() - 10;
      const labelHeight = entry.label.height;
      const panelWidth = Math.max(width + 8, entry.label.width + 8);
      const panelHeight = labelHeight + height + 9;
      let panel = { x: centerX - panelWidth / 2, y: barY - labelHeight - 6, width: panelWidth, height: panelHeight };
      const intersects = (a: typeof panel, b: typeof panel): boolean => a.x < b.x + b.width + 4 && a.x + a.width + 4 > b.x && a.y < b.y + b.height + 3 && a.y + a.height + 3 > b.y;
      while (occupied.some((other) => intersects(panel, other))) {
        barY -= 18;
        panel = { x: centerX - panelWidth / 2, y: barY - labelHeight - 6, width: panelWidth, height: panelHeight };
      }
      occupied.push(panel);

      this.graphics.roundRect(panel.x, panel.y, panel.width, panel.height, 3).fill({ color: 0x0a080a, alpha: 0.62 });
      const boxX = centerX - width / 2;
      this.graphics.roundRect(boxX, barY, width, height, 2).fill(0x120d0e).stroke({ color: 0xf5d38b, width: 1 });
      this.graphics.roundRect(boxX + 2, barY + 2, width - 4, Math.max(1, height - 4), 1).fill(0x411b19);
      const innerWidth = Math.max(0, (width - 4) * ratio);
      if (innerWidth > 0) {
        this.graphics.roundRect(boxX + 2, barY + 2, innerWidth, Math.max(1, height - 4), 1).fill(enemy.isBoss ? 0xbe2a22 : 0xda4526);
      }
      entry.label.position.set(centerX, barY - 2);
    }

    for (const [id, entry] of this.labels) {
      if (!seen.has(id)) entry.label.visible = false;
    }
  }

  removeActor(actorId: number): void {
    const entry = this.labels.get(actorId);
    if (!entry) return;
    entry.label.destroy();
    this.labels.delete(actorId);
  }
}
