# Zen enemy motion pilot — 2026-09-20

The first two original-enemy drafts are now grounded in the approved character bundle:

| Original enemy | Motion reference | Function | Draft |
|---|---|---|---|
| Barbaccia | Haggar reference | Heavy, deliberate two-attack fighter | `content-src/drafts/characters/barbaccia.content.json` |
| Pino U Pizzettu | AIori reference | Faster one-attack fighter with a short defensive sidestep | `content-src/drafts/characters/pino_u_pizzettu.content.json` |

Their versioned motion blueprints define selected reference poses, original-art frame budgets, per-frame durations and contact frames. The MUGEN PNGs provide motion order and timing only. Neither draft is registered in the runtime or assigned to a wave; final sprites must be newly authored from the approved Palermo Streets masters.

Two identity-preserving ImageGen proof sheets are saved in `art_source/stage1_zen/enemy_motion_pilots_2026_09_20/`. They use the approved 3/4 masters as edit targets: `BARBACCIA_GUARD_WALK_PILOT.png` and `PINO_U_PIZZETTU_GUARD_WALK_PILOT.png`. Both are 2×2 transparent RGBA sheets. They are concept candidates, not approved 640×420 runtime frames. Barbaccia's guard and weight shift remain recognizably on-model; Pino's third cell reads as a straight punch rather than a walking step. Edge cleanup, per-pose scale, feet baseline and contact/recovery continuity need review before any cell can be exported. No generated sheet is loaded by the game.

Both master front and 3/4 views are present. They lock outfit, proportions and identity. The reference packs have only two knockdown frames and AIori has only one hit frame, so those clips cannot simply be copied or retimed. The original packs must create three hit poses and five fall/getup poses, including a pixel-identical fall/getup seam. One-shot attacks must recover to a compatible guard pose, and all 640×420 exports must keep baseline Y=400 and scale 1.0.

Production order: Barbaccia idle → walk → light/heavy contact → hit → fall/getup, then Pino idle → walk → light contact → sidestep → hit → fall/getup. Integrate one complete character only after atlas, metadata, art QA and an M01/M02 manual combat test pass. Wave tuning remains deferred until these enemies are complete.

ImageGen prompts: Barbaccia — preserve the approved bearded heavy fighter, white tank top, black shorts, gold jewelry and sandals while producing guard, compressed guard and two heavy steps in a transparent 2×2 sheet. Pino — preserve the approved blue tracksuit fighter, cross-body bag and white shoes while producing guard, lowered guard and two quick steps in a transparent 2×2 sheet. Built-in ImageGen was used; original masters were not edited.
