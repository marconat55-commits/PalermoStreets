# Palermo Streets - aggiornamenti semplici

## La cartella da usare

Aprire sempre questa cartella in Visual Studio Code:

`C:\Users\Utente\Documents\PIXIES\PalermoStreets`

Questa e l'unica cartella di lavoro. Non creare una nuova cartella per ogni piccola modifica.

## Per giocare

Fare doppio clic su `GIOCA_PALERMO_STREETS.bat`.

Il file prepara automaticamente le dipendenze solo quando mancano, poi avvia il gioco. Per fermare il server premere `CTRL+C` nella finestra nera.

## Per controllare il progetto

Fare doppio clic su `CONTROLLA_PROGETTO.bat`.

Il controllo deve terminare con `TUTTI I CONTROLLI SONO PASSATI`.

## Per aggiornare il gioco con Codex

1. Aprire la cartella `PalermoStreets` in Visual Studio Code.
2. Chiedere a Codex una modifica precisa.
3. Far eseguire a Codex tutti i controlli.
4. Provare personalmente il gioco.
5. Se la prova e corretta, chiedere a Codex di salvare una nuova versione Git.

Esempio:

> Leggi AGENTS.md. Aggiungi la modifica richiesta senza cambiare i PNG, la scala o il timing esistente. Esegui tutti i controlli. Se passano, aggiorna CHANGELOG.md ma non creare una nuova versione finche non ho provato il gioco.

Dopo la prova:

> La prova e riuscita. Salva questa versione stabile in Git e aggiorna il numero di versione.

## Regole dei numeri di versione

- `0.1.1`: correzione piccola, senza nuovo gameplay.
- `0.2.0`: nuova funzione o contenuto importante.
- `1.0.0`: prima versione considerata completa e distribuibile.

## Cosa non occorre ripetere

`npm.cmd install` non deve essere eseguito ogni volta. Serve soltanto alla prima preparazione o quando cambiano le dipendenze.

Non copiare `node_modules` negli archivi ZIP: viene ricreata automaticamente.
