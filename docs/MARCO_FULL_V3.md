# Marco Full V3

## Consegna

- 28 clip runtime, 194 frame PNG coerenti.
- Canvas uniforme `640x420`, baseline piedi a `y=400`.
- Identita bloccata: volto, capelli, baffi, camicia bianca, fascia rossa, pantaloni chiari e scarpe marroni.
- Guardia laterale verso destra mantenuta come posa canonica.
- Camminata e corsa complete: orizzontale, su e giu; le diagonali sono gestite dal movimento combinato del gioco.
- Caduta e rialzata condividono esattamente il frame di contatto, senza cambio di scala.
- Combo pugni conclusa con diretto in avanti; combo calci separata.
- Presa, colpo in presa e lancio lontano hanno clip dedicate.

## Struttura riutilizzabile

`public/data/character_templates/main_player_core_v2.json` e la base obbligatoria per il prossimo protagonista. Definisce clip, numero di frame, fasi, baseline, scala apparente e soglie di qualita.

## Controlli automatici

- completezza clip e frame;
- canvas, trasparenza e bordi sicuri;
- baseline e continuita tra frame;
- variazione reale delle silhouette;
- scala apparente specifica per posa;
- handoff esatto `fall -> getup`;
- metadata, atlas, test di gameplay, typecheck e build.

La consegna passa `npm.cmd run check`: validazione dati, validazione artistica, 30 test, typecheck e build.

## Confini della modifica

Non sono stati modificati gameplay, velocita, statistiche o timing globali. `character_factory/` e gli sfondi Stage 1 restano esclusi da questa consegna.
