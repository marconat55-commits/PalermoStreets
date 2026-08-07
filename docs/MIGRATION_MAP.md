# Migration map — pygame-ce v0.7.8 → PixiJS v8

| Vecchio modulo | Nuovo modulo | Stato |
|---|---|---|
| `palermo_streets/game.py` | `src/game/Game.ts` | migrato |
| `states/title.py` | `src/game/scenes/TitleScene.ts` | migrato |
| `states/stage.py` | `src/game/scenes/StageScene.ts` | migrato baseline |
| `systems/animation.py` | `src/game/animation/Animator.ts` | migrato |
| `entities/actor.py` | `src/game/entities/Actor.ts` | migrato |
| `entities/player.py` | `src/game/entities/Player.ts` | migrato per comandi attivi |
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

- Non usiamo `AnimatedSprite`: le animazioni hanno durate diverse frame-per-frame e metadata di pivot, quindi un `Animator` custom aggiorna una singola `Sprite`.
- I metadata `frame_meta.json` conservano bounding box alpha e offset piedi già calcolati: non facciamo scansioni pixel a ogni caricamento nel browser.
- Gli outline scuri sono quattro copie tintate dello sprite, evitando una dipendenza filter aggiuntiva nella prima migrazione.
- Il browser non può essere "chiuso" con ESC: ESC torna al titolo; il browser gestisce anche l'uscita dal fullscreen.
- Barbetta resta un placeholder e non è stato artisticamente modificato.

## Prossime fasi consigliate

1. Test di parità visiva e gameplay contro un video della v0.7.8.
2. Aggiunta jump su K e nuove combo come sistemi TypeScript, senza più intervenire sul port Python.
3. Sistema oggetti/armi (`WorldObject`, `Pickup`, `Breakable`).
4. Boss system separato dall'AI standard.
5. Audio system.
6. AssetPack/spritesheet per ridurre richieste HTTP quando il roster cresce.
7. Packaging desktop con Tauri o Electron solo quando la versione web è stabile.
