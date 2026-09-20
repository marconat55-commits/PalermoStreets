# Zen enemy motion pilot — 2026-09-20

The first two original-enemy drafts are now grounded in the approved character bundle:

| Original enemy | Motion reference | Function | Draft |
|---|---|---|---|
| Barbaccia | Haggar reference | Heavy, deliberate two-attack fighter | `content-src/drafts/characters/barbaccia.content.json` |
| Pino U Pizzettu | AIori reference | Faster one-attack fighter with a short defensive sidestep | `content-src/drafts/characters/pino_u_pizzettu.content.json` |

Their versioned motion blueprints define selected reference poses, original-art frame budgets, per-frame durations and contact frames. The MUGEN PNGs provide motion order and timing only. Neither draft is registered in the runtime or assigned to a wave; final sprites must be newly authored from the approved Palermo Streets masters.

Two identity-preserving ImageGen proof sheets are saved in `art_source/stage1_zen/enemy_motion_pilots_2026_09_20/`. They use the approved 3/4 masters as edit targets. Barbaccia's `BARBACCIA_GUARD_WALK_PILOT.png` keeps a recognizable heavy guard and weight shift. Pino's initial `PINO_U_PIZZETTU_GUARD_WALK_PILOT.png` third cell read as a straight punch; the versioned `PINO_U_PIZZETTU_GUARD_WALK_PILOT_V2.png` replaces it with a guarded forward step. The original sheet remains as an audit reference. All are 2×2 transparent RGBA concept candidates, not approved 640×420 runtime frames.

Visual review confirms Pino V2's third pose now reads as travel rather than attack. A pixel-bound check shows the two lower-cell foot extents differ by eight pixels in each sheet (Barbaccia 618/626, Pino V2 596/604, measured within the lower row); both also have colored edge fringes and stray low-alpha pixels. These sheets therefore cannot be sliced directly into runtime sprites. Each pose still needs individually cleaned alpha, uniform perceived scale and feet aligned at Y=400 on a 640×420 canvas. No generated sheet is loaded by the game.

Barbaccia now has four versioned frame candidates in `barbaccia_frame_candidates_v1/`: `guard_open`, `guard_closed`, `walk_contact` and `walk_pass`. The reproducible preparation script `scripts/prepare-enemy-pilot-frames.py` splits the proof sheet, removes stray alpha under 16, applies one common scale and places every visible foot bottom at Y=400 on a 640×420 transparent canvas. The longest pose is 318 px tall; the compressed guard remains 285 px tall by design. These are **art-source candidates only**. Visual QA found the identity and anatomy coherent, but faint colored fringe remains around some outer edges; two walking poses are insufficient for the six-pose locomotion target. Do not import or assign Barbaccia to waves until the complete clip set and continuity gates pass.

Both master front and 3/4 views are present. They lock outfit, proportions and identity. The reference packs have only two knockdown frames and AIori has only one hit frame, so those clips cannot simply be copied or retimed. The original packs must create three hit poses and five fall/getup poses, including a pixel-identical fall/getup seam. One-shot attacks must recover to a compatible guard pose, and all 640×420 exports must keep baseline Y=400 and scale 1.0.

Production order: Barbaccia idle → walk → light/heavy contact → hit → fall/getup, then Pino idle → walk → light contact → sidestep → hit → fall/getup. Integrate one complete character only after atlas, metadata, art QA and an M01/M02 manual combat test pass. Wave tuning remains deferred until these enemies are complete.

ImageGen prompts: Barbaccia — preserve the approved bearded heavy fighter, white tank top, black shorts, gold jewelry and sandals while producing guard, compressed guard and two heavy steps in a transparent 2×2 sheet. Pino — preserve the approved blue tracksuit fighter, cross-body bag and white shoes while producing guard, lowered guard and two quick steps in a transparent 2×2 sheet. Built-in ImageGen was used; original masters were not edited.
