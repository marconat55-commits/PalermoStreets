# Graphics and animation QA — 2026-08-08

## Inputs reviewed

- User capture: `C:\Users\Utente\Videos\2026-08-08 00-24-21.mkv` (63.37 s).
- Marco identity master: `C:\Users\Utente\Documents\Marktest\Marco Master.jpg`.
- Arcade feel reference: [Cadillacs And Dinosaurs — full gameplay](https://www.youtube.com/watch?v=CfS-H35I-g4).

## Corrections

- Enlarged only Talebano and Piero horizontal ground/early get-up frames so their perceived body mass no longer shrinks on impact.
- Replaced Marco's 6-frame side walk with an ordered 8-frame contact/recoil/pass/high cycle.
- Replaced Marco's 5-frame compact jump with 8 readable phases and full head separation.
- Rebuilt Marco's normal idle and added four data-driven personality variants: shoulder dust/smile, cheeky waistband adjustment, revolver check and hand-rolled cigarette flick.
- Added a modern arcade character-select scene with Marco's approved portrait and three intentionally empty roster slots.
- Added explicit vertical launch values to knockdown attacks, airborne shadow compression and landing dust/shake feedback.

## Technical decision

PixiJS remains the renderer. The project custom `Animator` is retained instead of `AnimatedSprite`, Spine or DragonBones because the production art is frame-based PNG, with variable timings, per-frame feet pivots, contact frames and no skeletal rig source.

## Locked invariants

- Runtime canvas: 640×420 RGBA.
- Feet baseline: y=400.
- No runtime body stretching.
- Barbetta art untouched.
- `character_factory/` excluded from the commit.
