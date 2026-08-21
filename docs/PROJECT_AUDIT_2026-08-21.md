# Palermo Streets — audit progetto e scalabilità

Data: 2026-08-21  
Ambito: repository PixiJS `PalermoStreets`, analisi in sola lettura degli asset; nessun PNG eliminato o modificato.

## Verdetto sintetico

Il runtime attuale è una base valida: PixiJS 8, scene e moduli data-driven, atlas, metadata dei frame, animatore con durate per frame, camera e preload del modulo successivo. Non conviene cambiare motore.

Il principale limite di scalabilità non è PixiJS, ma la pipeline degli asset:

1. sorgenti, candidati, frame runtime e atlas sono spesso duplicati nel repository;
2. cache e texture non vengono scaricate quando si cambia stage/personaggio;
3. profili e metadata sono ancora troppo centralizzati per 50 personaggi e decine di stage;
4. la generazione AI frame-per-frame non garantisce identità, anatomia e scala costanti;
5. alcuni parametri visivi, come scala degli oggetti e hitbox, non derivano ancora da un unico manifest canonico.

## Modifica oggetti applicata

Senza modificare i PNG:

- tubo: `+25%` rispetto alla scala corrente;
- bastone: `+25%`;
- sacco nero: `+50%`;
- bidone: `+50%`.

La modifica è data-driven tramite `visual_scale_multiplier` in `public/data/items/stage1_zen.json`.

Nota: per ora aumenta solo la rappresentazione visiva. In un passaggio successivo pickup radius, hitbox e ombra devono diventare configurabili per oggetto, altrimenti un bidone grande continua ad avere l'area interattiva generica.

## Inventario e spazio

Ordini di grandezza rilevati:

| Percorso | Dimensione indicativa | Stato |
|---|---:|---|
| `.git/` | 566 MB | cronologia; non cancellare manualmente |
| `node_modules/` | 282 MB | rigenerabile con `npm install` |
| `art_source/` | 236 MB | sorgenti e approvati; conservare selettivamente |
| `character_factory/` | 155 MB | non tracciata; contiene lavoro intermedio |
| `dist/` | 154 MB | build rigenerabile |
| `public/` | 151 MB | runtime attuale |
| `production-preview/` | 11 MB | preview distribuzione |
| `godot/` | 1 MB | esperimento abbandonato, non tracciato |

La cartella `.git` è grande perché conserva versioni storiche di molti binari. Per i prossimi master pesanti è consigliato Git LFS oppure uno storage di release; la migrazione della cronologia esistente va eseguita solo come operazione separata e approvata.

## Candidati eliminabili subito

Questi percorsi sono rigenerabili o appartengono a esperimenti abbandonati. La cancellazione è facoltativa e serve solo a recuperare spazio:

- `dist/` — ricreato da `npm run build`;
- `node_modules/` — ricreato da `npm install`;
- `godot/` — prototipo Godot non tracciato e non usato dal gioco PixiJS;
- `build/blender_pipeline_pilot/` — pilot Blender abbandonato;
- contenuti delle directory `character_factory/**/raw_cells/`;
- contenuti delle directory `character_factory/**/key_removed/`.

Non cancellare l'intera `character_factory/`: contiene master, fogli sorgente, preview e QA che possono ancora servire.

## Barbetta e Pizzetto

Barbetta non è caricato dal runtime e il canone lo vieta già. Rimane solo questo master storico:

- `art_source/stage1_zen/characters_master/original/U_BARBETTA_EA11_MASTER.png`

Per eliminarlo definitivamente occorre anche rimuovere la voce `barbetta` da:

- `art_source/stage1_zen/characters_master/master_manifest.json`

Va invece mantenuta la regola di esclusione in `content-src/narrative/campaign.content.json` e il relativo test: impedisce che il personaggio rientri accidentalmente nel roster.

Pizzetto è già escluso dal canone, ma il manifest lo definisce ancora `archetype_candidate`: è una contraddizione. Se la decisione definitiva è eliminarlo, i percorsi sono:

- `art_source/stage1_zen/characters_master/original/PINO_U_PIZZETTU_MASTER.png`;
- `art_source/stage1_zen/characters_master/transparent/PINO_U_PIZZETTU_MASTER.png`;
- voce `pizzetto` in `art_source/stage1_zen/characters_master/master_manifest.json`;
- `character_factory/incoming/piero_u_pizzetto_quality_v2/`.

Anche in questo caso la regola di esclusione narrativa va conservata.

## Non eliminare ancora

- `public/assets/characters/*/atlas/`: usati dal catalogo runtime;
- `public/assets/characters/marco_anim/idle_legacy/` e `merco_anim/idle_legacy/`: sembrano vecchi, ma sono ancora presenti in metadata/atlas e Marco li dichiara nel profilo;
- `art_source/characters/*/approved/`: sorgenti approvate;
- `art_source/stage1_zen/final_v1/`: contiene master e copie da cui deriva il runtime;
- `legacy-reference/`: piccola e utile come riferimento tecnico/visivo;
- `.git/`: mai cancellarla manualmente.

Le cartelle `archive/` e `candidates/` sotto `art_source/characters/` possono essere spostate in un archivio esterno dopo una revisione visuale, ma non vanno cancellate in massa: alcune contengono riferimenti d'identità e keyframe approvati.

## Duplicazioni strutturali

Sono presenti copie byte-per-byte tra master/runtime in `art_source` e asset sotto `public`, oltre a frame Merco candidati duplicati negli approvati. Inoltre il deploy contiene sia PNG singoli sia pagine atlas.

Pipeline target:

```text
art_source (master + approved)
  -> build asset deterministico
  -> public/generated (atlas + manifest + metadata)
  -> dist
```

Nel runtime dovrebbero essere distribuiti solo atlas e manifest. I PNG singoli devono restare sorgenti/QA, non duplicati nel pacchetto finale. Il fallback ai frame sciolti può restare disponibile solo in modalità sviluppo.

## Architettura consigliata per 50 personaggi

### Priorità P0 — prima di aggiungere contenuti in massa

1. Un manifest per personaggio: profilo, clip, atlas, scala canonica, pivot, hurtbox e versione.
2. Metadata suddivisi per personaggio, caricati insieme al profilo; evitare un unico file globale.
3. Un registry stage/campagna: ogni stage carica dinamicamente il proprio JSON, non una funzione `loadStage1` dedicata.
4. Bundle per `stage/module`, `character` e `enemy_archetype`; preload solo corrente + successivo e unload esplicito di ciò che non serve più.
5. Un solo valore di scala canonica per personaggio. Niente correzioni runtime per singolo frame, salvo effetti dichiarati.
6. Oggetti descritti interamente nel manifest: scala, pivot, pickup radius, hitbox, ombra, animazione e comportamento.

### Priorità P1 — automazione QA

- validatore anatomico/tecnico: alpha, piedi integri, baseline, altezza testa, area visibile, pivot e contorni;
- contact sheet automatica master-vs-clip;
- test di continuità primo/ultimo frame e variazione massima di scala;
- preview GIF/WebM generata prima dell'integrazione;
- stato obbligatorio `candidate -> approved -> runtime`;
- hash degli asset per impedire duplicati identici.

### Priorità P2 — ottimizzazione grafica

- texture compresse KTX2/Basis per grandi sfondi e atlas, con fallback PNG/WebP;
- segmenti/layer di stage con preload e unload;
- foreground piccoli e trasparenti, non canvas enormi quasi vuoti;
- eventuale Spine per nemici, NPC e animazioni secondarie a ritaglio 2D.

## Animazione: cosa mantenere e cosa integrare

L'animatore custom attuale va mantenuto: durate per frame, fase locomozione, seek del salto e blend corto sono adatti a un beat 'em up e danno controllo sul gameplay.

Per gli eroi HQ non conviene affidare 200 pose indipendenti a un generatore: la deriva del volto e dell'anatomia è intrinseca al metodo. La soluzione sostenibile è:

- clip più corte e progettate su keyframe canonici;
- frame intermedi prodotti/ritoccati sotto controllo;
- atlas deterministico e gate di identità;
- riuso di timing e motion template, non di immagini protette.

Un runtime scheletrico 2D come Spine è utile soprattutto per nemici comuni, NPC di sfondo, armi e accessori. Riduce il numero di immagini, ma non sostituisce bene lo stile illustrato frame-by-frame dei protagonisti; inoltre richiede una licenza editor/runtime compatibile.

I personaggi MUGEN commerciali devono restare riferimenti di timing e movimento, non asset distribuibili nella demo crowdfunding.

## Sequenza raccomandata

1. Approvare la lista di eliminazione, senza cancellazioni automatiche.
2. Rimuovere Barbetta e risolvere la contraddizione Pizzetto.
3. Introdurre manifest/bundle/unload e separare metadata per personaggio.
4. Rendere atlas-only il runtime e spostare i frame sciolti fuori da `public`.
5. Aggiungere QA automatica e un template di importazione unico.
6. Solo dopo, produrre in serie nemici, oggetti e nuovi stage.

