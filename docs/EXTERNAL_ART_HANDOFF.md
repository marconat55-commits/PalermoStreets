# Lavori grafici delegabili a ChatGPT non-Codex

Le altre chat producono **fogli sorgente ad alta risoluzione**. Codex esegue ritaglio, trasparenza, scala baked, baseline, separazione dei frame, nomi runtime, metadata, atlas, test e integrazione Git.

## Regole di consegna

- Allegare sempre il master approvato del personaggio e l'ultimo frame idle canonico.
- Chiedere una griglia regolare, un solo personaggio intero per cella, sfondo verde/ciano uniforme.
- Vietati piedi, testa o arti tagliati; vietati testi, scenari, ombre esterne ed effetti.
- Non ridimensionare, ritagliare o convertire il risultato prima di consegnarlo a Codex.
- Consegnare il PNG originale oppure il link della chat, indicando chiaramente il nome del pack.

## Pack 1 — Talebano walk V2

> Usa le immagini allegate come riferimento identitario assoluto. Crea un unico sprite sheet 4x3 con 12 pose consecutive di una camminata laterale completa verso destra del Talebano. Deve restare lo stesso uomo sovrappeso con pancia prominente, canotta bianca, pantaloni da tuta blu con bande bianche, sneakers bianche, occhiali scuri, catena e tatuaggi identici. Ciclo arcade fluido: contatto destro, compressione, passaggio, massimo avanzamento, contatto sinistro e ritorno, con pose intermedie realmente distinte. Mantieni identici dimensione apparente della testa, volume del busto, lunghezza delle gambe e zoom in tutte le celle. Personaggio sempre intero dalla testa alle suole, centrato in ogni cella, nessun taglio. Sfondo ciano uniforme puro, nessun testo, ombra, effetto o scenario. Stile illustrato realistico coerente con Palermo Streets; leggibilità da beat 'em up 2D.

## Pack 2 — Marco combat V2

Produrre due fogli separati, usando il master originale di Marco.

**Diretto finale, 8 pose:**

> Sprite sheet 4x2, otto pose consecutive. Marco parte dalla sua guardia laterale verso destra, carica ruotando busto e spalla, avanza con un potente pugno diretto orizzontale e torna nella stessa guardia. Il fotogramma di contatto deve mostrare il braccio completamente proiettato in avanti: non uppercut, non pugno verticale. Stesso volto, baffi, capelli, camicia bianca aperta, pantaloni bianchi, fascia rossa, scarpe e corporatura del master. Scala e testa identiche in tutte le celle. Corpo intero, sfondo ciano uniforme, nessun testo o effetto.

**Finale combo calci, 8 pose:**

> Sprite sheet 4x2, otto pose consecutive di un calcio finale arcade distinto dai normali calci frontali: caricamento laterale, rotazione leggibile, calcio lungo verso destra, recupero nella guardia iniziale. Movimento potente ma fisicamente raccordato, senza teletrasporti tra pose. Identità, abiti, testa, corporatura e zoom identici al master e al foglio del diretto. Corpo intero, sfondo ciano uniforme, nessun testo o effetto.

## Pack 3 — Marco presa e lancio V2

> Sprite sheet 4x3 con 12 pose consecutive di Marco che esegue una presa laterale arcade e un grande lancio a proiezione verso destra. Mostra acquisizione, aggancio, caricamento del peso, torsione, proiezione ampia e recupero nella guardia laterale; il nemico non deve essere disegnato, perché nel gioco è uno sprite separato. La gestualità deve far capire chiaramente dove sarebbe il corpo afferrato. Lancio comico, potente e leggibile da beat 'em up, senza copiare un personaggio esistente. Identità e scala perfettamente bloccate sul master di Marco. Corpo intero, sfondo ciano uniforme, nessun testo, effetto o scenario.

## Pizzetto

Prima di generare nuove immagini, consegnare a Codex il master e una lista delle pose che sembrano mancanti. Codex restituisce l'elenco esatto dei soli fogli necessari; questo evita di rigenerare clip già valide e protegge la dimensione del pizzetto tra le pose.

## Sfondi Stage 1

Le immagini già create devono essere associate a questi ruoli, senza rigenerarle:

1. `ZEN_LONG_01_STRADA_CORTILE`
2. `ZEN_FAR_SKYLINE`
3. `ZEN_LONG_02_PORTICATO_GARAGE`
4. `ZEN_LONG_03_CAMPETTO`
5. `ZEN_LONG_04_INGRESSO_PALAZZO`

Consegnare i cinque PNG originali o il link della chat e una tabella immagine → nome. Codex li integra nella futura camera scrollabile e decide solo dopo il prototipo se servono layer parallax aggiuntivi.
