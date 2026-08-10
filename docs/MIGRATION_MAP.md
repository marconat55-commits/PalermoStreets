# Migration map — pygame-ce v0.7.8 → PixiJS v8

| Vecchio modulo | Nuovo modulo | Stato |
|---|---|---|
| `palermo_streets/game.py` | `src/game/Game.ts` | migrato |
| `states/title.py` | `src/game/scenes/TitleScene.ts` | migrato |
| nuova selezione roster | `src/game/scenes/CharacterSelectScene.ts` | attiva: Marco + 3 slot vuoti |
| `states/stage.py` | `src/game/scenes/StageScene.ts` | migrato baseline |
| `systems/animation.py` | `src/game/animation/Animator.ts` | migrato + blend pose, timing e scala per-frame |
| `entities/actor.py` | `src/game/entities/Actor.ts` | migrato |
| `entities/player.py` | `src/game/entities/Player.ts` | migrato + combat pack Marco (corsa, salto, difesa, presa) |
| `entities/enemy.py` | `src/game/entities/Enemy.ts` | migrato |
| `systems/combat.py` | `src/game/combat/combat.ts` | migrato |
| `systems/effects.py` | `src/game/effects/EffectsLayer.ts` | migrato baseline |
| character profiles JSON | `public/data/characters/*.json` | riutilizzati |
| `stage1_zen.json` | `public/data/stage1_zen.json` | riutilizzato |
| PNG runtime | `public/assets/...` | riutilizzati |
| pygame `Surface` rendering | PixiJS `Sprite/Container/Graphics/Text` | sostituito |
| pygame main loop | `Application.ticker` | sostituito |
| PyInstaller | Vite web build | sostituito |

## Differenze intenzionali

- I limiti orizzontali usano il bounding box visivo della posa corrente: anche salti e cadute restano interamente dentro il viewport.
- `knockdown`, `getup` e `dead` usano scala runtime fissa `1.0`: eventuali correzioni di proporzione devono essere risolte nell'asset e non con uno zoom durante la posa.
- La corsa usa un gesto vettoriale: il doppio impulso funziona in orizzontale, verticale e diagonale normalizzata.
- Non usiamo `AnimatedSprite`: le animazioni hanno durate diverse frame-per-frame e metadata di pivot, quindi un `Animator` custom aggiorna una singola `Sprite`.
- I metadata `frame_meta.json` conservano bounding box alpha e offset piedi già calcolati: non facciamo scansioni pixel a ogni caricamento nel browser.
- Gli outline scuri sono quattro copie tintate dello sprite, evitando una dipendenza filter aggiuntiva nella prima migrazione.
- Il browser non può essere "chiuso" con ESC: ESC torna al titolo; il browser gestisce anche l'uscita dal fullscreen.
- Il custom `Animator` resta preferibile a `AnimatedSprite`/Spine: conserva timing per-frame, pivot piedi, hit-frame e PNG dipinti senza introdurre rig scheletrici.

## Prossime fasi consigliate

1. Camera/world bounds per moduli orizzontali estesi, secondo `docs/COMBAT_WORLD_FOUNDATION.md`.
2. Sistema oggetti/armi (`WorldObject`, `Pickup`, `Breakable`, `WeaponInstance`, `Projectile`).
3. Boss system separato dall'AI standard.
4. Audio system.
5. Packaging desktop con Tauri o Electron solo quando la versione web è stabile.
