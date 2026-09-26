# M01 - alloggi per attori ambientali

## Regola di integrazione

Un personaggio di facciata entra nel runtime soltanto dopo che lo stage espone un alloggio completo. L'alloggio deve avere un vano leggibile nel layer MAIN, un anchor misurato nel mondo e un elemento di occlusione nel layer FOREGROUND. La figura animata resta fra MAIN e FOREGROUND, cosi ringhiera e davanzale rimangono davanti al corpo in ogni frame.

Il display corrente ingrandisce uniformemente MAIN, FAR e FOREGROUND di un ulteriore 10% rispetto al master già approvato, con pivot mondo `[1280, 650]`. Posizione e dimensioni dei due attori ambientali seguono la stessa trasformazione; le immagini master e i loro camera proof originali restano invariati. La walkline del gameplay rimane ancorata a Y=650.

## BALCONY_RESIDENT_01

- Stato: `integrated_v1`.
- Destinazione: balcone reale della facciata sinistra, scelto prima di posizionare la figura.
- MAIN: apertura interna vuota e coerente con la luce della stanza.
- FOREGROUND: ringhiera e bordo del balcone su alpha separato.
- Contratto: il pivot coincide con il bordo interno della ringhiera.
- Scala: derivata dall'altezza del vano, senza correzioni arbitrarie nel runtime.
- Prova obbligatoria: dettaglio ravvicinato dei quattro frame e tre camere M01.
- Attore: `m01_signora_balcone`.
- Anchor runtime: `[503, 170]` con ingrandimento uniforme dello sfondo intorno a X=1280, Y=650.
- Layer runtime: MAIN e FOREGROUND condividono parallasse `1.0`, impedendo slittamenti della ringhiera.

## STREET_VENDOR_01

- Stato: `approved`.
- Attore: `m01_venditore_frutta`.
- Anchor runtime: `[1104, 586]` con lo stesso ingrandimento uniforme.
- Non richiede occlusione architettonica.
