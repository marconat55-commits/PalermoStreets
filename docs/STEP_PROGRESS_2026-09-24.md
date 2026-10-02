# Stato operativo degli step

## 1 — Caricamento e riavvio

Implementati: stage/personaggio in parallelo, progresso comprensivo del personaggio, deduplicazione del preload anche durante caricamento catalogo oggetti, invalidazione al ritorno da uno stage, cancellazione delle continuazioni obsolete con Esc, attesa della costruzione abbandonata prima di aprire un'altra selezione, serializzazione scaricamento/ricaricamento texture e atlas.

Cinque regressioni automatiche verificano cancellazione in attesa, cancellazione durante costruzione, invalidazione dopo partita, deduplicazione e attesa dello scaricamento. Suite completa: 117 test. Browser: annullamento al titolo senza errori, riapertura selezione verificata. Non è ancora disponibile un confronto numerico affidabile prima/dopo a cache fredda.

## 2 — Inventario locale

`scripts/audit-barbaccia-hd.py` produce `art_source/stage1_zen/barbaccia_hd_pose_audit.json`: hash del master canonico, dimensioni, alpha bounds e unicità dei quattro frame del pilot HD. Richiede Pillow. Il master di identità non equivale a un ciclo animato approvato.

## 3 — Camminata Barbaccia, in lavorazione

`BARBACCIA_HD_USER_MASTER.png` è l'unica identità canonica. I quattro frame in `barbaccia_hd_master/walk_frames_v1/` rispettano tela 640x420 e baseline Y=400, ma restano `art_review_only`: vanno verificati in loop perché le mani cambiano postura rispetto al master. La variante arcade semplificata è stata eliminata dal repository corrente.

## 4–6 — Da eseguire dopo il gate di movimento

Pacchetto completo Barbaccia (pesante/hit/caduta/rialzata), Pizzetto e integrazione combattimento non sono completati. Non importarli nelle ondate prima della continuità del movimento e della seam caduta/rialzata.
