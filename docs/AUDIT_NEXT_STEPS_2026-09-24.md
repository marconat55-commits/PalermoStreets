# Check caricamento e personaggi — 24 settembre 2026

## Caricamento

Revisione indipendente di Game, AssetCatalog e StageScene: il personaggio selezionato poteva essere caricato dopo lo stage in caso di conferma rapida. Ora i due caricamenti partono insieme e il progresso include il personaggio. Nessuna modifica al combattimento.

Volume indicativo M01 con Marco/Talebano: 18,7 MiB fra atlanti, fondali e ambient, esclusi piccoli dati/oggetti/UI. Misure HTTP locali: atlas Marco 1 708 ms (3.944.251 byte), atlas Marco 2 282 ms (3.599.872 byte), M01 MAIN 280 ms (4.860.762 byte). Non sono misure browser a cache fredda e non includono decodifica/GPU. La presentazione iniziale dura inoltre 3,2 secondi.

Restano da verificare e correggere separatamente invalidazione del preload dopo ritorno al titolo e cancellazione asincrona con Esc. Non dichiarare risolto ogni rallentamento sulla base di questa sola correzione.

## Inventario e revisione indipendente delle pose

- Master canonico di Barbaccia: `art_source/stage1_zen/barbaccia_hd_master/BARBACCIA_HD_USER_MASTER.png`, scelto esplicitamente dall'utente. Le vecchie viste frontale e tre quarti sono solo riferimenti anatomici supplementari.
- Pilot HD di Barbaccia: quattro pose normalizzate in `art_source/stage1_zen/barbaccia_hd_master/walk_frames_v1/`, ancora `art_review_only`.
- La variante arcade a bassa qualità è stata rimossa dal repository corrente; resta recuperabile nella cronologia Git e non deve essere riutilizzata.
- Candidati di Pino: `art_source/stage1_zen/enemy_motion_pilots_2026_09_20/`, fogli V1/V2 di quattro pose.

L'audit riproducibile `scripts/audit-barbaccia-hd.py` verifica i quattro frame HD 640x420 e la baseline Y=400. Il validatore runtime standard non include automaticamente `art_source`.

Problemi visivi ancora aperti: le quattro pose HD cambiano la postura delle mani e vanno valutate in movimento prima dell'approvazione. Pino V2 ha frangia blu e non ha una camminata completa. Nessun pacchetto completo danno/caduta/rialzata trovato per entrambi nel repository.

## Altre chat consultate

`Correggi errori PixiJS v0.7.8`: ultimi turni falliti per 413; non costituiscono nuovi asset. `Creare 8 pose pugno destro`: feedback utente di pose slegate, allegato presente ma non identificato come pacchetto dei due nemici. `Creare un Picchiaduro Efficiente` e `Crea repo PalermoStreets-Higgsfield` riguardano anche una versione parallela: non importata in PixiJS. Inventario delle altre chat non esaustivo; eventuali altri fogli non ancora reperiti non vanno dichiarati testati.

## Ordine dei prossimi passi

1. Misurare selezione rapida e secondo avvio nel browser; completare gestione cancellazione/riavvio e separare caricamento da presentazione.
2. Consolidare gli asset recuperati: identità approvata, stile candidato e animazione validata sono stati diversi.
3. Valutare il pilot HD di Barbaccia in entrambi i facing, a velocità normale e rallentata; produrre idle e attacco soltanto dal master HD.
4. Completare Barbaccia: attacco pesante, hit, caduta/rialzata con seam pixel-identica; morte compatibile.
5. Pulire Pino/Pizzetto e completare walk, attacco, scarto, hit, caduta/rialzata nello stile scelto.
6. Importare atlas/metadati e provare combattimento reale; solo dopo regolare ondate e proseguire i moduli ZEN.

La conversione completa di Marco/Merco non è necessaria per svolgere questi audit e non è stata eseguita.
