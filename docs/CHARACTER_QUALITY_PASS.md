# Character quality pass

This log documents the asset-only character cleanup performed on the PixiJS port while preserving the gameplay, scale and timing of runtime v0.7.8.

## Constraints

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


## Marco quality pack v2

Status: approved, integrated and verified.

- Replaced all 50 existing runtime frames with the face-locked pack approved from the original Marco master.
- Added six `walk_up` and six `walk_down` frames for complete forward/back depth movement.
- Kept the 290 px gameplay scale, movement speeds, combat data and every v0.7.8 animation duration unchanged.
- Removed gray divider strips, detached neighbouring-cell fragments, white gaps, isolated light fringe pixels and chroma-key remnants.
- Regenerated the six-frame Super source in a wider 2 Ã— 3 layout so fists, shoes, sash and fire effects remain fully inside each frame.
- Added player-side directional clip selection only when `walk_up`/`walk_down` exist; the standard `walk` fallback remains available.
- Rebuilt per-frame bounds metadata and the sprite QA manifest for 62 frames.
- Confirmed zero suspicious magenta pixels, zero detached strips and fully transparent runtime canvases.

Verification:

- Sprite audit: pass (50 required player frames).
- Metadata audit: pass (62 total Marco frames).
- Character runtime asset audit: pass (176 referenced PNG files, zero missing and zero unused).
- Data validation: pass (4 characters, 7 modules, 176 frame metadata entries).
- TypeScript check: pass.
- Production build: pass.
- Browser runtime test: pass; Marco and Talebano completed the two waves of the first area, and Marco's fall/get-up and Super rendered without warnings or errors.
- PNG hash guard: 50 Marco files changed, 12 Marco files added, zero deleted, zero changes outside `marco_anim`.
