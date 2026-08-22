import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

export class Hud {
  readonly root = new Container();
  private readonly bars = new Graphics();
  private readonly playerName = new Text({
    text: 'MARCO',
    style: new TextStyle({ fontFamily: 'Bangers, Arial Black, Arial, sans-serif', fontSize: 22, fill: 0xfff0bd, stroke: { color: 0x341018, width: 3 }, letterSpacing: 2 }),
  });
  private readonly rightInfo = new Text({
    text: '',
    style: new TextStyle({ fontFamily: 'Bangers, Arial Black, Arial, sans-serif', fontSize: 16, fill: 0xfff3d2, letterSpacing: 1.2 }),
  });
  private readonly superReady = new Text({
    text: 'J+K — ATTACCO SPECIALE',
    style: new TextStyle({ fontFamily: 'Bangers, Arial Black, Arial, sans-serif', fontSize: 17, fill: 0xffd24a, stroke: { color: 0x461619, width: 2 }, letterSpacing: 1.4 }),
  });
  private readonly combo = new Text({
    text: '',
    style: new TextStyle({ fontFamily: 'Bangers, Arial Black, Arial, sans-serif', fontSize: 38, fill: 0xffd12f, stroke: { color: 0x68151c, width: 5 }, letterSpacing: 2 }),
  });
  private readonly bossLabel = new Text({
    text: '',
    style: new TextStyle({ fontFamily: 'Bangers, Arial Black, Arial, sans-serif', fontSize: 16, fill: 0xffefd0, stroke: { color: 0x23090e, width: 2 }, letterSpacing: 1.3 }),
  });

  constructor(playerDisplayName = 'MARCO') {
    this.playerName.text = playerDisplayName.toUpperCase();
    this.root.addChild(this.bars, this.playerName, this.rightInfo, this.superReady, this.combo, this.bossLabel);
    this.playerName.position.set(38, 4);
    this.rightInfo.anchor.set(1, 0);
    this.rightInfo.position.set(1238, 17);
    this.superReady.position.set(42, 77);
    this.combo.anchor.set(1, 0);
    this.combo.position.set(1235, 90);
    this.bossLabel.anchor.set(0.5, 1);
    this.bossLabel.position.set(640, 50);
  }

  update(player: Player, enemies: Enemy[], moduleIndex: number, moduleId: string, waveIndex: number, waveTotal: number, moduleCount: number): void {
    const g = this.bars;
    g.clear();
    const healthRatio = player.health / Math.max(1, player.maxHealth);

    g.moveTo(25, 18).lineTo(36, 7).lineTo(429, 7).lineTo(421, 54).lineTo(25, 54).closePath()
      .fill({ color: 0x110d15, alpha: 0.92 }).stroke({ color: 0xf0a92c, width: 2 });
    g.moveTo(32, 27).lineTo(39, 20).lineTo(416, 20).lineTo(412, 46).lineTo(32, 46).closePath().fill(0x25161b);
    const healthWidth = Math.max(0, 374 * healthRatio);
    if (healthWidth > 0) {
      g.rect(37, 24, healthWidth, 18).fill(0xb9272b);
      g.rect(37, 24, healthWidth, 5).fill({ color: 0xff6650, alpha: 0.72 });
    }

    g.moveTo(746, 8).lineTo(756, 0).lineTo(1250, 0).lineTo(1240, 40).lineTo(738, 40).closePath()
      .fill({ color: 0x090b14, alpha: 0.80 }).stroke({ color: 0x3cd2df, width: 1.5, alpha: 0.78 });
    g.moveTo(28, 70).lineTo(38, 62).lineTo(286, 62).lineTo(276, 100).lineTo(28, 100).closePath()
      .fill({ color: 0x170e14, alpha: 0.76 }).stroke({ color: 0xe94b34, width: 1.5, alpha: 0.82 });

    for (let index = 0; index < moduleCount; index += 1) {
      const color = index === moduleIndex ? 0xffc22f : (index > moduleIndex ? 0x625f68 : 0xd74a33);
      const x = 1055 + index * 27;
      g.circle(x, 62, index === moduleIndex ? 7 : 6).fill(color);
      if (index === moduleIndex) g.circle(x, 62, 10).stroke({ color: 0xffe590, width: 2, alpha: 0.75 });
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
      g.moveTo(425, 49).lineTo(433, 41).lineTo(855, 41).lineTo(847, 66).lineTo(425, 66).closePath()
        .fill({ color: 0x120b10, alpha: 0.92 }).stroke({ color: 0xe4ad45, width: 2 });
      if (ratio > 0) {
        g.rect(434, 48, Math.max(0, 405 * ratio), 11).fill(0xac221e);
        g.rect(434, 48, Math.max(0, 405 * ratio), 3).fill({ color: 0xff6b45, alpha: 0.78 });
      }
      this.bossLabel.visible = true;
      this.bossLabel.text = `${boss.displayName}  HP ${boss.health}/${boss.maxHealth}`;
    } else {
      this.bossLabel.visible = false;
    }
  }
}
