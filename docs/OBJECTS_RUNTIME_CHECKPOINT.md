# Stage 1 object runtime checkpoint

- Objects are spawned from optional `ModuleData.items`; no object ID is hardcoded in `Player`.
- The Stage 1 catalogue remains authoritative for asset, type, damage and visual/throw tuning.
- M01 prototype: metal pipe at `(405, 686)` and brick at `(610, 681)`.
- `J` picks up the nearest object, swings a melee object, or throws a throwable object.
- The pipe uses the existing attack pose temporarily; dedicated hand/weapon animation remains a later art gate.
- The brick has an arcade knockdown and becomes spent on impact or landing.
- Existing character PNGs and source masters are unchanged.
