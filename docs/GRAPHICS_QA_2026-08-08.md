# Graphics and animation QA — 2026-08-08

## Inputs reviewed

- User capture: `C:\Users\Utente\Videos\2026-08-08 00-24-21.mkv` (63.37 s).
- User capture: `C:\Users\Utente\Videos\2026-08-08 11-04-05.mkv` (146.70 s).
- Marco identity master: `C:\Users\Utente\Documents\Marktest\Marco Master.jpg`.
- Arcade feel reference: [Cadillacs And Dinosaurs — full gameplay](https://www.youtube.com/watch?v=CfS-H35I-g4).

## Corrections

- Enlarged only Talebano and Piero horizontal ground/early get-up frames so their perceived body mass no longer shrinks on impact.
- Replaced Marco's 6-frame side walk with an ordered 8-frame contact/recoil/pass/high cycle.
- Replaced Marco's 5-frame compact jump with 8 readable phases and full head separation.
- Rebuilt Marco's normal idle and added four data-driven personality variants: shoulder dust/smile, cheeky waistband adjustment, revolver check and hand-rolled cigarette flick.
- Added a modern arcade character-select scene with Marco's approved portrait and three intentionally empty roster slots.
- Added explicit vertical launch values to knockdown attacks, airborne shadow compression and landing dust/shake feedback.
- Removed Marco's genuinely cropped air-attack and left-punch frames from runtime sequences, rebuilt safe recovery endpoints and regenerated the atlas losslessly.
- Added a short pose blend between animation states so a finished attack, dodge or reaction reconnects cleanly without changing gameplay timing.
- Added uniform per-frame mass curves to Marco, Talebano and Piero fall/getup; the fall-to-getup handoff is now pixel- and scale-continuous.
- Changed airborne horizontal damping to a low-drag arcade launch: finishers now travel roughly 230-300 logical pixels before landing.
- Clamped actors by the visible alpha bounds of the current pose rather than by feet alone, preventing heads, fists and horizontal bodies from leaving the screen.
- Added `validate:art` and regression tests for animation blends, visual bounds and knockback distance.
- Rebuilt title and character select around `assets/ui/title/palermo_night.png`, depicting Castello Utveggio on Monte Pellegrino.

## Technical decision

PixiJS remains the renderer. The project custom `Animator` is retained instead of `AnimatedSprite`, Spine or DragonBones because the production art is frame-based PNG, with variable timings, per-frame feet pivots, contact frames and no skeletal rig source.

The upgraded controller is intentionally a fighting-game state machine above PixiJS: it owns clip selection, phase preservation, per-frame duration/scale, recovery endpoints and a very short visual blend. Gameplay windows and hit contacts remain data-driven and deterministic.

## Locked invariants

- Runtime canvas: 640×420 RGBA.
- Feet baseline: y=400.
- No runtime body stretching.
- Barbetta art untouched.
- `character_factory/` excluded from the commit.
