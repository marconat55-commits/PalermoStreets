# Graphics QA — 2026-08-07

Reference video: `C:/Users/Utente/Videos/2026-08-07 22-43-07.mkv`.

## Corrections applied

- Removed the runtime-only horizontal stretch on the last get-up frame.
- Rebuilt the final get-up frame of Marco, Talebano and Piero from each character's exact canonical idle pixels.
- Reordered Marco's middle get-up poses into floor → knee → crouch → guard order.
- Reduced inconsistent intermediate fall/get-up poses while preserving the 640x420 canvas and y=400 feet baseline.
- Reduced Marco's generated run and jump art to match the head/body scale of the approved idle pack.
- Replaced Marco's dodge with a coherent anticipation → low evade → recovery sequence.
- Replaced Marco's super with eight scale-locked frames; flame no longer determines body scale.
- Added a four-frame run brake ending on the exact idle pixels.

## Invariants

- Gameplay speeds, damage, hit-stop and attack windows remain unchanged.
- All corrected frames are transparent 640x420 PNGs.
- Every corrected grounded frame has content bottom y=400.
- Source generation used Marco's approved master identity; runtime files were accepted only after alpha, component and contact-sheet QA.
