# Palermo Streets — Stage Editor

Lo Stage Editor è uno strumento locale di sviluppo. Non modifica le immagini originali: salva posizione e dimensioni degli oggetti nel file runtime `public/data/stage1_zen.json`.

## Avvio

Aprire il progetto ed eseguire:

```powershell
npm.cmd run dev
```

Visitare quindi:

`http://localhost:5173/tools/stage-editor.html`

## Funzioni disponibili

- selezione automatica dei moduli presenti nello stage;
- canvas esteso all'intera larghezza del modulo;
- libreria costruita automaticamente dagli asset ambientali e dai props di sfondo pubblici;
- ricerca e filtro per categoria;
- inserimento tramite trascinamento o doppio clic;
- spostamento visuale e numerico;
- ridimensionamento proporzionale;
- specchio orizzontale e trasparenza;
- duplicazione ed eliminazione;
- undo e redo;
- guide WALK, riferimento Merco da 290 px e camera 1280×720;
- vista pulita di anteprima;
- salvataggio diretto nel JSON usato dal gioco.
- pubblicazione esplicita su GitHub tramite il pulsante **Salva e pubblica**.

## Salvataggio sicuro

Il pulsante **Salva stage**:

1. controlla che il file non sia cambiato dopo l'apertura dell'editor;
2. crea una copia locale sotto `.tmp/stage-editor-backups/`;
3. aggiorna `public/data/stage1_zen.json`;
4. esegue la validazione dei dati;
5. ripristina automaticamente la versione precedente se la validazione fallisce.

Il pulsante **Salva stage** non crea commit Git e non pubblica modifiche online.

Il pulsante **Salva e pubblica** salva e valida lo stage, crea un commit limitato a `stage1_zen.json` e agli asset usati dallo stage, quindi lo invia sul ramo `crowdfunding-rebuild`. Non include bozze, output o altri file estranei. Se GitHub contiene modifiche più recenti, la pubblicazione viene fermata e chiede di riavviare il server per sincronizzarsi.

## Uso completamente online

Per non conservare il progetto sul PC si può usare GitHub Codespaces:

1. aprire il repository su GitHub e selezionare il ramo `crowdfunding-rebuild`;
2. scegliere **Code → Codespaces → Create codespace on crowdfunding-rebuild**;
3. attendere la preparazione automatica; il server viene avviato e la porta del gioco viene aperta nel browser;
4. aggiungere `/tools/stage-editor.html` all'indirizzo mostrato per aprire l'editor;
5. usare **Salva e pubblica** per rendere permanenti le modifiche su GitHub.

Il progetto, le dipendenze e il server restano nel Codespace. Sul PC rimangono soltanto il browser e gli eventuali file scaricati volontariamente.

## Aggiunta di nuovi asset

Gli asset piazzabili devono essere PNG o WebP sotto `public/assets/ambient/`. I PNG presenti in una cartella `static_props` vengono mostrati separatamente; le sequenze collocate nella stessa cartella vengono trattate come un singolo NPC animato.

Sono inclusi anche gli asset pubblici collocati nelle cartelle `props` degli sfondi. I file conservati soltanto sotto `art_source` non sono piazzabili finché non vengono importati in `public/assets`, perché il gioco non può caricarli a runtime.

Per vedere un nuovo asset basta ricaricare la pagina dell'editor.

## Comandi rapidi

- Frecce: spostamento di 1 px;
- Shift + frecce: spostamento di 10 px;
- Ctrl + D: duplica;
- Canc/Backspace: elimina;
- Ctrl + Z: annulla;
- Ctrl + Shift + Z: ripeti;
- Ctrl + S: salva.

La rotazione, i layer OCCLUSION/FOREGROUND, il grading e il salvataggio Git saranno aggiunti solo dopo aver esteso lo stesso supporto nel runtime di gioco.
