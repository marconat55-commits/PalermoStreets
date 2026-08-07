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
- Do not resize or rewrite source PNG assets unless the task explicitly asks for art processing.
- Preserve full feet/pivot alignment using `public/data/generated/frame_meta.json`.
- All combat ranges/hurtboxes use logical 1280x720 world units, independent of transparent sprite canvas size.
- Keep hit-stop, camera shake, knockdown, get-up, wave progression, enemy labels/health bars and module transitions working after refactors.

## Player controls currently active
- WASD / arrows: movement
- J: three-hit punch combo; aerial attack while jumping; grab strike while holding an enemy
- I: kick
- K: jump
- L: super move (requires 50 fury)
- Shift: frontal block
- Space: directional dodge
- Double-tap left/right: run
- Releasing movement after a run: dedicated brake transition
- P: pause
- F3: debug hitboxes
- F11: fullscreen
- Esc: return to title
- R: restart checkpoint when defeated

## Before declaring a task complete
1. Run `npm run validate:data`.
2. Run `npm run typecheck`.
3. Run `npm run build`.
4. If gameplay changed, run `npm run dev` and manually test at least one wave with Marco, Talebano and Piero.
5. Do not modify Barbetta art unless explicitly requested; it is a temporary boss placeholder.

## Migration reference
The previous Python gameplay code is available under `legacy-reference/python/` for behavioral comparison only. New features should be implemented in `src/`, not in the legacy copy.
