# Palermo Streets — PixiJS Migration 0.1

Questa cartella è il nuovo progetto **TypeScript + PixiJS v8** derivato dalla build Python/pygame-ce v0.7.8.

L'obiettivo non è infilare Python dentro il browser: il runtime è stato riscritto come progetto web moderno e data-driven, conservando gli asset e le regole di gioco già costruite.

## Cosa è già migrato

- risoluzione logica 1280x720 e letterbox 16:9;
- schermata titolo e selezione personaggio arcade con Marco più tre slot roster vuoti;
- 4 moduli a scorrimento dello Stage 1 ZEN e relativi fondali;
- Marco e Talebano;
- caricamento profili personaggio JSON;
- animazioni con durate per-frame e facing;
- allineamento degli sprite sul pivot dei piedi tramite metadata alpha generati offline;
- movimento WASD/frecce, corsa con doppio tocco orizzontale e frenata animata al rilascio;
- camminata e salto di Marco a 8 frame, più quattro animazioni idle di personalità a rotazione;
- combo arcade a quattro colpi J, salto K + attacco aereo J, speciale J+K;
- parata Shift, schivata Spazio, presa automatica ravvicinata con ginocchiata J e lancio I;
- fury, salute, score e combo counter;
- hitbox/hurtbox e pushbox;
- hit-stop, screen shake e knockdown in parabola con atterraggio enfatizzato;
- AI nemici con attacker/supporters;
- attacchi leggeri/pesanti nemici;
- hit, knockdown, caduta, rialzata, morte e dissolvenza;
- ondate, checkpoint, transizioni tra moduli e uscita a destra;
- barre vita e nome dei nemici;
- HUD, boss bar, indicatori a terra e telegraph degli attacchi;
- debug hitbox con F3;
- fullscreen con F11;
- build web con Vite.

## Primo avvio su Windows — modo più semplice

1. Installa **Node.js** (PixiJS richiede Node 20 o superiore).
2. Estrai questa cartella in un percorso semplice, ad esempio `C:\PalermoStreetsPixi`.
3. Fai doppio clic su `START_HERE_WINDOWS.bat`.
4. Al primo avvio verranno installate le dipendenze npm.
5. Il terminale mostrerà un indirizzo locale, normalmente `http://localhost:5173/`.
6. Aprilo nel browser.

In alternativa, dal terminale di VS Code:

```bash
npm install
npm run validate:data
npm run dev
```

Per creare la build distributiva web:

```bash
npm run check
```

Il risultato viene scritto in `dist/`.

`npm run check` valida profili e atlas, controlla automaticamente i PNG (canvas, metadata, bordi, tagli e continuita fall/getup), esegue i test, il typecheck e la build.

## Visual Studio Code + Codex

Apri **la cartella intera del progetto** in Visual Studio Code, non un singolo file.

Installa l'estensione ufficiale OpenAI **Codex** (ID Marketplace `OpenAI.chatgpt`) e accedi con il tuo account ChatGPT. Poi apri il pannello Codex e dagli attività concrete sul repository.

Esempio di primo prompt:

> Leggi AGENTS.md e docs/MIGRATION_MAP.md. Avvia i controlli del progetto. Non modificare gli asset PNG. Fammi un report dei problemi del port PixiJS e correggi solo gli errori che impediscono build o avvio.

Prima di fare grandi modifiche consiglio di inizializzare Git:

```bash
git init
git add .
git commit -m "PixiJS migration baseline"
```

Così ogni lavoro di Codex è facilmente confrontabile e reversibile.

## PixiJS skills per Codex

PixiJS pubblica skills ufficiali per agenti di coding. Puoi installarle dalla root del progetto con:

```bash
npx skills add https://github.com/pixijs/pixijs-skills
```

PixiJS 8.19 include inoltre le skills nel package npm sotto `node_modules/pixi.js/skills/`.

## Struttura

```text
src/
  game/
    animation/     controller a stati, timing/scale per-frame e limiti visivi
    assets/        caricamento texture/profili
    combat/        attacchi, collisioni e combat solver
    effects/       hit spark e damage text
    entities/      Actor, Player, Enemy
    input/         tastiera
    scenes/        TitleScene, CharacterSelectScene e StageScene
    ui/            HUD e barre nemici
public/
  assets/          solo asset runtime necessari
  data/            profili, stage e frame metadata
legacy-reference/  vecchio codice Python, solo riferimento
AGENTS.md           regole operative per Codex
docs/ANIMATION_CONTRACT.md  contratto obbligatorio per i character pack
```

## Production Pipeline v1

La base scalabile per nuovi personaggi, nemici, stage, oggetti e attori ambientali e descritta in `docs/PRODUCTION_PIPELINE_V1.md`.

```bash
npm run content:check
npm run content:build
npm run content:scaffold -- enemy nuovo_nemico "NUOVO NEMICO"
```

Il primo pilot e il greybox tecnico di M02: master 3840x1080, runtime 2560x720, walk band misurata e prove camera X=0/640/1280. Non sostituisce ancora i fondali del gioco.

## Nota importante

PixiJS è il renderer/graphics framework. Il "game engine" di Palermo Streets resta il nostro codice TypeScript sopra PixiJS: combat system, AI, animazioni, stage system, oggetti, boss, audio e così via. Questa separazione è intenzionale e rende il gioco controllabile senza dipendere da un engine generalista.
