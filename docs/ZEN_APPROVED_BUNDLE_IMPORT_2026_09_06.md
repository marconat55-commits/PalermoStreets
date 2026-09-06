# Stage 1 Zen — approved bundle import (2026-09-06)

## Imported runtime assets

- Bidone: intact, damaged and broken states.
- Sacco nero: intact, broken and debris states.
- State transitions are data-driven through optional `damaged_asset`, `broken_asset` and `debris_asset` fields.

## Character source material

The approved masters for Barbaccia, Pino Facci Lorda, Pino U Pizzettu, Sciaron, U Scafazzatu and U Tignusu are archived under `art_source/stage1_zen/approved_bundle_2026_09_06`. They are source references only and are not registered as playable/runtime actors until complete animation packs pass the character pipeline.

`U_BARBETTA` is intentionally excluded from the import. Sciaron has no dedicated portrait in the supplied bundle.

## Excluded asset

`ITEM_BIDONE_DEBRIS.png` is retained only in the original source archive. It is not used at runtime because the supplied image contains a baked checkerboard background instead of transparency.

## Processing

Green backgrounds were removed deterministically from derived transparent copies. Original files remain unchanged. Runtime item derivatives were reduced to a maximum dimension of 512 px while preserving alpha.

## Verification

- `npm.cmd run check`
- 97 tests passed
- 557 art frames validated
- TypeScript check passed
- Production build and production asset validation passed
- Manual launch verified: title, character selection and M01 load without browser console warnings/errors
