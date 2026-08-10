# Background authoring contract

- Logical viewport: `1280x720`.
- Standard scrolling module: `2560x720` (two viewports).
- Walkable feet band for street modules: `Y 565–684`.
- Keep buildings, walls and skyline above `Y 565`; do not place visual pavement outside the walkable band.
- Far layer: opaque skyline/sky, `2560x720`, recommended parallax `0.18–0.25`.
- Main layer: architecture and ground, `2560x720`, parallax `1.0`; the sky region must be transparent when a far layer is present.
- Foreground: small transparent overlays only, with no permanent obstruction of the walkable band.
- Do not bake characters, enemies, weapons or gameplay objects into backgrounds.
- Author enemy entrances and encounter landmarks with world X positions in mind.

The stage validator rejects spawn points outside the module `playfield_y` band and warns when an opaque RGB main would hide an authored far layer.
