# Codex + Visual Studio Code — guida semplice

## 1. Installa gli strumenti

Servono tre cose:

- Node.js;
- Visual Studio Code;
- estensione ufficiale OpenAI Codex per VS Code (`OpenAI.chatgpt`).

Non devi installare Python per il nuovo runtime PixiJS.

## 2. Apri il progetto

In VS Code scegli **File → Open Folder** e seleziona la cartella `PalermoStreets_PixiJS_v0.1_MIGRATION`.

## 3. Apri Terminal → New Terminal

Esegui:

```bash
npm install
npm run validate:data
npm run dev
```

Lascia aperto il terminale mentre giochi nel browser.

## 4. Usa Git prima di far lavorare Codex

```bash
git init
git add .
git commit -m "baseline"
```

Quando Codex fa un cambiamento importante:

```bash
git diff
```

Se il risultato ti piace:

```bash
git add .
git commit -m "descrizione modifica"
```

## 5. Come parlare a Codex

Evita prompt tipo "migliora tutto" quando vuoi una modifica controllata. Dagli un obiettivo e un test.

Buon esempio:

> Leggi AGENTS.md. Talebano cambia scala durante knockdown/getup. Analizza i metadata e il codice Animator/Actor. Correggi solo pivot e continuità visiva; non cambiare danni, AI o gli asset PNG. Esegui npm run check.

Per una nuova feature:

> Leggi AGENTS.md. Implementa salto su K per Marco con una state machine separata dal movimento in profondità. Non cambiare le tre mosse esistenti. Aggiungi debug e test manuale documentato. Esegui npm run check.

Per il nuovo personaggio:

> Aggiungi il nuovo personaggio in modo data-driven. Non hard-codarlo in StageScene. Aggiorna profilo JSON, assets runtime, frame metadata e stage waves. Mantieni piedi/pivot coerenti con Marco. Esegui npm run validate:data e npm run build.

## 6. Quando usare me e quando usare Codex

Usa questa chat per direzione creativa, analisi video, personaggi, bilanciamento e decisioni di design. Usa Codex dentro VS Code per modifiche continue direttamente sul repository, test, refactor e debug locale. Puoi poi riportarmi ZIP, screenshot/video o errori e continuiamo a lavorare sulla stessa architettura.
