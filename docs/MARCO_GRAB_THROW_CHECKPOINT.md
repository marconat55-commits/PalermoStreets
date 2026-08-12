# Marco grab / strike / throw checkpoint

Checkpoint published before the image-generation budget limit.

## Approved visual direction

- Marco identity remains locked to `art_source/characters/marco/MARCO_MASTER_APPROVED.png`.
- The grab acquisition and stable clinch in the 12-pose sheet are approved.
- The close knee strike and return to clinch in the 12-pose sheet are approved.
- `throw_load_keyframe_chroma.png` is the approved throw-load keyframe.
- `throw_release_keyframe_chroma.png` is the approved low release/follow-through keyframe.

## Important exclusion

The third cell of the last row in `grab_throw_12_sheet_*` must not be integrated: it reads as an arm reach rather than a throw release. Replace that cell with the separately approved `throw_release_keyframe_*` candidate when work resumes.

## Saved sources

All sources are under:

`art_source/characters/marco/candidates/grab_throw_identity_lock_v1/`

The folder contains the original chroma sources plus prepared alpha versions of the 12-pose sheet and approved release keyframe.

## Runtime status

No runtime PNG, atlas, metadata, animation timing or gameplay data was changed in this checkpoint. The existing game remains the last fully tested build. Resume by splitting and normalizing candidates to 640x420, baseline 400 and baked scale 1.0; build a review sheet; integrate only after the candidate and full project validation gates pass.
