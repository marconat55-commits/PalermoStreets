# Barbaccia — riferimento HD scelto dall'utente

Il riferimento per le prossime prove è esattamente `BARBACCIA_HD_USER_MASTER.png`, fornito dall'utente il 24 settembre 2026 (clipboard 72850a08-6e01-424f-a58e-17268d2187a1). Copia integra, senza elaborazione.

Posa: passo verso destra, mani aperte, barba lunga, canottiera bianca, pantaloncini scuri, gioielli e sandali; monitor sulla caviglia della gamba arretrata. Conservare qualità illustrata dettagliata, volto, corporatura, abiti e proporzioni.

Questa scelta sostituisce la direzione arcade semplificata per le nuove prove di Barbaccia. I vecchi esperimenti restano archiviati e non costituiscono approvazione delle animazioni. Il file è un riferimento artistico, non un frame runtime pronto né un ciclo completo approvato.

## Walk pilot HD v1

`BARBACCIA_HD_WALK_CONTACT_SHEET_SOURCE.png` e `BARBACCIA_HD_OPPOSITE_CONTACT_SOURCE.png` sono nuove sorgenti generate dal master HD per provare un ciclo di quattro fasi. `scripts/prepare-barbaccia-hd-walk.py` prepara i quattro PNG in `walk_frames_v1/` su tela trasparente 640×420, piedi a Y=400, altezza visibile comune 316 px. Il master originale fornisce il primo contatto; le altre pose danno passaggio, contatto con l'altra gamba avanti e ritorno. Il rapporto di area visibile con Merco è registrato in `walk_manifest_v1.json`.

Prova locale: `?barbacciaHdWalkPilot` su M01. Spazio pausa/riprende, frecce cambiano posa, `F` specchia il personaggio, `S` rallenta, `M` fa avanzare il personaggio. Stato: **art_review_only**. Il pilot non registra Barbaccia nelle ondate e non sostituisce il master approvato. I passaggi generati mostrano un cambio di postura delle mani rispetto al master e vanno valutati in movimento prima del pacchetto completo di attacchi e reazioni.
