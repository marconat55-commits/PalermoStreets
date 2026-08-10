# Stage 1 — layered scrolling backgrounds

The Zen now uses the five authored PNG files supplied in `PalermoStreets_Stage1_TheZen_Pack_v2`.

- `ZEN_FAR_SKYLINE.png`: reusable far layer, parallax `0.22`.
- `ZEN_LONG_01_STRADA_CORTILE.png`: M01 main layer.
- `ZEN_LONG_02_PORTICATO_GARAGE.png`: M02 main layer.
- `ZEN_LONG_03_CAMPETTO.png`: M03 main layer.
- `ZEN_LONG_04_INGRESSO_PALAZZO.png`: M04 main layer.

Each long master is displayed proportionally at `2560x720`, exactly two logical viewports. The camera follows the player with a 40–60% horizontal dead zone and smooth damping. Actors, effects, shadows and enemy HUD remain in world space; the gameplay HUD remains screen-fixed.

Every module declares `playfield_y`, the homogeneous feet band where actors may walk. Street modules currently use `565–684`; this prevents actors from walking over buildings while preserving depth movement on the road and pavement.

The supplied long main PNG files are RGB and fully opaque. They therefore cover `ZEN_FAR_SKYLINE.png`: the far layer is loaded and its camera transform is correct, but its parallax cannot be visible through an opaque main. A production export must separate the skyline/sky from the architecture and make the sky area of each main layer transparent.

`background` is retained as a backwards-compatible fallback. New modules can declare `background_layers` entries with `src`, `parallax`, `plane`, position and display size. Waves may declare `trigger_x` so encounters unlock at authored world positions.
