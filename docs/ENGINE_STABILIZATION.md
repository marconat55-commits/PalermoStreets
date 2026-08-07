# PixiJS engine stabilization

Scope: runtime/build corrections after the approved v0.7.8 character quality pass. No approved source PNG was edited, rescaled or deleted.

## Changes

- Locomotion uses `walk`, `walk_up` and `walk_down` from the movement vector, with directional hysteresis to prevent diagonal flicker.
- The normalized stride phase is preserved when switching between locomotion directions.
- Locomotion playback rate is derived from actual movement speed divided by the clip reference speed. Movement values and positions are unchanged.
- Attack clips are fitted to their existing startup/active/recovery window. Combat timing, hitboxes, damage and cooldowns are unchanged.
- Character profiles define baked scale, foot baseline, stride reference speed and contact-frame metadata.
- Duplicate Marco animation aliases were removed; canonical clip names remain unchanged.
- Runtime `visualHeight` scaling hooks that did not affect rendering were removed. Scale remains baked into the approved 640x420 frames.
- Lossless trimmed texture atlases reduce decoded character texture area while retaining the original 640x420 logical frame and pivot.
- Character banks are loaded when the stage starts, rather than during the title screen.
- The player and enemy defaults now come from `characters/index.json`; they are no longer hard-coded in the scene.
- Soft ground shadows were added as engine graphics; enemy target rings remain intact.
- Data validation now checks profiles, durations, contact frames, pivots, atlases, metadata, orphan PNGs, stage references and spawns.
- Unit tests cover direction mapping, hysteresis, stride phase, playback rate and attack-duration fitting.

## Commands

```powershell
npm.cmd run check
```

This runs data validation, unit tests, TypeScript checking and the production build.

Atlases can be regenerated losslessly with:

```powershell
python scripts/build-character-atlases.py .
```

The generator verifies every cropped atlas cell pixel-for-pixel against its approved source PNG before writing the manifest.

## Arcade presentation and loading pass

- Rebuilt the title screen with an original Palermo Streets arcade composition, modern display typography, high-contrast cyan/orange accents and an in-scene loading panel.
- The title remains visible after Enter until the first module, Marco and the first-wave characters are ready; the empty black loading gap is removed.
- Remaining module backgrounds and characters preload sequentially after gameplay becomes visible. A module transition waits safely if its assets are not ready yet.
- Added a timed `STAGE 1 — THE ZEN` presentation card before player control and wave progression begin.
- Added a conservative runtime-only width correction to the final `getup` frame so its transition to `idle` does not visibly change body scale. Approved PNG files remain untouched; Barbetta remains excluded.
