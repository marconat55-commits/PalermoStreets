# Marco V2 Core

Il Core V2 sostituisce esclusivamente le clip di locomozione e reazione di Marco. Le clip di combattimento e le idle narrative restano nel pack precedente fino al passaggio Full V2.

Il contratto `main_player_core_v2.json` è la base riutilizzabile per il prossimo protagonista: definisce conteggi, fasi, direzioni e soglie QA per clip.

## Copertura runtime

| Clip | Frame |
|---|---:|
| idle | 8 |
| walk | 12 |
| walk_up / walk_down | 10 + 10 |
| run / run_up / run_down | 10 + 10 + 10 |
| brake | 6 |
| jump / land | 10 + 6 |
| fall / getup | 8 + 8 |

Totale Core: 108 PNG su canvas trasparente 640x420, baseline Y=400 e scala runtime 1.0. `fall/08.png` e `getup/01.png` sono lo stesso file a livello pixel; `dead` riusa gli otto frame di `fall`.

## Produzione e normalizzazione

- Identità e costume derivano da `Marco Master.jpg`.
- Le tavole sono state generate su chroma key uniforme e ripulite con despill e contrazione del bordo di 1 px.
- Ogni tavola usa un solo fattore di scala baked: le differenze di bounding box dipendono dalla posa, non da zoom runtime.
- Il runtime usa clip dedicate per corsa orizzontale, verso l'alto e verso il basso. Le diagonali selezionano la vista di profondità più vicina.

## Gate

Lo script di lavorazione `validate_core_pack.py` ha verificato 108 frame per:

- numero file e canvas;
- baseline, margini e assenza di tagli;
- altezza delle pose erette;
- residui chroma;
- duplicati esatti e pose quasi duplicate;
- continuità dei loop;
- proporzione a terra;
- identità pixel tra ultimo `fall` e primo `getup`.

Il gate di repository resta `npm run check`, seguito dalla prova runtime delle direzioni, frenata, salto, caduta e rialzata.
