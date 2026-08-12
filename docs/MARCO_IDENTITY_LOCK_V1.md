# Marco Identity Lock v1

## Autorità visiva

- Master canonico: `art_source/characters/marco/MARCO_MASTER_APPROVED.png`.
- Ogni nuova posa deve mantenere volto, baffi, capelli, carnagione, età apparente,
  proporzione testa/corpo, abiti e palette del master.
- Una posa di movimento precedente può indicare soltanto la meccanica del gesto;
  non è mai autorità per identità o scala.

## Gate prima dell'integrazione

1. Generare e approvare prima i keyframe principali.
2. Confrontarli affiancati, con uguale altezza visiva e baseline.
3. Creare soltanto i raccordi realmente necessari.
4. Ritagliare ogni sorgente su canvas trasparente `640x420`.
5. Bloccare l'altezza visiva canonica di Marco a `290 px` e i piedi a `Y=400`.
6. Usare sempre scala runtime uniforme `1.0`.
7. Rigenerare `frame_meta.json` e atlas, quindi eseguire tutti i controlli.

## Super v1 approvata

La super utilizza cinque pose uniche:

1. anticipation
2. drive
3. impact
4. retract
5. recovery

Il contatto avviene sul frame 3. Il fuoco resta un effetto runtime separato dallo
sprite. Gli otto frame precedenti sono conservati in
`art_source/characters/marco/archive/super_pre_identity_lock_v1/`.

Questa pipeline è il modello da riutilizzare per le future mosse e per i nuovi
protagonisti: identità approvata prima, movimento dopo, integrazione per ultima.
