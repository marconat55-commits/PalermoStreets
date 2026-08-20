# Stage 1 “The Zen” — import master personaggi e oggetti

## Stato dell’importazione

- I PNG ricevuti sono conservati senza modifiche in `art_source/stage1_zen/**/original/`.
- Le copie personaggio con trasparenza sono materiale di produzione, non sprite runtime: mancano ancora pose, canvas 640×420, baseline e gate di identità.
- Barbetta è conservato esclusivamente come archivio storico ed è marcato `excluded`; non viene registrato nel roster.
- Pizzetto è un nuovo candidato di archetipo. Non riattiva né recupera il vecchio pack eliminato.
- I sedici oggetti hanno copie trasparenti in `public/assets/items/stage1_zen/` e un catalogo validato in `public/data/items/stage1_zen.json`.

## Oggetti prototipo

`metal_pipe` e `brick` sono marcati `prototype`: definiscono rispettivamente il primo test melee e il primo test lanciabile. Il catalogo non abilita ancora raccolta o combattimento; questi comportamenti entreranno insieme alle classi `WorldObject`, `Pickup`, `WeaponInstance` e `Projectile`, evitando logica speciale dentro `StageScene`.

## Eccezioni QA

- `LEANDRA_CARD_MASTER.png` e `LEANDRA_SELECT_PORTRAIT.png` non hanno un chroma uniforme affidabile: restano reference originali e non sono considerate copie runtime approvate.
- `U_50INO_MASTER.png` contiene personaggio e motorino nello stesso master: dovranno essere separati prima del runtime.
- Gli oggetti con grafica commerciale/parodica (`beer_bottle`, `pepis_can`, `cola_can`) sono segnalati per una revisione legale/grafica prima del crowdfunding pubblico.

## Prossimo gate

1. Approvare un solo archetipo nemico dal manifest.
2. Creare esclusivamente le key pose richieste da `enemy_standard_v2.json`.
3. Validare identità, altezza, piedi e continuità prima degli intermedi.
4. Implementare il sistema generico oggetti con tubo e mattone; solo dopo abilitare gli altri elementi del catalogo.
