# Marco — audit indipendente sorgenti spin, 25/09/2026

## Ambito e verdetto

Ispezione visiva delle sei PNG in `art_source/characters/marco/chat_pose_review_2026_09_25/`, confrontate con `art_source/characters/marco/MARCO_MASTER_APPROVED.png`. Nessun asset modificato durante l'audit.

**Sì all'integrazione come sorgenti di Marco e alla preview di revisione. No alla sostituzione immediata di un'animazione runtime.** Le immagini hanno buona coerenza di identità, ma la continuità della rotazione e del piede perno non è ancora dimostrata. Una posa approvata artisticamente non è automaticamente un ciclo approvato.

La provenienza verificata dall'agente principale attribuisce alle pose 01–03 approvazioni nella conversazione, alla 04 l'esplicito «Approvata», mentre 05–06 sono nell'ultimo messaggio senza successiva approvazione esplicita. Questo audit distingue tale stato dalla valutazione tecnica.

## Valutazione delle pose

| Sorgente | Funzione leggibile | Osservazioni |
| --- | --- | --- |
| `spin_01_source.png` | Preparazione in torsione, gambe incrociate | Identità coerente; vista di schiena. Deve essere raccordata alla guardia iniziale. |
| `spin_02_source.png` | Caricamento con ginocchio alto | Silhouette distinta da 01; vista ancora di schiena. Appoggio concentrato su un piede. |
| `spin_03_source.png` | Calcio esteso verso destra, possibile contatto | Torace frontale anziché schiena. Anche il braccio si estende. La figura occupa quasi tutta la larghezza sorgente; riservare margine nel canvas finale senza ridurre arbitrariamente il corpo solo in questa posa. |
| `spin_04_approved_source.png` | Continuazione del calcio/rotazione con suola visibile | Torna la vista di schiena; gamba ancora sollevata. Posa individuale utilizzabile come riferimento. |
| `spin_05_candidate.png` | Rientro dalla torsione | Gamba abbassata e guardia ricomposta di schiena; candidata, non approvata. |
| `spin_06_candidate.png` | Guardia finale frontale 3/4 | Entrambi i piedi a terra; candidata recovery. Verificare raccordo con l'idle runtime esistente. |

## Identità, anatomia e massa

Le sei immagini conservano capelli ricci, baffi, orecchino, camicia e pantaloni avorio, fascia rossa, bracciali e scarpe marroni del master Marco. Non sono pose di Merco o Pino. Non si vedono arti aggiuntivi o amputazioni evidenti. 01 e 05 condividono impostazione e orientamento, ma hanno gambe diverse: non sono duplicati visivi identici.

La 03 appare disegnata a una scala sorgente più piccola per contenere il calcio largo: testa e tronco vanno confrontati dopo normalizzazione anatomica, non impostando automaticamente la stessa altezza dell'intera silhouette per ogni posa. I cambi di area occupata durante un calcio sono naturali e non autorizzano zoom per-frame. La fascia e la camicia svolazzano in modo plausibile nelle singole immagini; la loro inerzia va controllata in playback.

## Rischi della sequenza 01 → 06

- 01 → 02: caricamento leggibile, ma il piede d'appoggio cambia posizione nel canvas sorgente. Il pivot finale deve seguire il piede, non il centro del rettangolo immagine.
- 02 → 03: passaggio netto dalla schiena al torace frontale. È il primo raccordo critico: verificare che gamba di calcio, bacino e direzione di rotazione rimangano gli stessi.
- 03 → 04: nuovo passaggio frontale → schiena con forte cambio di appoggio visivo. Può rappresentare la prosecuzione rapida di una rotazione, ma non basta ordinare i file per dimostrarlo. Verificare che non sembri un'inversione del movimento o uno scambio di gambe.
- 04 → 05: fase di rientro plausibile; il peso deve passare al piede corretto senza scivolamento.
- 05 → 06: ulteriore cambio schiena → fronte. Con tempi troppo lunghi sembrerà una successione di pose; con tempi troppo brevi potrebbe nascondere un raccordo mancante. Il timing non deve coprire un errore anatomico.

Non prescrivo automaticamente ulteriori frame: prima serve una preview con pivot coerente e tempi distinti di caricamento, contatto e recupero. Sei pose possono bastare se le traiettorie funzionano.

## Requisiti prima del runtime

Le sorgenti sono immagini verticali con fondo verde, non sprite pronti. Le tre ultime immagini verificate tecnicamente sono RGB opache 1024×1536. Applicare a tutte il gate di trasparenza e canvas senza considerare il fondo verde come alpha.

1. Conservare le sorgenti intatte e creare derivati separati RGBA trasparenti 640×420, baseline Y400.
2. Controllare bordi, frange rosse, capelli, scarpe e residui verdi su fondo scuro e chiaro.
3. Normalizzare massa e anatomia con trasformazioni uniformi; nessuna deformazione X/Y né scale runtime per-frame.
4. Verificare traiettoria di bacino, piede perno e gamba attaccante, anche rallentando la preview.
5. Verificare entrata dall'idle e uscita verso l'idle reali di Marco; definire durata e frame di contatto solo dopo tale confronto.
6. Il profilo Marco non ha attualmente un clip `spin`. `kick_finisher` usa 6 frame e contatto 4; `super` usa 5 frame e contatto 3. Non riutilizzare questi indici per deduzione dal nome dei file.
7. Generare metadata piedi e atlas; eseguire `npm run check`. Se cambia il gameplay, provare una wave con Marco e Talebano più il nuovo attacco.

**Stato conclusivo: sorgenti accettabili per revisione; continuità animata non certificata; produzione runtime non autorizzata dall'esito di questo audit.**
