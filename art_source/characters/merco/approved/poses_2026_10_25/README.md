# Merco — pose fornite il 25 ottobre 2026

`chroma/` conserva i nove PNG originali forniti dall'utente. `alpha/` contiene
le copie trasparenti ottenute con `scripts/remove-green-screen.ps1`.

`scripts/import-merco-poses-2026-10-25.py` genera i fotogrammi 640×420,
allineati con i piedi a Y=400 e con scala incorporata, senza cambiare gli
originali. Le pose alimentano `punch_left`, `punch_right`, `combo_finisher`,
`super` e `brake` nel profilo Merco. La frenata comincia dall'ultimo frame
della corsa già presente nel gioco.

L'ordine dei colpi e la selezione casuale dei nemici restano indipendenti da
questi asset.
