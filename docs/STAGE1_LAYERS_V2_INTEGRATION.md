# Stage 1 Zen — integrazione layer V3

## Stato runtime

- I quattro moduli usano lo skyline continuo `ZEN_FAR_SKYLINE.png` e un `MAIN_SKY_V3.png` dedicato, entrambi con master 2560×720.
- Il cielo di Palermo usa `parallax: 0.22`; il MAIN usa `1.0`.
- `MAIN_SKY_V3.png` rende trasparenti soltanto i pixel marcati da `SKY_MASK_V2`: edifici, montagne, campo e piano di gioco restano sul MAIN.
- I vecchi `FAR_V2.png` restano archiviati ma non vengono caricati: erano ritagli locali e durante lo scroll indipendente lasciavano aree scoperte o frammenti sospesi.
- `FOREGROUND.png` non viene caricato: nei file consegnati è un placeholder completamente trasparente.
- La copertura è stata verificata a camera X `0`, `832` e `1664` per tutti i moduli, senza buchi neri.

## Fascia di camminata

Ogni modulo contiene due profili world-space:

- `walk_top`: limite superiore dei piedi;
- `walk_bottom`: limite inferiore dei piedi.

Il runtime interpola i campioni in base alla X del personaggio. Player e nemici vengono quindi limitati alla superficie calpestabile del modulo.

## Scala

I master restano 2560×720, ma il runtime li presenta a 2944×828 (`1.15×`) ancorandoli al fondo con `y: -108`. Il mondo è lungo 2944 unità e la camera copre `0..1664`. Trigger, spawn, ingressi e uscite sono riallineati sulla nuova scala orizzontale. Marco resta invariato a 290 px: viene corretta la scala scenica, non quella dei personaggi.

Le fasce WALK sono autorizzate sull'effettivo piano di gioco visibile:

- M01: 635–705, fascia stradale stretta;
- M02: 515–705, cortile/porticato basso;
- M03: 475–705, campetto;
- M04: 510–705, piazzale dell'ingresso.

Le vecchie curve V2 raggiungevano Y 394–404 e permettevano ai personaggi di camminare dentro porticati, gradinate e palazzi. Non sono più usate.

## Parallasse cielo

Il FAR continuo copre l'intero intervallo camera `0–1664`. La parallasse è intenzionalmente moderata (`0.22`): il cielo si muove in modo percepibile senza scivolare eccessivamente rispetto ai profili degli edifici.
