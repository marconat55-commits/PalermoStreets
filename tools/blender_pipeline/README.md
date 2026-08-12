# Blender character pipeline

Questa pipeline rende scalabile la produzione grafica senza sostituire PixiJS. Blender crea i fotogrammi da un modello riggato unico; gli script producono candidati PNG coerenti con il contratto runtime.

## Cosa automatizza

- azioni Blender -> sequenze PNG trasparenti;
- camera ortografica e scala sorgente fisse;
- ritaglio deterministico;
- canvas runtime 640x420;
- altezza visiva baked e baseline piedi Y=400;
- nomi e cartelle clip deterministici;
- ricevuta del render e report di normalizzazione;
- area candidati separata: nessuna sovrascrittura del gioco.

Atlanti, metadata e validazione finale restano affidati agli script già presenti nel repository dopo l'approvazione del pack candidato.

## Requisiti del file `.blend`

- armatura denominata `PS_Rig`;
- collezione visibile denominata `PS_Character`;
- camera ortografica denominata `PS_Camera`;
- un'azione Blender per ogni clip elencata nel manifest;
- modello con proporzioni, volto, costume e materiali già approvati;
- piedi e root motion coerenti. Il modello non deve avanzare fuori dalla camera: lo spostamento gameplay resta in PixiJS.

## Primo avvio

1. Scaricare Blender LTS portable ufficiale e decomprimerlo fuori dal repository.
2. Copiare `character_manifest.example.json` in `character_manifest.marco.json`.
3. Inserire il modello in `models/marco_3d_pilot.blend` oppure aggiornare `blend_file`.
4. Controllare nomi di rig, camera, collezione e azioni.
5. Eseguire:

```powershell
powershell -ExecutionPolicy Bypass -File tools/blender_pipeline/run_pipeline.ps1 `
  -Blender "C:\percorso\blender.exe" `
  -Manifest "tools/blender_pipeline/character_manifest.marco.json" `
  -Python "C:\percorso\python.exe"
```

I risultati saranno in `build/blender_pipeline/runtime_candidate/`. Nessun file sotto `public/assets` viene modificato.

## Gate prima della pubblicazione

Il pack candidato deve essere controllato visivamente e poi superare metadata, atlante, validazione dati, validazione grafica, test, typecheck e build. La pubblicazione nel runtime sarà uno step separato ed esplicito, mai automatico.
