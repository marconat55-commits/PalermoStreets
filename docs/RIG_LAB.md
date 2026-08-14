# Rig Lab — prototipo deterministico

Il laboratorio si apre con:

```text
http://localhost:5173/?riglab=1
```

Non sostituisce alcun PNG o profilo del gioco. Serve a validare scheletro,
timing e traiettorie prima del ritaglio artistico del personaggio.

## Controlli

- `1`: camminata da 8 pose
- `2`: combo da 4 colpi
- `3`: calcio volante
- `4`: super uppercut avanzante infuocata
- `Spazio`: pausa/riprendi
- `Freccia sinistra/destra`: ispezione frame per frame

La super include avanzamento, invulnerabilità iniziale, tre finestre di impatto
e fuoco separato dal personaggio. Il fuoco non richiede nuovi frame raster.

## Gate prima dell'integrazione

1. Approvare biomeccanica e timing sullo scheletro.
2. Suddividere una copia del Master in parti, conservando intatto l'originale.
3. Collegare le parti alle articolazioni e aggiungere soltanto le viste correttive necessarie.
4. Confrontare il risultato riggato con i PNG dipinti correnti.
5. Integrare nel runtime solo dopo approvazione visiva.
