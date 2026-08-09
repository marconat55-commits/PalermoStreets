# Character animation contract

This contract is mandatory for every new or replaced character pack.

## Raster and pivot

- Every runtime frame is a transparent RGBA PNG on a fixed 640x420 canvas.
- The world position is the actor's feet. Alpha bounds and foot offsets come from `public/data/generated/frame_meta.json`.
- Visible pixels must keep a safety margin from the top and horizontal canvas edges. Hard horizontal crop lines are rejected.
- Frames may use only uniform visual scale. Independent X/Y stretching is forbidden.

## Player clip set

Player profiles must provide: `idle`, `walk`, `walk_up`, `walk_down`, `run`, `brake`, `jump`, `land`, `air_attack`, `air_punch`, `punch_left`, `punch_right`, `combo_finisher`, `kick_front`, `kick_right`, `kick_finisher`, `block`, `dodge`, `grab`, `grab_strike`, `throw`, `super`, `hit`, `knockdown`, `getup` and `dead`.

Enemies may keep a smaller attack set, but must provide locomotion, hit, knockdown, getup and dead reactions. Enemy attack count remains profile-driven.

## Timing and continuity

- `durations` is authoritative per frame; combat windows are never inferred from rendering speed.
- `visual_scales` is optional. One value applies to the whole clip; otherwise its length must equal `frames`.
- Loop clips must close without a large centroid jump.
- One-shot moves must include a compatible recovery pose before returning to idle.
- The final `knockdown` frame and first `getup` frame must be pixel-identical. Their visual scales must also match.
- Contact frame indexes must exist inside the clip and remain stable after any art replacement.
- `frame_blend` may be used only as a short 0-60 ms transition between distinct authored poses; it must never hide duplicated PNGs or replace missing key poses.

## Runtime controller

`Animator` is the authoritative controller. It preserves locomotion phase, supports fitted attack durations and supplies a short pose blend when clips change. `Actor` applies the current frame pivot/scale and clamps the full visible pose to the viewport.

Do not replace this system with uniform-speed `AnimatedSprite`. Spine is appropriate only for a future character authored from an actual skeletal rig; it is not a repair tool for painted PNG sequences.

## Required checks

Run `npm run check`. It covers data/atlas integrity, PNG canvas and alpha bounds, hard crops, fall/getup continuity, scale curves, unit tests, TypeScript and the production build.
