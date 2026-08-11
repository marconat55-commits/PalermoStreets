# Marco Core Arcade

## Goal

Marco follows a classic Capcom belt-scroller policy: strong key poses, variable frame timing and stable feet/facing instead of separate artwork for every movement vector.

## Runtime policy

- `walk` is used for horizontal, vertical and diagonal walking.
- `run` is used for horizontal, vertical and diagonal running.
- Pure vertical movement preserves the last horizontal combat facing.
- Diagonal movement changes facing only from the horizontal component.
- Dodge is not a gameplay state and its four authored PNGs are archived.
- `walk_up`, `walk_down`, `run_up` and `run_down` are archived and are not loaded.
- No source PNG has been deleted or rewritten.

## Frame budget

| Clip | Runtime | Authored source |
|---|---:|---:|
| idle | 4 | 8 |
| idle_variant_1 | 8 | 12 |
| walk | 8 | 8 |
| run | 8 | 8 |
| brake | 4 | 6 |
| jump | 8 | 10 |
| land | 4 | 6 |
| block | 3 | 4 |
| grab | 3 | 4 |
| grab_strike | 4 | 6 |
| throw | 6 | 8 |
| hit | 3 | 4 |

Attack combos, aerial attacks, super, knockdown and get-up keep their authored coverage because impact and continuity are more important there than a numerical reduction.

The profile contains 143 logical runtime frame entries instead of 192. `dead` intentionally reuses the eight `knockdown` source images, so the number of unique active PNGs is lower still.

## Timing principles

- Locomotion uses the complete eight-pose authored cycle with playback rate coupled to actual movement speed.
- Attack anticipation, contact and recovery retain independent authored timings.
- Hit-stop and enemy knockback communicate impact; extra duplicate poses must not replace timing.
- One-shot clips end in a compatible recovery pose.
- Feet remain anchored through `frame_meta.json`; whole-body X/Y stretching is forbidden.

## Runtime scale correction

- `jump` and `air_attack` stay at scale `1.0`, so Marco no longer shrinks in the air.
- `brake` uses the conservative progression `0.96, 0.96, 0.93, 0.98` to connect the running silhouette to guard without the previous mass jump.
- No PNG was rewritten. Knockdown, get-up and death remain locked to scale `1.0`.

## Preservation

`source_frames` records the complete authored folder. `frame_sequence` selects the runtime subset without copying or deleting PNGs. Entire clips removed from gameplay live in `archived_animations`; validation still checks their files, metadata and atlas entries, while `AssetCatalog` does not load them.
