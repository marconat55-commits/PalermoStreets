# Palermo Streets - Production content catalog

Pipeline: `1.0.0`

| ID | Tipo | Stato | Manifest |
|---|---|---|---|
| narrative.campaign | campaign | storyboard | `content-src/narrative/campaign.content.json` |
| character.marco | character | integrated | `content-src/characters/marco.content.json` |
| character.talebano | character | integrated | `content-src/characters/talebano.content.json` |
| stage.stage1_zen | stage | pilot | `content-src/stages/stage1_zen/stage1_zen.content.json` |

## Contratti globali

- Viewport runtime: 1280x720
- Canvas personaggi: 640x420; baseline Y=400
- Scala personaggi runtime: 1.0
- Master stage: 3840x1080 -> runtime 2560x720
- Sorgenti portabili: JSON + PNG + BLEND/KRA; runtime PixiJS separato

## Greybox moduli

- Il greybox non sostituisce automaticamente lo sfondo runtime.
- Approvare prima scala, orizzonte, walk band e tre inquadrature camera.
- Solo dopo l’approvazione si produce FAR/MAIN/FOREGROUND finale.
