# Stage Prova — Cattedrale v1

Archivio sorgente del panorama Cattedrale approvato per la prima prova nello Stage Editor, aggiornato con cielo d’alba separato.

## Sorgenti

- `CATTEDRALE_PANEL_01_SOURCE.jpeg` — pannello 1 originale, 1672 × 941 px.
- `CATTEDRALE_PANEL_02_SOURCE.jpeg` — pannello 2 originale, 1672 × 941 px.
- `CATTEDRALE_PANEL_03.png` — pannello 3 generato, 1672 × 941 px.
- `CATTEDRALE_PANEL_04.png` — pannello 4 generato, 1672 × 941 px.
- `CATTEDRALE_PANEL_03_GENERATION_PROMPT.txt` — prompt effettivo del pannello 3.
- `CATTEDRALE_PANEL_04_GENERATION_PROMPT.txt` — prompt effettivo del pannello 4.

## Master

- `CATTEDRALE_PANELS_01_02_03_04_FUSION_FULL.png` — master panoramico, 4362 × 941 px.
- `CATTEDRALE_PANELS_01_02_03_04_FUSION_NOTES.txt` — posizionamento e raccordo adattivo.

## Runtime editor

Il master è ridotto proporzionalmente a 3338 × 720 px e separato in due livelli:

- `public/assets/backgrounds/stage_prova_cattedrale/CATTEDRALE_DAWN_SKY.png` — cielo d’alba, piano `far`, parallasse 0.18.
- `public/assets/backgrounds/stage_prova_cattedrale/CATTEDRALE_MAIN_FOREGROUND.png` — architettura e strada con cielo trasparente, piano `main`.

`CATTEDRALE_DAWN_COMPOSITE_PREVIEW.png` mostra il risultato combinato. I file `CATTEDRALE_DAWN_SKY_IMAGEGEN_RAW.png` e `CATTEDRALE_FOREGROUND_CUTOUT_HINT_RAW.png` conservano gli output ImageGen originali; le versioni finali 3338 × 720 sono state riallineate alla geometria del master senza ridisegnare l’architettura.

I prompt effettivi sono conservati in `CATTEDRALE_DAWN_SKY_GENERATION_PROMPT.txt` e `CATTEDRALE_FOREGROUND_REMOVAL_PROMPT.txt`.

La configurazione editor-only è in:

`public/data/stage_prova_cattedrale.json`

Questa versione non è registrata nella campagna runtime; serve per valutare camera, WALK line, scala combattenti e composizione ambientale prima dell’integrazione nel gioco.
