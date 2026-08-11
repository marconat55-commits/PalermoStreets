# Palermo Streets - Production Pipeline v1

## Obiettivo

Questa pipeline separa la produzione dei contenuti dal runtime PixiJS. Il gioco continua a partire con `npm run dev`, mentre personaggi, stage, oggetti e attori ambientali hanno manifest versionati, contratti misurabili e output riproducibili.

Non sostituisce gli asset approvati e non genera immagini. Prima blocca scala, geometria, naming e test; l'arte finale entra solo dopo l'approvazione del greybox.

## Sorgenti e responsabilita

- `content-src/catalog.json`: registro unico dei contenuti approvati o in lavorazione.
- `content-src/characters/`: identita, archetipi e contratti dei personaggi.
- `content-src/stages/`: geometria, camere, walk band e layer degli stage.
- `content-src/templates/`: basi per protagonisti, nemici, stage, oggetti e attori ambientali.
- `public/data/`: profili consumati dal runtime PixiJS.
- `public/assets/`: soli asset runtime approvati.
- `production-preview/`: output tecnici deterministici da controllare e versionare.

Le immagini generative servono solo come concept o identity reference. Le sorgenti definitive scalabili devono essere BLEND o KRA; l'export runtime resta PNG/JSON/WAV/OGG.

## Comandi

```bash
npm run content:check
npm run content:build
npm run content:scaffold -- player secondo_eroe "SECONDO EROE"
npm run content:scaffold -- enemy nuovo_nemico "NUOVO NEMICO"
npm run content:scaffold -- stage stage2_centro "STAGE 2 - CENTRO"
npm run content:scaffold -- object bottiglia "BOTTIGLIA"
npm run content:scaffold -- ambient signora_balcone "SIGNORA AL BALCONE"
```

`content:scaffold` crea soltanto una bozza non registrata. Non modifica il catalogo e non rende il contenuto attivo nel gioco.

`content:build` rigenera catalogo tecnico, registry e prove M02. `content:check` fallisce se manifest, proporzioni o output generati non sono coerenti. Il comando completo `npm run check` include questo gate.

## Flusso obbligatorio per un personaggio

1. Creare la bozza dal template dell'archetipo.
2. Approvare una sola identity master.
3. Produrre rig e pose in Blender o Krita mantenendo canvas 640x420, baseline Y=400 e scala runtime 1.0.
4. Esportare una clip alla volta.
5. Generare metadata e atlas con gli script esistenti.
6. Superare integrita arti, alpha, baseline, massa apparente, continuita e test runtime.
7. Registrare nel catalogo solo dopo approvazione.

Le animazioni comuni devono appartenere all'archetipo; le mosse uniche restano nel manifest del personaggio. In questo modo cinquanta personaggi non richiedono cinquanta pipeline diverse.

## Flusso obbligatorio per uno stage

1. Greybox esatto a 3840x1080, viewport 1280x720 e runtime 2560x720.
2. Approvare orizzonte, scala personaggi, walk band e camere X=0/640/1280.
3. Produrre FAR, MAIN alpha e FOREGROUND alpha separati.
4. Verificare che architettura e oggetti bloccanti non entrino nella walk band.
5. Integrare un solo modulo pilota.
6. Solo dopo il test runtime estendere il metodo agli altri moduli.

Il pilot M02 e descritto da `content-src/stages/stage1_zen/modules/M02.module.json`. Gli SVG in `production-preview/M02/` sono prove geometriche, non fondali finali e non sono ancora collegati al runtime.

## Definition of done

Un contenuto e completato soltanto quando:

- possiede sorgente modificabile e licenza nota;
- ha manifest versionato e naming stabile;
- supera i contratti automatici;
- e stato controllato nelle inquadrature runtime previste;
- non richiede scale correttive nel codice;
- puo essere ricostruito senza dipendere dalla cronologia di una chat;
- e registrato nel catalogo e passa `npm run check`.

## Portabilita

Il catalogo, i manifest, gli asset e le sorgenti artistiche sono indipendenti dall'engine. Combat, AI e scene restano codice PixiJS/TypeScript e non sono automaticamente trasferibili a un altro motore; questa separazione evita pero di perdere il lavoro sui contenuti.
