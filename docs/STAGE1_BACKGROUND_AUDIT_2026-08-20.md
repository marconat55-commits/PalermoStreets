# Stage 1 background audit — 2026-08-20

## Outcome

- M02 is the only approved production module. It has a deterministic master/runtime manifest, native 2560x720 output, horizon Y 300, camera proofs at X 0/640/1280 and WALK 600-705.
- M01, M03 and M04 remain playable placeholders. Their 2560x720 MAIN files are enlarged at runtime to 2944x828 and offset by -108; this is an intentional legacy calibration, not a production-safe authoring contract.
- A global resize is rejected because it would break the approved M02 geometry. Each placeholder must be rebuilt from a greybox using the same contract as M02.
- The existing PNG files remain untouched and stay available as visual references/fallbacks.

## Runtime QA added

- Every module declares `art_status` and the canonical 290 px reference actor height.
- F3 now renders the actual sampled `walk_top` / `walk_bottom` polygon instead of a misleading rectangular envelope.
- Approved modules may expose `horizon_y`; F3 draws it as a magenta calibration line.

## Rebuild order

1. M01 street/courtyard greybox and three camera proofs.
2. M03 campetto greybox, preserving its intentionally deeper combat area.
3. M04 entrance/pre-boss greybox.
4. Author genuine FAR/MAIN/FOREGROUND exports only after each greybox is approved.

No new background image should enter runtime without: 2560x720 output, aspect-safe rendering, 290 px actor reference, explicit horizon, WALK polygon, three camera proofs and a deterministic manifest.
