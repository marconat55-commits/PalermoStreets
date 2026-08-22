# Merco HQ — piano di completamento

Stato: `IN_PROGRESS`. Merco resta giocabile perché eredita il core di Marco, ma le clip indicate come `EREDITATA` non sono ancora Merco HQ definitive.

## Clip Merco HQ già native

- idle (6)
- walk (8)
- jump (9)
- jump_forward (8)
- land (2)
- air_attack (5)
- punch_left (4)
- punch_right (3)
- muay_elbow (3)
- combo_finisher (3)
- grab (1)
- grab_strike (3)
- throw (3)

## Clip ancora ereditate da Marco

| Priorità | Clip | Frame target | Gate prima dell’integrazione |
|---|---|---:|---|
| P1 | run | 8 | GIF loop, scala 1.0, raccordo idle/walk |
| P1 | brake | 4 | raccordo run → guardia senza zoom |
| P1 | super | 8 | leggibilità, multi-target, identità HQ |
| P2 | air_punch | 5 | raccordo con jump_forward |
| P2 | kick_front | 6 | contatto leggibile |
| P2 | kick_right | 6 | silhouette distinta |
| P2 | kick_finisher | 6 | lancio lontano dell’avversario |
| P2 | block | 3 | entrata/uscita coerenti |
| P3 | hit | 3 | testa e corporatura canoniche |
| P3 | knockdown | 5 | scala 1.0 bloccata |
| P3 | getup | 5 | primo frame identico all’ultimo knockdown |
| P3 | dead | 5 | riuso controllato del knockdown |

## Workflow vincolante per ogni clip

1. Copiare numero e funzione delle pose del riferimento Ken già importato, senza copiarne identità o costume.
2. Produrre prima i soli keyframe necessari.
3. Normalizzare su canvas 640×420, piedi a Y=400 e scala runtime 1.0.
4. Creare GIF alla velocità reale di gioco.
5. Approvazione visiva prima dell’importazione.
6. Estrarre/aggiungere gli intermedi soltanto dopo l’approvazione dei keyframe.
7. Eseguire gate identità, anatomia, trasparenza, raccordi, atlas e test runtime.

Ordine operativo: `run → brake → super → air_punch → kick combo → block → reactions`.
