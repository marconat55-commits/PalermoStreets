# Combat and world foundation

## Active in this build

- Marco has a three-hit `J` combo with a knockdown finisher.
- `I` remains the standing kick and `L` remains the 50-fury super.
- `K` starts a jump; `J` while airborne starts the aerial kick.
- `Shift` blocks frontal attacks with 18% chip damage.
- `Space` performs an invulnerable directional dodge.
- A second horizontal direction tap inside 260 ms starts the run cycle.
- Releasing all movement after a run plays a dedicated four-frame brake before returning to idle.
- At close range Marco automatically enters a grab while moving into a grabbable enemy. During the hold, `J` performs a knee and `I` performs a knockdown throw.
- The sprite elevation is independent from the actor's world-space feet. Shadows, depth sorting and ground collision therefore remain anchored while jumping.
- Knockdown finishers now launch actors on a readable vertical arc, reduce the ground shadow while airborne and emit a dust/shake landing accent.
- Marco cycles through four character-specific idle gags after sustained inactivity; the controller discovers `idle_variant_N` clips from each future protagonist's animation bank.

## Locked gameplay rules

- Existing v0.7.8 movement speeds, playfield scale, enemy pressure limit, hit-stop, knockdown/get-up and module timing remain the baseline.
- New move timings are profile-driven in `public/data/characters/marco.json`.
- Runtime art remains fixed at 640x420 with the feet pivot at y=400.
- Character scale is baked into the PNGs. Runtime-only horizontal stretching is forbidden because it changes body proportions during get-up.
- Enemy characters do not require a player-sized animation pack. Each enemy profile will declare only one to three attacks and reuse the common locomotion/reaction clips.

## 2–4 player contract (prepared, not enabled)

- Runtime player identity is represented by `PlayerSlotConfig`, with slots 1–4 and keyboard/gamepad ownership.
- Combat affiliation is represented by `CombatTeam`; hit resolution must accept actor collections rather than assuming one permanent player.
- The current `StageScene.player` remains single-player until a second control scheme, HUD layout and join/leave flow are implemented together. This avoids shipping a partial multiplayer mode.
- The intended camera target is the bounding center of living players, clamped so all active players stay inside a configurable leash. Spawn pressure scales by living player count, not merely by adding enemies.

## Scrolling-stage contract (prepared, not enabled)

- A module may declare `world_width` and `camera_bounds`; omitted values preserve the current 1280-wide module exactly.
- A module may declare `ground_profile` samples (`worldX`, `screenYOffset`) for future rises, descents and ramps without baking gameplay state into DOM coordinates.
- Extended backgrounds must be authored at their real world width. They must not be stretched from the current 1280 image.
- Actor positions, exits, wave triggers, pickups and projectiles use world coordinates. Only the render camera applies a viewport offset.
- Before enabling scrolling, `Actor.clampToPlayfield` and stage exits must consume module bounds instead of the current global horizontal limits.
- Camera acceleration, deceleration and dead-zone must follow the player group rather than snapping to the lead fighter; background layers will use independent parallax factors.

## Arcade feel reference

- The target reference is Capcom's *Cadillacs and Dinosaurs*: long readable knockback, airborne enemy silhouettes, emphatic landings, forward momentum and comic crowd control.
- The tone is physical and humorous in the spirit of Bud Spencer and Terence Hill: hit-stop and reactions sell weight without raising normal attack damage unnecessarily.
- Full scrolling, slopes and module-specific jump geometry remain deferred until the Stage 1 modules are rebuilt; the current pass adds the data contract and combat feedback foundation only.

## Weapons and objects contract (prepared, not enabled)

- `WeaponDefinition` supports `melee`, `throwable` and `firearm`, optional ammo/projectile speed, an attack animation and drop-on-hit behavior.
- Weapons remain separate world entities. A character profile references compatible grip/attack clips; it does not duplicate weapon pixels across every base pose.
- Pistols and rifles spawn projectiles; swords use a melee hitbox; bottles and other objects become thrown projectiles after pickup.
- The next implementation unit should introduce `WorldObject`, `Pickup`, `Breakable`, `WeaponInstance` and a pooled `Projectile` system before any weapon PNG pack is produced.

## Recommended build order

1. Manually tune and approve Marco's complete combat feel.
2. Introduce world bounds plus camera and extend one Stage 1 background as the scrolling reference module.
3. Convert combat and HUD ownership from one player to a player collection; enable two local players first.
4. Add the generic object/weapon system with one melee and one throwable test item.
5. Add gamepad join/leave and scale to four local players only after the camera leash and spawn director are stable.
