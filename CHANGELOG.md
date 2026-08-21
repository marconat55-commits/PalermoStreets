# Changelog

## Production Pipeline v1

- Added real initial-stage preload progress, safe foreground walk bands for M01/M02, explicit J/K grab controls with automatic release, and deterministic visual-review sheets for Marco/Talebano without generating new art.
- Integrated the approved M02 v1 FAR/MAIN layers at the authored 2560x720 runtime scale; adjusted only M02 camera, exit, wave triggers and spawn X coordinates to the new world width.
- Built a non-destructive M02 final-layer candidate from the existing 3840x1080 sources; replaced the rejected curved sky cut with a soft, color-matched window that does not touch architecture.
- Added master/runtime FAR, MAIN and disabled transparent FOREGROUND artifacts, three real-character camera proofs and checksum validation without integrating them into the game.
- Captured the original shared storyboard as a non-destructive campaign manifest, separating reusable direction from later canon decisions.
- Marked the M02 geometry, character scale, horizon, walk band and three camera proofs as approved; added the final FAR/MAIN/FOREGROUND delivery contract.
- Added a versioned content catalog and separate manifests for characters, stages and the M02 pilot.
- Added reusable templates for main players, enemies, stages, objects and ambient actors.
- Added deterministic scaffold/build/check commands; the full project check now rejects invalid or stale production content.
- Added an exact 3840x1080 M02 greybox, walk mask and camera proofs at X=0/640/1280 without changing runtime art or gameplay.
- Added regression tests and a documented definition of done for portable, repeatable content production.

## Core runtime scale / Talebano continuity pass

- Locked every active character clip to uniform runtime scale `1.0`; removed Marco's pose-specific zoom from walk, run, brake, grab, grab strike and throw.
- Reduced Animator cross-fades to a maximum of 12 ms between authored frames and 16 ms between states; removed profile-driven locomotion blends that produced double silhouettes.
- Reordered Talebano's six existing side-walk poses for lower frame-to-frame discontinuity and retimed his light-hit reaction into a fast impact followed by a readable recovery.
- Added regression tests for global runtime scale, profile ghosting and the Talebano motion sequence.

Tutte le modifiche stabili di Palermo Streets vengono annotate qui.

## Unreleased - 2026-08-09

- Portata la combo arcade di Marco a quattro colpi: due pugni, calcio frontale e diretto finale con knockdown.
- Assegnata a ogni modulo Zen una fascia WALK specifica, con entry e spawn vincolati alla strada o al cortile visibile.
- Reso visibile il parallax FAR a `0.22` tramite aperture sagomate sulle zone di cielo, senza rigenerare o modificare i PNG originali.
- Aggiunti test per ordine della combo, fasce WALK, spawn e aperture dei layer; suite completa a 37 test.
- Ripristinata per Marco la guardia idle laterale verso destra approvata, eliminando gli 8 frame frontali incompatibili.
- Aggiunto un gate globale sulla massa apparente tra idle, camminata, corsa e prese.
- La selezione personaggio mostra ora Forza, Velocità e Tecnica.
- Aumentati gittata, parabola, hit-stop e impatto del lancio per una resa arcade più comica.
- Aggiunti il contratto `enemy_standard_v2` e i brief per delegare fogli sorgente a chat grafiche esterne.
- Rigenerati senza perdita metadata e atlas di Marco.

## 0.1.0 - 2026-08-07

- Baseline funzionante della migrazione PixiJS/TypeScript dalla versione pygame-ce 0.7.8.
- Validazione dati, typecheck e build completati.
- Aggiunti avvio e controllo semplificati per Windows.
- Nessuna modifica ad asset PNG, gameplay, scala o timing.
## 2026-08-20

- Recalibrated M01 to a 110% bottom-anchored display scale, restricted WALK to the carriageway at Y 665–705, and enlarged every world/held object by 50% without changing gameplay ranges.
- Integrated the approved M01 FAR/MAIN/FOREGROUND package at native 2560×720 runtime scale, preserving its authored WALK 635–705 band and two-viewport camera contract.
