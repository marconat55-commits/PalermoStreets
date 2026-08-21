# A Puaicca — primo test personaggio originale

Stato: `WAITING_FOR_APPROVED_FRAMES`.

Il master esistente è adatto come identity lock: figura intera, trasparenza, silhouette leggibile e accessori caratterizzanti. Non è ancora un personaggio runtime perché mancano le 27 pose minime elencate in `character_inputs/a_puaicca_v1/README.md`.

Questa scelta testa la scalabilità reale senza riciclare la grafica dei riferimenti MUGEN e senza generazioni massive: una sola clip per ciascuna funzione, con riuso dichiarato per heavy/dead.

Quando i frame saranno disponibili, l’importatore produrrà profilo runtime, registrazione, metadata e atlas; l’integrazione nello stage avverrà soltanto dopo `npm run check` e preview visiva.
