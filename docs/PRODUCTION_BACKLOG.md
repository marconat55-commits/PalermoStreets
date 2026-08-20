# Production backlog

This file keeps stage and character production separate so an approved runtime change never silently replaces character art.

## Stage modules

- M01: `final_v1` approval candidate built from the existing 3840×1080 master. Three camera proofs are required before runtime integration.
- Module unit: 2560×720 at runtime (two 1280×720 viewports). Longer stages are assembled by sequencing modules, not by loading one unbounded texture.
- Every module owns its walk band, camera bounds, encounter triggers and optional FAR/MAIN/FOREGROUND layers.
- Preload policy: current module plus next module. This is the template for later stages.

## Character art queue

- Merco HQ: expand the current four-hit combo to eight readable frames; preserve the approved identity and scale; finish with a sweeping kick that launches the target.
- Merco HQ: complete super move, hit reactions, knockdown/get-up and remaining transitions using the approved master and the Ken motion reference already mapped in the project.
- Talebano: retain the approved heavy scale and walk; only add missing reactions after the M01 gate.
- Enemy templates: Haggar-derived two-attack archetype and AIori-derived one-attack-plus-dodge archetype remain queued.

No batch generation is allowed. Each motion passes keyframe identity, anatomy, baseline and scale gates before intermediate frames are produced.
