import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

export class Hud {
  readonly root = new Container();
  private readonly bars = new Graphics();
  private readonly playerName = new Text({
    text: 'MARCO',
    style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 18, fontWeight: '700', fill: 0xfff5e6 }),
  });
  private readonly rightInfo = new Text({
    text: '',
    style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 16, fill: 0xf5f5f0 }),
  });
  private readonly superReady = new Text({
    text: 'A+B — ATTACCO SPECIALE',
    style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 16, fontWeight: '700', fill: 0xffc32d }),
  });
  private readonly combo = new Text({
    text: '',
    style: new TextStyle({ fontFamily: 'Arial Black, Arial, sans-serif', fontSize: 34, fontWeight: '900', fill: 0xffcd37 }),
  });
  private readonly bossLabel = new Text({
    text: '',
    style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 15, fontWeight: '700', fill: 0xffe8cd }),
  });

  constructor() {
    this.root.addChild(this.bars, this.playerName, this.rightInfo, this.superReady, this.combo, this.bossLabel);
    this.playerName.position.set(35, 3);
    this.rightInfo.anchor.set(1, 0);
    this.rightInfo.position.set(1245, 20);
    this.superReady.position.set(35, 78);
    this.combo.anchor.set(1, 0);
    this.combo.position.set(1235, 90);
    this.bossLabel.anchor.set(0.5, 1);
    this.bossLabel.position.set(640, 45);
  }

  update(player: Player, enemies: Enemy[], moduleIndex: number, moduleId: string, waveIndex: number, waveTotal: number, moduleCount: number): void {
    const g = this.bars;
    g.clear();
    const healthRatio = player.health / Math.max(1, player.maxHealth);

    g.roundRect(30, 20, 390, 28, 6).fill(0x201b1c);
    g.roundRect(33, 23, Math.max(0, 384 * healthRatio), 22, 5).fill(0xbe2c2a);

    for (let index = 0; index < moduleCount; index += 1) {
      const color = index === moduleIndex ? 0xf5a523 : (index > moduleIndex ? 0x6e6964 : 0xbe4b2d);
      g.circle(1055 + index * 27, 62, 6).fill(color);
    }

    const live = enemies.filter((enemy) => !enemy.dead).length;
    const waveShown = Math.min(Math.max(1, waveTotal), Math.max(1, waveIndex + 1));
    this.rightInfo.text = `${moduleId}  ${moduleIndex + 1}/${moduleCount}   ONDATA ${waveShown}/${Math.max(1, waveTotal)}   NEMICI ${live}   PUNTI ${player.score}`;

    this.superReady.visible = !player.dead;
    this.combo.visible = player.comboDisplayTimer > 0 && player.comboCounter > 1;
    this.combo.text = `${player.comboCounter} HIT`;

    const boss = enemies.find((enemy) => enemy.isBoss && !enemy.dead);
    if (boss) {
      const ratio = boss.health / Math.max(1, boss.maxHealth);
      g.roundRect(430, 46, 420, 18, 5).fill(0x1c1618);
      g.roundRect(433, 49, Math.max(0, 414 * ratio), 12, 4).fill(0xac221e);
      this.bossLabel.visible = true;
      this.bossLabel.text = `${boss.displayName}  HP ${boss.health}/${boss.maxHealth}`;
    } else {
      this.bossLabel.visible = false;
    }
  }
}
