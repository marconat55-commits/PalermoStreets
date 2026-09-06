# Pipeline pilota video -> sprite coerenti

## Obiettivo

Ridurre le generazioni indipendenti: un master approvato viene animato con un breve
video guida; Codex estrae, pulisce, seleziona e normalizza i frame per il runtime.
Il video generativo non entra direttamente nel gioco.

## Candidato principale

**Wan-Animate-2** (`Wan-AI/Wan2.2-Animate-2-14B`), perché usa direttamente il
driving video, dichiara identity preservation e permette di controllare la vista
separatamente dal filmato guida. Licenza dichiarata: Apache-2.0.

Alternative di confronto:

- **MimicMotion 1.1**: maturo e pose-guided, fino a 72 frame a 576x1024; richiede
  hardware importante e i demo pubblici non sono affidabili.
- **StableAnimator**: orientato alla conservazione del volto, ma installazione e
  inferenza sono più tecniche.
- **ToonCrafter**: utile dopo, per interpolare due keyframe già approvati; non è il
  generatore primario delle pose.

## Test minimo U Tignusu

1. Input identità: `U_TIGNUSU_MASTER_3Q.png`.
2. Driving video: 1-2 secondi, camera fissa, corpo intero, solo un pugno diretto.
3. Output: una sola clip, vista 3/4 verso destra, sfondo uniforme, nessun effetto.
4. Estrazione a 12 fps; eliminazione automatica dei duplicati quasi identici.
5. Gate: volto/costume/tatuaggi, numero arti, trasparenza, baseline e scala.
6. Selezione di 4-6 frame; normalizzazione 640x420, piedi a Y=400, scala 1.0.
7. GIF alla velocità runtime e approvazione prima di atlas/metadata.

## Regola di arresto

Il metodo viene respinto se in una singola clip cambiano volto, barba, tatuaggi,
costume o proporzioni in più di un frame utile. Non si correggono manualmente
decine di fotogrammi incoerenti.

## Scalabilità prevista

Una libreria di driving video riutilizzabile (idle, walk, punch, hit, fall, getup)
serve tutti i personaggi. Per ogni nuovo personaggio cambiano master e parametri,
non la struttura delle mosse. Boss e protagonisti possono aggiungere clip proprie.

## Fonti primarie

- https://huggingface.co/Wan-AI/Wan2.2-Animate-2-14B
- https://github.com/Tencent/MimicMotion
- https://github.com/Francis-Rings/StableAnimator
- https://github.com/Doubiiu/ToonCrafter
