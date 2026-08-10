# Palermo Streets - Godot migration baseline

Baseline tecnica separata dal port PixiJS. Non importa Pizzetto.

## Avvio

Aprire `project.godot` con Godot 4.7.1 oppure eseguire Godot con `--path` su questa cartella.

- Frecce: movimento.
- Tasti 1-4: cambio modulo greybox.
- Verde: fascia WALK del modulo.
- Sagoma bianca: altezza canonica Marco 290 px, pivot ai piedi.

## Master approvata

La posa ufficiale approvata si trova in `assets/characters/marco/source/MARCO_MASTER_APPROVED.png`. Ogni futura posa deve mantenere identita, abbigliamento e proporzioni di questa reference.

## Stato

- Viewport 1280x720.
- Quattro moduli da 2560x720.
- Camera orizzontale smussata.
- FAR a parallax 0.22.
- WALK specifica per modulo.
- Pizzetto escluso.
- Master di Marco approvata; non ancora usata come sprite runtime.
