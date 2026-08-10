# Stage 1 — layered scrolling backgrounds

The Zen now uses the five authored PNG files supplied in `PalermoStreets_Stage1_TheZen_Pack_v2`.

- `ZEN_FAR_SKYLINE.png`: reusable far layer, parallax `0.22`.
- `ZEN_LONG_01_STRADA_CORTILE.png`: M01 main layer.
- `ZEN_LONG_02_PORTICATO_GARAGE.png`: M02 main layer.
- `ZEN_LONG_03_CAMPETTO.png`: M03 main layer.
- `ZEN_LONG_04_INGRESSO_PALAZZO.png`: M04 main layer.

Each long master is displayed proportionally at `2560x720`, exactly two logical viewports. The camera follows the player with a 40–60% horizontal dead zone and smooth damping. Actors, effects, shadows and enemy HUD remain in world space; the gameplay HUD remains screen-fixed.

Every module declares its own `playfield_y`, the homogeneous feet band where actors may walk. The band follows the visible road/courtyard of that specific composition: M01 `604–684`, M02 `578–684`, M03 `548–684`, M04 `592–684`. Actors therefore cannot enter buildings, walls or skyline, while the campetto intentionally offers more depth than the street and entrance modules.

Because the delivered MAIN images are opaque RGB, each FAR layer also declares conservative `reveal_polygons` in main-world coordinates. These masks expose the Palermo skyline only through authored open-sky areas and move with the MAIN plane, while the skyline behind them keeps its slower `0.22` parallax. No stage bitmap is regenerated or stretched.

The supplied long MAIN files remain RGB and fully opaque. For this demo the runtime masks above provide visible parallax without touching those masters. A later production-art export may replace the masks with MAIN images whose authored sky is transparent; the data format remains compatible with that upgrade.

`background` is retained as a backwards-compatible fallback. New modules can declare `background_layers` entries with `src`, `parallax`, `plane`, position and display size. Waves may declare `trigger_x` so encounters unlock at authored world positions.
