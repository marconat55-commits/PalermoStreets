# Marco Motion Pack v1

## Risultato

Marco è il riferimento tecnico per i prossimi protagonisti. Il pack mantiene gameplay, scala e timing esistenti, ma aggiunge un contratto dati riutilizzabile, un atterraggio dedicato, transizioni visive brevi e controlli automatici sugli errori grafici che in precedenza richiedevano revisione manuale.

## Pulizia grafica

- Audit iniziale: 46 anomalie nelle vecchie idle personality, tra tagli opachi sul bordo inferiore, pose duplicate e drift di scala.
- Rimossi 30 PNG non validi dalle quattro vecchie varianti idle; i file restano recuperabili dalla cronologia Git.
- Integrata una sola sequenza approvata `idle_variant_1` di 7 pose distinte: Marco si rilassa e si spolvera la spalla, con volto, abiti, piedi, baseline e scala coerenti.
- Aggiunto `land` di 4 fotogrammi per separare contatto, compressione, recupero e ritorno in guardia.
- Il tentativo di nuovo walk sheet non è stato integrato: il gate ha rilevato fasi semanticamente troppo simili. Il ciclo locomotorio approvato rimane quello esistente.

## Runtime e dati

- `factory.animation_template` collega Marco a `main_player_v1.json`.
- `frame_blend` introduce una breve dissolvenza solo tra pose già approvate; non simula né sostituisce gli in-between mancanti.
- Dopo il salto il player entra nello stato `land` e conserva una quota controllata di inerzia orizzontale, senza modificare velocità, danni o finestre delle mosse.
- Metadata e atlas di Marco sono stati rigenerati: 137 frame unici, 2 pagine atlas.

## Gate riutilizzabile per i prossimi protagonisti

Il validator blocca automaticamente:

- piedi o scarpe tagliati da una linea opaca sul bordo;
- baseline non coerente;
- variazioni di altezza oltre 6 px nelle pose erette;
- PNG duplicati usati come falsi fotogrammi intermedi;
- silhouette semanticamente quasi duplicate;
- loop con discontinuità e scala runtime non uniforme.

Il template obbliga inoltre le fasi locomotorie e il numero di pose per `idle`, `walk`, `walk_up`, `walk_down`, `run`, `brake`, `jump` e `land`.

## Verifica finale

- `npm run check`: PASS.
- Dati: 4 personaggi, 7 moduli, 251 PNG runtime e 251 metadata.
- Arte: 276 frame verificati.
- Test: 24 PASS.
- TypeScript e build Vite: PASS.
- QA browser: titolo, selezione, ingresso Stage 1, salto e ritorno a terra verificati; nessun errore o warning in console e nessun taglio di testa/piedi nel salto.
