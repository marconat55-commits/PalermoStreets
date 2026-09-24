# Stato operativo degli step

## 1 — Caricamento e riavvio

Implementati: stage/personaggio in parallelo, progresso comprensivo del personaggio, deduplicazione del preload anche durante caricamento catalogo oggetti, invalidazione al ritorno da uno stage, cancellazione delle continuazioni obsolete con Esc, attesa della costruzione abbandonata prima di aprire un'altra selezione, serializzazione scaricamento/ricaricamento texture e atlas.

Cinque regressioni automatiche verificano cancellazione in attesa, cancellazione durante costruzione, invalidazione dopo partita, deduplicazione e attesa dello scaricamento. Suite completa: 117 test. Browser: annullamento al titolo senza errori, riapertura selezione verificata. Non è ancora disponibile un confronto numerico affidabile prima/dopo a cache fredda.

## 2 — Inventario locale

`scripts/audit-enemy-pilots.py` produce `art_source/stage1_zen/enemy_pose_audit.json`: hash sorgenti, dimensioni, alpha bounds e unicità dei 13 frame arcade. Richiede Pillow. L'inventario locale è riproducibile; ricerca nelle altre chat ancora non esaustiva. I master di identità non equivalgono a clip animati approvati.

## 3 — Camminata Barbaccia, in lavorazione

`WALK_OPPOSITE_STEP_REJECTED.png`: prova scartata; sposta il braccialetto senza risolvere sufficientemente la fase del passo. Nessuna registrazione runtime.

`WALK_PASS_SUPPORT_NEAR_V2.png`: nuovo candidato con gamba vicina/braccialetto piantata e gamba lontana sollevata, ginocchia ravvicinate. Normalizzato in `walk_candidates_v2/pass_support_near.png` con tela 640x420 e baseline Y=400. Va accoppiato con la fase opposta e verificato in loop; non è un ciclo approvato.

Generato con ImageGen built-in. Specifica: conservare identità, torso e stile del frame pass_left; gamba col monitor verticale in appoggio, altra gamba piegata con tallone dietro il polpaccio; sfondo trasparente. Il foglio V1 e i frame precedenti restano disponibili per confronto.

## 4–6 — Da eseguire dopo il gate di movimento

Pacchetto completo Barbaccia (pesante/hit/caduta/rialzata), Pizzetto e integrazione combattimento non sono completati. Non importarli nelle ondate prima della continuità del movimento e della seam caduta/rialzata.
