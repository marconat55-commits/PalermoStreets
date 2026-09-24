# Revisione master — 24 settembre 2026

Aprire index.html: 93 immagini, 16 identità originali/NPC e 3 reference MUGEN. Le miniature non rappresentano le scale nel gioco. Cliccare per vedere le sorgenti.

## Decisioni confermate

- Marco, Merco e Pino U Pizzettu sono tre personaggi distinti, confermati dall'utente: non unificarli come cloni.
- Rimosso il personaggio col motorino su richiesta esplicita: entrambe le sorgenti, manifest e anteprime. Nessun altro personaggio eliminato.
- Barbaccia M013 è il master HD scelto il 24/09. M005 è la direzione arcade superata; M006 è un pilot non approvato come ciclo.

## Da verificare insieme

- Merco M032/M033: master dettagliato e variante arcade; confrontare il runtime M048.
- Leandra M023–M029: vecchio master/card e pacchetto frontale/tre quarti/ritratto.
- Barbaccia: compatibilità delle vecchie viste con M013.
- Talebano M071: campione runtime; cartella master dichiarata nel profilo assente sotto public.
- Sciaron: posa telefono di identità, non guardia neutra.

Marco M030 è documentato come approvato in art_source/README.md. AIori M004, Haggar M018 e Ken M022 sono reference MUGEN.

## Duplicati esatti

Barbaccia: M007=M014, M010=M015. Sciaron: M065=M069, M068=M070. U Scafazzatu: M078=M084, M081=M085.

Sono copie fra raccolte storiche: non sono state eliminate. Occorre verificare le dipendenze prima di deduplicare. Originale e trasparente non sono automaticamente intercambiabili.

Ambito: repository corrente, non tutti i frame runtime né allegati rimasti in altre chat. La dicitura approved nei percorsi non costituisce nuova approvazione. inventory.json registra hash file e pixel; non prova assenza di cloni ridisegnati. overview.jpg mostra un campione per identità, non una selezione definitiva.

Rigenerare con scripts/catalog-master-review.py e Python/Pillow. Gli ID esistenti sono conservati nelle rigenerazioni.
