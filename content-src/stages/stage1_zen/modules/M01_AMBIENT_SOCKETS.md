# M01 - alloggi per attori ambientali

## Regola di integrazione

Un personaggio di facciata entra nel runtime soltanto dopo che lo stage espone un alloggio completo. L'alloggio deve avere un vano leggibile nel layer MAIN, un anchor misurato nel mondo e un elemento di occlusione nel layer FOREGROUND. La figura animata resta fra MAIN e FOREGROUND, cosi ringhiera e davanzale rimangono davanti al corpo in ogni frame.

## BALCONY_RESIDENT_01

- Stato: `art_required`.
- Destinazione: balcone reale della facciata sinistra, scelto prima di posizionare la figura.
- MAIN: apertura interna vuota e coerente con la luce della stanza.
- FOREGROUND: ringhiera e bordo del balcone su alpha separato.
- Contratto: il pivot coincide con il bordo interno della ringhiera.
- Scala: derivata dall'altezza del vano, senza correzioni arbitrarie nel runtime.
- Prova obbligatoria: dettaglio ravvicinato dei quattro frame e tre camere M01.
- Attore previsto: `m01_signora_balcone`, attualmente disattivato.

## STREET_VENDOR_01

- Stato: `approved`.
- Attore: `m01_venditore_frutta`.
- Anchor runtime: `[1120, 592]`.
- Non richiede occlusione architettonica.
