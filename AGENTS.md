# Palermo Streets — Codex project rules

This repository is the PixiJS/TypeScript migration of the Python + pygame-ce Palermo Streets prototype v0.7.8.

## Stack
- PixiJS 8.19.0 only. Use PixiJS v8 APIs; never write v7 patterns such as constructor options on `new Application(...)` or `app.view`.
- TypeScript in strict mode.
- Vite 8.
- Logical game resolution: 1280x720.
- Runtime sprites are transparent PNG files on fixed 640x420 canvases.
- World positions represent the actor's feet on the playfield.

## Architecture rules
- Rendering belongs in PixiJS display objects; gameplay state must not depend on DOM coordinates.
- Keep characters data-driven through `public/data/characters/*.json`.
- Keep stage/waves data-driven through `public/data/stage1_zen.json`.
- Do not hard-code a specific enemy into StageScene when a character profile can supply the value.
- Animation timing comes from character profile JSON. Do not silently replace it with uniform AnimatedSprite speed.
- Per-frame `visual_scales` may correct perceived mass between painted poses, but must stay uniform on both axes; never stretch a body horizontally or vertically. `knockdown`, `getup` and `dead` are always locked to runtime scale `1.0`.
- One-shot clips must end on a compatible recovery pose. `knockdown` last frame and `getup` first frame must be pixel-identical and use the same visual scale.
- Personality idle animations use `idle_variant_N` clips discovered by the custom Animator controller; every protagonist may define a different count and timing.
- Do not resize or rewrite source PNG assets unless the task explicitly asks for art processing.
- Preserve full feet/pivot alignment using `public/data/generated/frame_meta.json`.
- All combat ranges/hurtboxes use logical 1280x720 world units, independent of transparent sprite canvas size.
- Keep hit-stop, camera shake, knockdown, get-up, wave progression, enemy labels/health bars and module transitions working after refactors.

## Player controls currently active
- Arrow keys: movement
- J: context-sensitive punch combo; aerial attack while jumping; grab strike while holding an enemy
- K: jump
- Double-tap a direction: normalized horizontal, vertical or diagonal run
- Double-tap forward + J: running attack
- J+K: advancing fire special with temporary invulnerability and multi-enemy knockback; it has no health cost
- Releasing movement after a run: dedicated brake transition
- P: pause
- F3: debug hitboxes
- F11: fullscreen
- Esc: return to title
- R: restart checkpoint when defeated

## Before declaring a task complete
1. Run `npm run validate:data`.
2. Run `npm run validate:art`.
3. Run `npm run test`.
4. Run `npm run typecheck`.
5. Run `npm run build`.
6. If gameplay changed, run `npm run dev` and manually test at least one wave with Marco and Talebano.

The complete sprite contract is documented in `docs/ANIMATION_CONTRACT.md`.

## Migration reference
The previous Python gameplay code is available under `legacy-reference/python/` for behavioral comparison only. New features should be implemented in `src/`, not in the legacy copy.
