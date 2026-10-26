# Stage 2 — San Lorenzo, fondale finale v1

Il fondale è composto dai cinque pannelli originali `PANEL_01.png`…`PANEL_05.png` (1672 × 941 ciascuno). Le rispettive versioni `PANEL_0N_NO_SKY.png` conservano edifici, montagne, vegetazione, gru e strada con il cielo reso trasparente.

- `SAN_LORENZO_MASTER_6452x941.png`: montaggio completo alla risoluzione di lavoro.
- `SAN_LORENZO_MAIN_MASTER_6452x941.png` e `SAN_LORENZO_SKY_MASTER_6452x941.png`: i due livelli separati alla risoluzione di lavoro.
- `SAN_LORENZO_FINAL_PREVIEW.png`: anteprima dei due livelli alla risoluzione di gioco (4937 × 720).
- `SAN_LORENZO_SKY_FINAL_SOURCE.png`: sorgente artistica del cielo separato.
- `public/assets/backgrounds/stage2_san_lorenzo/final_v1/SAN_LORENZO_SKY_FAR.png`: livello di cielo, 4937 × 720.
- `public/assets/backgrounds/stage2_san_lorenzo/final_v1/SAN_LORENZO_MAIN_FOREGROUND.png`: paesaggio e strada con trasparenza al posto del cielo, 4937 × 720.

I pannelli iniziano alle coordinate orizzontali 0, 1450, 2780, 3780 e 4780 del master. I quattro raccordi sono centrati a 1561, 2951, 4116 e 5116. La strada usa una sfumatura negli incroci; nella parte alta il taglio segue una transizione più stretta per evitare elementi duplicati, in particolare il gancio della gru.

Quando Stage 2 sarà collegato ai dati di gioco, il cielo va nel piano `far` con parallasse lento (come M03), dietro al piano `main` del fondale trasparente. Lo stage non è ancora registrato nella selezione dei moduli; questi sono i suoi asset grafici pronti per l'integrazione.
