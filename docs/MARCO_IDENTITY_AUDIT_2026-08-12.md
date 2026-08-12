# Marco identity audit — 2026-08-12

Canonical reference: `public/assets/characters/marco_anim/idle/01.png`.

The runtime clips `jump`, `super`, `grab`, `grab_strike` and `throw` require a human identity gate before any replacement PNG is integrated. The review sheets repeat the canonical guard next to every active frame so that head size, face, moustache, hair, skin rendering, costume and palette can be judged without relying on canvas/scale tests.

Observed issues in the current pack:

- `jump`: head size and facial rendering drift during crouch and aerial phases.
- `super`: mixed pose batch; face, hair and rendering detail do not remain consistent with guard.
- `grab`: the pose does not communicate stable physical contact with the target.
- `grab_strike`: head silhouette and facial detail diverge from the canonical guard.
- `throw`: several frames use a different facial treatment and an unclear contact/release arc.

No frame is automatically rejected by this document. Approval or rejection is recorded only after visual review of the generated sheets under `production-preview/character_review/marco/`.
