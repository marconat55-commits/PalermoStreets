# Full Character Animation Spec v2

`main_player_full_v2.json` è il target di generazione per i prossimi quattro protagonisti. Non sostituisce ancora il pack runtime v1 di Marco: verrà attivato su un personaggio solo quando tutti i frame richiesti saranno disponibili e avranno superato il gate.

## Copertura obbligatoria

- Camminata e corsa orizzontale, verticale e diagonale logica.
- Frenata, salto, atterraggio, pugno e calcio aereo.
- Combo pugni, combo calci, prese, lancio e super.
- Reazioni, caduta, posa a terra, rialzata e morte a scala bloccata `1.0`.
- Quattro idle narrative da 16–24 frame, lunghe 3,5–6 secondi.
- Transizioni compatibili fra prima e ultima posa di ogni stato.

Le diagonali usano un vettore di movimento normalizzato e la vista di profondità più vicina. Quando saranno disponibili `run_up` e `run_down`, il runtime le selezionerà automaticamente; in loro assenza accelera temporaneamente `walk_up` e `walk_down` senza deformare il personaggio.

## Marco: idle da rigenerare

La sequenza della spolverata resta un fallback tecnico. Le quattro idle definitive di Marco devono riprendere i concept approvati:

1. si spolvera la spalla e sorride;
2. estrae la Colt, controlla il tamburo e la ripone;
3. mira in avanti e simula lo sparo;
4. accende la sigaretta, fa due tiri e la lancia con le dita.

Le vecchie versioni non vanno ripristinate: avevano piedi tagliati, pose duplicate e variazioni di scala. I concept saranno rigenerati sul master originale di Marco con il nuovo numero minimo di frame.

## Profili secondari

I nemici di stage mantengono un moveset ridotto a 1–3 attacchi, ma ogni clip deve avere veri fotogrammi intermedi e rispettare lo stesso blocco di scala su caduta e rialzata. Il numero di mosse è ridotto; la qualità di ogni animazione no.
