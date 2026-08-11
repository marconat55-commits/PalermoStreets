# Stage 1 Zen — integrazione layer V2

## Stato runtime

- I quattro moduli usano `FAR_V2.png` + `MAIN_V2.png` a 2560×720 senza deformazione.
- `FOREGROUND.png` non viene caricato: nei file consegnati è un placeholder completamente trasparente.
- Il FAR usa temporaneamente `parallax: 1.0`. Le immagini FAR sono ritagli locali e a velocità 0.35 lasciano aree scoperte durante lo scroll.
- La separazione FAR/MAIN conserva il composito RGB originale e non usa più reveal mask.

## Fascia di camminata

Ogni modulo contiene due profili world-space:

- `walk_top`: limite superiore dei piedi;
- `walk_bottom`: limite inferiore dei piedi.

Il runtime interpola i campioni in base alla X del personaggio. Player e nemici vengono quindi limitati alla superficie calpestabile del modulo, anche quando la fascia cambia altezza.

## Scala

Gli asset restano alla scala autoriale 2560×720. Un ingrandimento globale a 1.5× non è applicabile in modo uniforme: migliora alcuni porticati, ma taglia il campetto e l’ingresso e sposta le fasce WALK fuori composizione. La calibrazione prospettica finale va eseguita per modulo, usando Marco a 290 px come riferimento, senza cambiare la scala runtime dei personaggi.

## Parallax futuro

Per riattivare un FAR indipendente a 0.18–0.35 occorre una texture continua che copra la larghezza visibile per tutto l’intervallo camera 0–1280. Dopo la sostituzione del FAR, sarà sufficiente cambiare il valore `parallax` nei layer dati; il motore è già predisposto.
