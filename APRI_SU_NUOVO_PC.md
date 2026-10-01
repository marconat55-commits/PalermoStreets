# Palermo Streets — riprendere il progetto su un nuovo PC

## Dove si trova l'ultima versione

Il progetto ufficiale è qui:

**https://github.com/marconat55-commits/PalermoStreets**

Il ramo usato per lo sviluppo è **`crowdfunding-rebuild`**. Contiene il gioco PixiJS aggiornato, gli asset approvati e i moduli M01, M02 e M03.

## Prima preparazione

1. Installa **Git for Windows**.
2. Installa **Node.js 22 LTS**.
3. Apri PowerShell nella cartella in cui vuoi conservare il progetto.
4. Esegui:

```powershell
git clone --branch crowdfunding-rebuild --single-branch https://github.com/marconat55-commits/PalermoStreets.git
Set-Location PalermoStreets
npm.cmd ci
npm.cmd run dev
```

5. Apri l'indirizzo mostrato dal terminale, normalmente **http://localhost:5173/**.

In alternativa, dopo `npm.cmd ci`, puoi usare:

- `GIOCA_PALERMO_STREETS.bat` per avviare il gioco;
- Visual Studio Code → **File → Apri cartella** → `PalermoStreets`, poi `npm.cmd run dev` nel terminale.

## Avvii successivi

Apri la stessa cartella ed esegui:

```powershell
npm.cmd run dev
```

Lo script di avvio controlla il ramo `crowdfunding-rebuild` e scarica automaticamente gli aggiornamenti pubblicati, senza sovrascrivere eventuali modifiche locali.

## Controllo rapido

Per verificare manualmente di essere sulla versione giusta:

```powershell
git branch --show-current
git pull --ff-only origin crowdfunding-rebuild
```

Il primo comando deve mostrare `crowdfunding-rebuild`. Il secondo deve concludersi senza conflitti.

Non occorre copiare `node_modules`, `dist` o cache dal vecchio PC: vengono ricreati localmente.
