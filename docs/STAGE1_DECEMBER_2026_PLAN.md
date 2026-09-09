# Stage 1: piano di completamento entro dicembre 2026

Data di riferimento: 9 settembre 2026.

## Obiettivo verificabile

Entro dicembre 2026 lo Stage 1 deve essere giocabile dall'ingresso al completamento con quattro moduli coerenti, combattimento leggibile, ambientazione viva, audio, transizioni e prestazioni stabili. Ogni elemento visivo deve rispettare scala dei personaggi, piano dei piedi, occlusioni e parallasse.

## Settembre: fondamenta dello stage

- Bloccare geometria, profondita e fasce WALK di M01-M04 mediante overlay ripetibili.
- Portare nel runtime un sistema ambientale dichiarativo e leggero.
- Validare M03 e M04 con layer artistici definitivi o con un elenco chiuso degli asset mancanti.
- Eliminare le collisioni visive tra piedi, architettura e primo piano.

Gate: il giocatore e i nemici possono usare l'intera profondita utile senza entrare nei muri; camera e parallasse restano stabili in ogni modulo.

## Ottobre: vita di Palermo

- Realizzare set modulari per persone ai balconi, bambini che giocano, venditori ambulanti e passanti.
- Aggiungere cicli brevi con pause e variazioni, evitando che tutti gli attori si muovano insieme.
- Integrare gli attori non interattivi nel livello di profondita corretto; riservare collisioni e reazioni agli elementi che influenzano il gioco.
- Completare props, foreground e passaggi visivi tra M01-M04.

Gate: ogni schermata contiene almeno un evento ambientale leggibile e nessun attore distrae dai segnali di combattimento.

## Novembre: incontro completo

- Chiudere composizione e ritmo delle ondate, ingressi dei nemici e arena finale.
- Integrare personaggi e mosse approvati senza sostituire identita o animazioni con materiale provvisorio.
- Aggiungere paesaggio sonoro, feedback dei colpi, distruttibili e ricompense.
- Eseguire un pass prestazioni su atlas, memoria, draw call e tempi di caricamento.

Gate: una partita completa non richiede strumenti di debug e non presenta blocchi, soft-lock o cali persistenti di fluidita.

## Dicembre: chiusura e build candidata

- Congelare contenuti e bilanciamento all'inizio del mese.
- Eseguire QA completo su tastiera e gamepad, risoluzioni supportate e nuova installazione.
- Correggere solo difetti che impediscono completamento, leggibilita o stabilita.
- Pubblicare una build candidata riproducibile, accompagnata da tag Git e archivio di recupero.

Gate finale: lo Stage 1 e completabile, presentabile e reinstallabile su una seconda postazione partendo esclusivamente dai dati online.

## Stato al 9 settembre

- M01-M04: fasce WALK sottoposte ad audit visivo e corrette.
- M01-M04: primo attore ambientale procedurale, stormi di uccelli, integrato e configurato per modulo.
- M01: signora al balcone e venditore di frutta integrati come cicli sprite non interattivi, precaricati con il modulo.
- Sistema di audit: overlay dei layer reali, poligono WALK e sagome in scala disponibile in `tools/audit-stage-walk-bands.py`.
- Prossimo incremento: prova visiva completa di M01 e, dopo il gate, riuso del contratto `sprite_loop` per bambini che giocano nel campetto M03.
