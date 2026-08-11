# Crowdfunding rebuild — baseline e gate

## Base tecnica

- Motore grafico: PixiJS 8.19 + TypeScript strict + Vite.
- Risoluzione logica: 1280×720.
- Coordinate attore: pivot centrale dei piedi in world-space.
- Ramo di lavoro: `crowdfunding-rebuild`, derivato da `main` al commit `61b26c4`.
- La cronologia precedente e la prova Godot restano archiviate in Git.

## Roster corrente

- Marco: protagonista; la reference ufficiale è `art_source/characters/marco/MARCO_MASTER_APPROVED.png`.
- Talebano: unico nemico temporaneo della baseline.
- Gli altri slot restano vuoti finché un nuovo personaggio non supera i gate grafici.

## Workflow obbligatorio personaggi

1. **Master** — approvare identità, abiti, proporzioni, direzione e guardia.
2. **Pose plan** — definire l’elenco dei clip e il numero di frame prima di generare immagini.
3. **Tavole numerate** — mostrare tutti i frame su checkerboard, senza normalizzazioni che nascondano scala o tagli.
4. **Scarto umano** — l’utente marca con una X rossa i frame bocciati; si rigenerano soltanto quelli.
5. **Preflight automatico** — canvas, alpha, margini, arti completi, bbox, piedi, scala, duplicati e raccordi iniziale/finale.
6. **Pilota runtime** — integrare un solo clip, registrare un test a 1280×720 e confrontarlo con Master e posa precedente/successiva.
7. **Pack completo** — estendere soltanto dopo approvazione del pilota.
8. **Gate finale** — contact sheet definitiva, test automatici, video runtime e approvazione esplicita prima del commit.

Un validatore automatico non equivale a un’approvazione visiva: entrambi sono obbligatori.

## Sfondi Stage 1

I cinque sfondi lunghi correnti sono concept 3840×1080 opachi. Sono utilizzabili soltanto come placeholder perché:

- non contengono veri layer alpha separati;
- il FAR viene mostrato tramite poligoni di rivelazione artificiali;
- prospettiva e fascia calpestabile non sono calibrate sulla scala canonica dei personaggi;
- il ritaglio del cielo può produrre discontinuità visibili.

Decisione: ricostruire gli sfondi dopo una greybox approvata. Non cancellare i placeholder prima che il fallback greybox mantenga avvio, combattimento e transizioni funzionanti.

Ogni nuovo modulo deve dichiarare:

- `world_width` e rapporto immagine non deformato;
- fascia o poligono WALK in coordinate world-space;
- linea dell’orizzonte e punto di fuga;
- riferimento di scala Marco a 290 px;
- layer `far`, `main` e `foreground` realmente separati;
- zone riservate al combattimento senza edifici, recinzioni o oggetti davanti ai piedi;
- entrata, uscita, trigger ondate e collisioni.

## Test finale corretto

### Automatici

- `npm run validate:data`
- `npm run validate:art`
- `npm run test`
- `npm run typecheck`
- `npm run build`

### Runtime tecnico

- avvio M01, movimento oltre x=1280 e ritorno a sinistra;
- dead-zone camera, world bounds, spawn, uscita e checkpoint;
- HUD screen-space e shake indipendente dalla camera;
- assenza di stretch degli sfondi;
- caricamento current + next senza freeze;
- una wave combattuta nella seconda metà del modulo.

### Runtime visivo

- confronto affiancato Master / idle / primo e ultimo frame di ogni clip;
- nessun cambio di altezza apparente di testa, torso o arti tra clip compatibili;
- piedi completi e baseline verificata frame per frame;
- nessun bordo grigio, alone cromatico, parte anatomica mancante o duplicata;
- raccordo leggibile tra idle, movimento, attacco, recupero, caduta e rialzata;
- overlay della fascia WALK per provare che nessun attore cammini su palazzi o cielo;
- catture fisse a inizio, centro e fine modulo con sagoma di calibrazione;
- approvazione umana delle tavole e del video prima di sostituire il pack precedente.

## Regola di rollback

Ogni fase produce un commit separato e uno ZIP. Nessuna nuova arte sostituisce asset approvati senza un confronto visivo e un checkpoint recuperabile.
