# Cadillacs-style compact animation audit — 2026-09-18

## Reference reviewed

- *Cadillacs and Dinosaurs Longplay (Arcade) [4K]*: https://www.youtube.com/watch?v=6URmVK9knUQ
- Capcom arcade release, 1993; two-button belt-scroller with eight-way movement, dash, jump attacks, grabs and character-specific specials.

The reference was reviewed at normal playback and across movement/combat passages. Its readability comes from strong silhouettes and explicit anticipation, contact and recovery poses. Walk and run repeat a short cadence; attacks spend visual time on the contact pose instead of requiring dense interpolation. The screen remains readable with several large actors because actions have distinct timing and spacing.

## Palermo Streets decision

The scalable runtime target is now:

| Motion | Runtime poses | Rule |
|---|---:|---|
| walk | 6 | contact, down and pass for each leg |
| run | 6 | contact, drive and flight for each leg |
| brake | 3 | exit, planted compression, guard |
| jump | 5–6 | launch, rise/compression, apex, descent, landing-ready |
| land | 2–3 | contact, compression, return |
| basic attack | 3–6 | anticipation, strike/contact, recovery |
| hit | 2–4 | impact plus recovery |
| knockdown/getup | 5–8 | continuity frame remains mandatory |

Source artwork is retained. Profiles use `source_frames` plus a smaller `frame_sequence`, so rejected in-betweens can be restored without rewriting the runtime or losing the original PNGs.

## First integration

- Marco walk/run: 8 source poses reduced to 6 selected runtime poses.
- Marco brake/land: 4 runtime poses reduced to 3.
- Merco walk: 8 source poses reduced to 6 runtime poses.
- Merco jump: 9 source poses reduced to 6 runtime poses.
- Merco forward jump: 8 source poses reduced to 6 runtime poses.
- Per-frame durations preserve overall motion length and emphasize key poses.

Enemies already follow compact budgets: common enemies keep one readable attack family and share compatible reaction art where approved. New protagonists and enemies must start from these budgets and exceed them only when a move fails silhouette, contact or continuity review.
