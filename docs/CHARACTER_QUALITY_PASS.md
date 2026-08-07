# Character quality pass

This log documents the asset-only character cleanup performed on the PixiJS port while preserving the gameplay, scale and timing of runtime v0.7.8.

## Constraints

- Barbetta is excluded and must remain unchanged.
- Runtime sprite canvases remain 640 × 420 transparent PNG files.
- Existing animation durations, combat data, movement speeds and collision values remain unchanged.
- Generated source sheets and approval material stay under `character_factory/incoming/`; only approved runtime frames are copied into `public/assets/characters/`.

## Talebano quality pack v2

Status: approved, integrated and verified.

- Replaced the 32 existing runtime frames with a coherent, identity-locked set.
- Removed the white gaps between the legs, gray edge strips and chroma-key remnants.
- Added six `walk_up` and six `walk_down` frames for depth movement.
- Kept all v0.7.8 animation durations unchanged.
- Added clip selection that uses directional frames only when the active character bank provides them; characters without those clips continue to use `walk`.
- Rebuilt per-frame bounds metadata and the sprite QA manifest for 44 frames.
- Confirmed zero visible magenta-key pixels across the integrated pack.

Verification:

- Sprite audit: pass (32 required enemy frames).
- Metadata audit: pass (44 total Talebano frames).
- Data validation: pass (4 characters, 7 modules, 152 frame metadata entries).
- TypeScript check: pass.
- Production build: pass.
- Browser runtime smoke test: pass; title screen and gameplay loaded with no console warnings or errors.
- Barbetta: no tracked files modified.

## Piero u Pizzetto quality pack v2

Status: master reference card generated; waiting for visual approval before animation generation and runtime integration.

