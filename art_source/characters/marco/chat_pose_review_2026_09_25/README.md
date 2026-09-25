# Marco — pose recuperate il 25 settembre 2026

Sorgenti importate integralmente dalla chat condivisa https://chatgpt.com/share/6ab6304a-cad0-83ed-a99a-5fbc4f7bf2f0 e dalla conversazione originale “Verifica pose mancanti” (6ab51ebd-1970-83ed-8595-f67e56619ccc).

Il link condiviso parte dal riepilogo dei primi tre frame: questi sono stati recuperati scorrendo la conversazione originale. Le quattro prove intermedie di frame04 respinte per identità/anatomia non sono state importate.

## Provenienza e stato

| File | Evidenza nella conversazione |
|---|---|
| spin_01_source.png | Generata dopo “Procedi con immagini singole se no sbagli”; seguita da “Ok. Avanti un'altra” |
| spin_02_source.png | Generata dopo “Ok. Avanti un'altra”; seguita da “Ok procedi...” |
| spin_03_source.png | Calcio esteso, seguito da “Ok”; riepilogo lo identifica come impatto |
| spin_04_approved_source.png | Ultima correzione dopo critica a gambe/piedi, seguita da “Ok. Approvata.”; asset 00000000-7720-81f4-9f54-524be59d078a |
| spin_05_candidate.png | Prima immagine del messaggio successivo all'approvazione; asset 00000000-1560-81f4-bbfc-16d2b561d721 |
| spin_06_candidate.png | Seconda immagine dello stesso messaggio; asset 00000000-1c28-81f5-8581-6b82ee2270f4 |

05 e 06 sono candidate, non approvazioni dedotte dal messaggio precedente. Numerazione 04–06 ricostruita dalle funzioni previste e dalla cronologia, non da nomi originali forniti dal generatore. Hash delle copie in manifest.json.

## Integrazione e doppio audit

Integrate nella raccolta sorgenti e nel catalogo master. NON collegate ai profili/atlas runtime. I due agenti hanno confrontato tutte le pose con il master Marco: identità coerente, ma NO alla sequenza attuale in produzione.

- 02→03→04 alterna schiena, petto e schiena mentre il calcio rimane verso destra: la direzione di rotazione non è leggibile.
- 04→05 cambia piede d'appoggio senza un trasferimento di peso convincente.
- 05→06 richiede raccordo con la guardia reale; 03 mostra una diversa scala anatomica sorgente.
- I file sono RGB su verde, non PNG runtime RGBA 640×420 con pivot dei piedi.

Il rapporto esteso è in docs/reviews/MARCO_SPIN_CHAT_AGENT_AUDIT.md. La seconda revisione indipendente conferma le criticità sopra, senza modificare le immagini. Non nascondere i difetti con dissolvenze o zoom.

Aprire index.html per confronto e playback delle sorgenti. È una preview di revisione, non una prova dell'animazione finale: fondo e dimensioni originali sono conservati. Prima del runtime occorre correggere i raccordi, preparare derivati trasparenti con scala anatomica/pivot coerenti, verificare la clip normalizzata, aggiornare atlas/metadata e provare il gameplay.
