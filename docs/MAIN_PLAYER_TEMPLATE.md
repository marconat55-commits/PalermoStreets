# Main player animation template

`public/data/character_templates/main_player_v1.json` is the production contract shared by every main playable character.

## Reuse for the next protagonist

1. Create the identity/master sheet and lock face, body proportions, outfit and accessories.
2. Reproduce the phase names in the template, not Marco's personality or exact poses.
3. Export every frame as RGBA `640x420`, with feet on baseline `y=400` and uniform baked scale.
4. Add the profile field `factory.animation_template` pointing to `data/character_templates/main_player_v1.json`.
5. Generate frame metadata and the texture atlas, then run `npm run check` before registration in `characters/index.json`.

The template makes controls, state transitions, locomotion cadence and QA reusable. Character-specific identity, damage, speed, stride and personality idle art remain data-driven.

The locomotion baseline includes a dedicated `land` recovery clip and optional short `frame_blend` values. These blends only soften transitions between already distinct approved poses; they do not replace authored in-betweens.

## Mandatory art gate

The validator rejects:

- opaque horizontal cuts through shoes or feet;
- grounded frames outside the shared baseline;
- upright frames whose rendered height drifts more than the template tolerance;
- repeated PNG poses used as fake in-betweens;
- broken loop continuity or non-uniform runtime scale.

Long holds must use `durations`; they must never be implemented by copying the same PNG several times.
