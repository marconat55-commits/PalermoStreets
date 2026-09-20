# Studio dei personaggi Cadillacs and Dinosaurs forniti dall'utente

Analisi locale dei cinque archivi in `Downloads/` (Vice T., Ferris Driver, Black Elmer, Mustapha Cairo e Hannah Dundee). Sono conversioni **MUGEN**, con file `.air` per le animazioni e `.sff` per gli sprite, create da autori diversi. Le immagini sembrano provenire dal linguaggio grafico del gioco arcade, ma conteggi, ripetizioni, stati e durata dei frame appartengono a queste conversioni: **non sono una misura certificata dei dati originali Capcom**. I file di riferimento e i fogli di contatto non entrano negli asset distribuibili di Palermo Streets. Lo script `scripts/audit-mugen-reference-archives.py` ripete il conteggio senza estrarre o importare sprite nel progetto; gli eventuali fogli visivi restano in `build/`, esclusa da Git.

## Conteggio effettivo delle pose

Nelle colonne delle animazioni si contano gli **sprite distinti**, non le righe `.air`: la stessa immagine può essere tenuta per più tick o richiamata più volte.

| Archivio | Sprite SFF | Azioni AIR | Idle 0 | Walk 20 | Run 100 | Attacco 200 | Caduta 5050 | Rialzata 5120 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Vice T. | 125 | 75 | 1 | 5 | 5 | 2 | 1 | 4 |
| Ferris Driver | 191 | 73 | 4 | 6 | 6 | 2 | 2 | 3 |
| Black Elmer | 142 | 68 | 7 | 5 | 9 | 3 | 2 | 3 |
| Mustapha Cairo | 88 | 77 | 3 | 9 | 8 | 3 | 2 | 4 |
| Hannah Dundee | 510 | 112 | 9 | 12 | 8 | 2 | 1 | 3 |

Hannah è un protagonista più ricco di stati e varianti; non va usata per fissare il budget di un nemico. Vice T., Ferris e Black Elmer dimostrano che un nemico leggibile può camminare con 5–6 pose e attaccare con 2–3 pose distinte. La corsa di Black Elmer usa 9 immagini, mentre la sua camminata ne riusa solo 5 fra 8 righe: la qualità percepita dipende da pose diverse e cadenza, non dal numero grezzo di file. Mustapha ha addirittura 120 righe nell'azione 220, ma solo 6 sprite distinti; attribuire tutte quelle righe a disegni nuovi sarebbe un errore.

I tempi differiscono molto fra conversioni: Vice T. impiega 4 tick per ciascuna delle 5 pose di cammino; Ferris 9–10 tick per 6; Black Elmer 7–8 tick per 8 righe che riusano 5 sprite. A 60 Hz, questi cicli sarebbero rispettivamente circa 0,33, 0,93 e 1,0 secondi. Sono tempi MUGEN, non un obbligo per il nostro gioco. La differenza fra camminata pesante di Barbaccia e passo rapido di Pino va quindi conservata nei JSON dei personaggi, con verifica visiva in gioco.

## Cosa rende leggibile il riferimento

- Silhouette diverse nei momenti decisivi: gamba che pianta il passo, busto che anticipa il colpo, arto che raggiunge il contatto, reazione e ritorno in guardia. I fogli di contatto mostrano che queste fasi restano riconoscibili anche a dimensioni ridotte.
- Forte separazione fra personaggi: Vice T. ha spalle e armatura larghe, Ferris una figura asciutta e reattiva, Black Elmer una massa rotonda e una corsa molto caratterizzata. L'identità si riconosce prima del dettaglio del costume.
- Ripetizioni e tenute intenzionali, non frame di transizione quasi identici. Un singolo disegno può essere esposto più a lungo per dare peso a un impatto o a una posa di attesa.
- Caduta e rialzata sono clip autonome. La nostra giunzione deve restare pixel-identica fra ultima posa di caduta e prima di rialzata, anche se le conversioni MUGEN non garantiscono questa regola.

## Decisione per Palermo Streets

**Non ridurre la risoluzione o pixelare indiscriminatamente Merco e i nemici.** Gli sprite arcade sono immagini indicizzate piccole, pensate per un diverso schermo e una diversa direzione artistica; lo Stage ZEN attuale usa sfondi e personaggi pittorici a 1280×720. La nostra qualità va misurata con proporzioni stabili, bordi alfa puliti, colori/valori leggibili alla dimensione di gioco e pose che cambiano davvero la silhouette. Ammorbidire o sporcare i personaggi per simulare bassa definizione renderebbe meno coerente il mondo attuale.

Il budget di riferimento per **nuovi nemici originali** resta compatto: idle 2–4 pose significative; camminata 5–6; attacco rapido 3 fasi (preparazione, contatto, recupero); attacco pesante 4 fasi se serve una carica distinta; hit 2–3; caduta/rialzata solo le pose necessarie a mostrare peso, suolo e continuità. I numeri non sostituiscono la revisione del movimento: due pose quasi identiche non contano come due fasi utili. Per i protagonisti, le 6 pose di cammino/corsa già selezionate sono un buon nucleo; la personalità e gli attacchi possono richiedere un budget maggiore. Il filmato futuro di Julien sarà utile per controllare il moto, senza bloccare questa produzione.

I **piani non ancora giocabili** di Barbaccia e Pino sono stati allineati a questa decisione: Barbaccia passa da 5 a 3 pose per il colpo rapido e da 6 a 4 per quello pesante; Pino passa da 5 a 3 per il colpo e da 5 a 3 per lo scarto difensivo. Le rispettive durate restano per-frame e il contatto rimane esplicito. Idle, camminata, hit e continuità caduta/rialzata non vengono tagliati in questa fase. Sono budget di produzione, non modifiche ai personaggi già presenti nel gioco.

Barbaccia mantiene una massa visibile prossima al doppio di Merco (1,82–2,24 volte nelle quattro pose candidate, misurata a parità di tela e scala). Va animato con peso e passo corto, senza ingrandimenti fra i frame. Pino resta più snello e più rapido, con anticipo e recupero brevi. La prossima verifica artistica concreta è produrre le **fasi mancanti della camminata di Barbaccia** con appoggi alternati chiaramente diversi, correggere la frangia cromatica e controllare il ciclo su M01 prima di disegnare il pacchetto completo di colpi e reazioni. L'esperimento di quattro passi quasi duplicati è stato scartato.

Questa analisi non aggiunge sprite MUGEN al runtime né modifica le ondate. Le pose finali devono essere opere originali basate sui master approvati di Palermo Streets.
