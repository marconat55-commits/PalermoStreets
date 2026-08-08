# Fluidity and arcade-impact pass — 2026-08-08

Scope: improve responsiveness and comic beat-em-up impact without changing the project renderer, logical scale, stage data, or approved character identity.

## Reference and engine decision

- Motion and impact timing were compared with *Cadillacs and Dinosaurs* arcade gameplay: fast anticipation/contact/recovery, forward attack momentum, long horizontal launches, strong hit-stop and landing feedback.
- PixiJS 8 remains the correct renderer. The previous stiffness came from the action state machine, input windows, root motion, and missing poses—not from a PixiJS limitation.
- A skeletal runtime such as Spine can be evaluated for future characters only after a rig-authoring pipeline exists. Migrating the current painted full-body PNG packs now would not create missing poses and would introduce unnecessary visual risk.

## Gameplay changes

- `J`: three-hit punch combo; in air, dedicated forward aerial punch.
- `I`: three-hit kick combo; in air, aerial kick.
- `K`: jump. A jump started while running preserves horizontal momentum.
- Combo input is buffered during the current attack instead of requiring a narrow late-frame window.
- Grab assist uses a larger, depth-aware acquisition area, front-target priority, and a short snap to the canonical hold distance.
- Heavy finishers, throws, aerial hits, and the super move apply longer launches. Strong launches receive one or two small arcade bounces before the get-up sequence.

## Animation/art changes

- Added `air_punch` (6 frames), including one new key pose derived from Marco's approved master.
- Added `kick_front` (7 frames), including one new first-kick contact pose derived from the same master.
- Added a distinct `kick_finisher` timing profile using the approved high-kick art.
- Jump animation phase is synchronized to the physical parabola after an aerial attack, preventing a restart from frame 1 during descent.
- All four personality idles now last roughly 3–4 seconds and return to the exact approved combat idle endpoint.
- New generated key poses were chroma-key cleaned, fitted to the required 640×420 canvas, aligned to baseline 400, and visually normalized to the existing 286 px contact-pose height.

## Validation contract

- Barbetta art remains untouched.
- No existing approved Marco PNG was resampled or repainted; the pass adds two new master-derived key poses and reuses exact approved frames for transitions.
- Full acceptance remains: data validation, art validation, unit tests, TypeScript strict check, production build, plus manual run/jump/aerial attack/kick-combo/grab/knockdown checks.
