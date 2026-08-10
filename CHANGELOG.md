# Changelog

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
