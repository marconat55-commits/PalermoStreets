# Leandra e Julien: roster preparato

Master originali approvati conservati in art_source/characters/<id>/approved.
Ritratti UI derivati 640x640, senza rigenerazione del personaggio.
Registrazione in characters/index.json tramite upcoming_players: solo presentazione,
non carica animazioni o metadata di Marco. Invio non avvia il gioco su questi slot.
Griglia 3x2; movimento W/S di tre celle. Nomi e sottotitoli adattati al riquadro.

Da definire con l'autore: personalità e battute, forza/velocità/tecnica,
stile di combattimento. Le barre vuote indicano statistiche ancora non assegnate.
I draft_profile.json archiviati sono precedenti bozze non utilizzate dal runtime:
non promuoverli in produzione, poiché ereditano Marco e contengono valori provvisori.

Prossima produzione: un ciclo/mossa alla volta, preview animata e approvazione,
poi metadata/atlas e registrazione fra i personaggi runtime solo a pack valido.

Verifiche: suite completa 97 test; dati, arte, TypeScript e build passati.
Browser: ritratti Leandra/Julien, navigazione e Invio bloccato verificati;
nessun errore console. Nessuna modifica al combattimento.
