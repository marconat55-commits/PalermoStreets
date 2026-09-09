# Stage 1 — audit fasce WALK (2026-09-09)

## Problema osservato

L'overlay sui quattro MAIN effettivamente caricati mostrava fasce troppo basse rispetto al suolo visibile: M01 concedeva 40 px di profondità e M02 105 px. M03 iniziava a Y=524 nonostante il campetto libero fosse già leggibile più indietro. Il risultato concentrava personaggi, nemici e oggetti verso il bordo inferiore, riducendo il movimento in profondità tipico dei belt-scroller Capcom.

## Correzione

Le fasce runtime sono riallineate ai limiti già autorizzati nella calibrazione V3:

- M01 strada: `635–705` (70 px, volutamente più stretta);
- M02 cortile/porticato: `515–705` (190 px);
- M03 campetto: `475–705` (230 px);
- M04 ingresso: `510–705` (195 px, invariata).

M01 resta sulla carreggiata e non abilita il marciapiede. M02–M04 recuperano il piano pavimentato necessario per aggiramenti, gruppi di nemici e futuri oggetti ambientali. Posizioni di ingresso, spawn e oggetti rimangono comprese nei nuovi limiti.

## Verifica riproducibile

`tools/audit-stage-walk-bands.py` compone il MAIN con trasformazioni identiche al runtime, sovrappone area dei piedi e sagome attore da 290 px e genera `build/stage_walk_audit/stage1_walk_contact_sheet.jpg`. Richiede Pillow 11.3 o successivo; l'output è diagnostico e non modifica alcun PNG del gioco.

I test bloccano regressioni a corsie troppo sottili: M01 deve conservare almeno 70 px; M02–M04 almeno 190 px. La validazione geometrica continua a controllare ingressi, spawn, world width, camera e limiti 0–720.

## Prossimo gate Stage 1

Il primo layer ambientale è ora attivo: ogni modulo dichiara uno stormo leggero e non interattivo, con area, densità, velocità e parallasse proprie. Gli uccelli sono disegnati proceduralmente e restano nel cielo; non richiedono PNG e non entrano nel sorting del combattimento.

Il prossimo incremento riguarda balconi e bordo posteriore del piano: persone, bambini e venditori richiedono asset approvati. Ogni gruppo dovrà dichiarare modulo, intervallo X, quota/pivot, profondità, clip, densità e politica di caricamento current+next. L'arte entrerà soltanto dopo una preview con le fasce WALK visibili.
