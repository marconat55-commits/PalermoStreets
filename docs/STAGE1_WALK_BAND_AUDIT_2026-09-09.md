# Stage 1 — audit fasce WALK (2026-09-09)

## Problema osservato

L'overlay sui quattro MAIN effettivamente caricati mostrava fasce troppo basse rispetto al suolo visibile: M01 concedeva 40 px di profondità e M02 105 px. M03 iniziava a Y=524 nonostante il campetto libero fosse già leggibile più indietro. Il risultato concentrava personaggi, nemici e oggetti verso il bordo inferiore, riducendo il movimento in profondità tipico dei belt-scroller Capcom.

## Correzione

Le fasce runtime sono riallineate ai limiti già autorizzati nella calibrazione V3:

- M01 strada/cortile: linea verde approvata `650 → 665`, con discesa prospettica graduale verso destra; limite anteriore `705` (40–55 px).
- M02 cortile/porticato: `515–705` (190 px);
- M03 campetto: `475–705` (230 px);
- M04 ingresso: `510–705` (195 px, invariata).

M01 segue la linea indicata durante il test in gioco e resta interamente sulla carreggiata visibile. Marciapiedi, aiuole e fondo del cortile rimangono fuori dalla zona percorribile. M02–M04 mantengono il piano pavimentato necessario per aggiramenti, gruppi di nemici e futuri oggetti ambientali.

## Verifica riproducibile

`tools/audit-stage-walk-bands.py` compone il MAIN con trasformazioni identiche al runtime, sovrappone area dei piedi e sagome attore da 290 px e genera `build/stage_walk_audit/stage1_walk_contact_sheet.jpg`. Richiede Pillow 11.3 o successivo; l'output è diagnostico e non modifica alcun PNG del gioco.

I test bloccano la calibrazione verde tracciata sul fondale: M01 conserva 40–55 px e una lieve pendenza prospettica; M02–M04 almeno 190 px. La validazione geometrica continua a controllare ingressi, spawn, world width, camera e limiti 0–720.

## Prossimo gate Stage 1

Gli stormi procedurali sono stati rimossi. M01 usa il venditore approvato e il primo alloggio architettonico completo `BALCONY_RESIDENT_01`, con personaggio fra MAIN e ringhiera FOREGROUND.

Il prossimo gate riguarda il test giocato dell'incontro M01 lungo tutta la nuova profondita, seguito dalla definizione degli ulteriori moduli stradali dello Stage ZEN.
