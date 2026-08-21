# Runtime e asset pipeline scalabile

## Contratti correnti

- `public/data/runtime.json` è l'unico registry di stage. Aggiungere uno stage non richiede modifiche a `Game.ts`.
- `public/data/characters/index.json` registra il roster tecnico.
- Ogni profilo personaggio punta al proprio atlas e al proprio `frame_meta` locale.
- `npm run assets:manifests` rigenera deterministicamente i metadata locali dal metadata globale di migrazione.
- In produzione i frame devono esistere nell'atlas. Il packaging rimuove da `dist` i PNG sciolti delle animazioni; il fallback resta disponibile soltanto nel progetto di sviluppo.
- StageScene precarica il modulo successivo e rilascia gli sfondi del modulo precedente; alla distruzione rilascia sfondi, oggetti ed enemy bank.

## Aggiungere un personaggio

1. Inserire master e approvati sotto `art_source/characters/<id>/`.
2. Generare frame runtime 640x420 e atlas sotto `public/assets/characters/<id>_anim/`.
3. Creare `public/data/characters/<id>.json` con scala canonica, baseline, clip e percorsi asset.
4. Registrare l'ID in `public/data/characters/index.json`.
5. Eseguire `npm run assets:manifests` e `npm run check`.

Il percorso automatizzato è `npm run character:import -- --spec <spec.json> --check-only`. Il gate controlla integralmente la consegna prima di scrivere. Rimuovendo `--check-only`, copia i frame senza alterarli, registra il profilo e richiama i generatori lossless di metadata e atlas. La sovrascrittura di un ID esistente è vietata.

## Aggiungere uno stage

1. Creare JSON stage e catalogo oggetti dedicato.
2. Registrare entrambi in `public/data/runtime.json`.
3. Ogni modulo dichiara layer, world width, camera bounds e walk band.
4. Eseguire `npm run check`.

## Gate obbligatori

- atlas completo;
- metadata locale sincronizzato;
- scala runtime uniforme;
- canvas, piedi, baseline, bordi e continuità validi;
- nessun frame runtime non referenziato;
- contact sheet e preview movimento approvate prima dell'integrazione;
- `npm run audit:assets` prima di archiviare una produzione, per individuare copie byte-identiche.

## Migrazione residua

Il file globale `public/data/generated/frame_meta.json` rimane temporaneamente la sorgente di build. Quando tutti gli strumenti scriveranno direttamente metadata locali, potrà essere rimosso insieme al fallback `legacy_frame_meta`.

I PNG singoli restano sotto `public` perché validatori e strumenti QA li ispezionano, ma `npm run build` li esclude automaticamente da `dist`. La distribuzione è quindi atlas-only senza perdere le sorgenti o il fallback locale.
