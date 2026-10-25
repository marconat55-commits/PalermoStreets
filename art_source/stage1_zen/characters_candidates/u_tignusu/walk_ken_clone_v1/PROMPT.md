# U Tignusu — Ken walk clone candidate cycle

## Status

- Frames `01` through `08` are candidate art only.
- Nothing in this folder is integrated into the runtime animation.
- Each frame uses the matching numbered Ken walk pose from
  `public/assets/characters/ken_ref_anim/walk/`.
- The matching high-resolution Merco clone in
  `art_source/characters/merco_arcade/approved/hq_ken_clone_v2/walk/`
  is the secondary reference for the three-quarter pose and limb placement.
- `art_source/stage1_zen/characters_master/transparent/U_TIGNUSU_MASTER.png`
  is the authoritative identity, costume, body-mass and tattoo reference.

## Candidate files

- `U_TIGNUSU_WALK_KEN_01_CANDIDATE.png`
- `U_TIGNUSU_WALK_KEN_02_CANDIDATE.png`
- `U_TIGNUSU_WALK_KEN_03_CANDIDATE.png`
- `U_TIGNUSU_WALK_KEN_04_CANDIDATE.png`
- `U_TIGNUSU_WALK_KEN_05_CANDIDATE.png`
- `U_TIGNUSU_WALK_KEN_06_CANDIDATE.png`
- `U_TIGNUSU_WALK_KEN_07_CANDIDATE.png`
- `U_TIGNUSU_WALK_KEN_08_CANDIDATE.png`

## Review files

- `U_TIGNUSU_WALK_KEN_01_08_CONTACT_SHEET.png`
- `U_TIGNUSU_WALK_KEN_01_08_PREVIEW.gif`

## Pose-transfer contract

Render U Tignusu in the exact body pose of the matching numbered Ken walk
frame. Treat this as strict pose transfer, not a new interpretation. Match
facing direction, head direction, torso lean and height, pelvis height and
rotation, shoulder placement, both elbow bends, both fist positions,
forward/rear leg identity, both knee bends, stride width and planted/lifted
foot roles. The complete thighs, knees, shins, ankles and shoes must remain
visible and anatomically connected. Do not mirror or average the numbered
pose with the standing master pose.

Keep U Tignusu exactly recognizable: bald head, full dark beard, heavy
muscular build with broad shoulders and large belly, open white dress shirt
with rolled sleeves, gold chain and bracelets, black trousers with black belt
and gold buckle, black leather loafers, and the same permanent tattoos on the
same anatomical sides. Preserve the approved painted graphic-novel arcade
style.

Output one isolated full-body character on a genuinely transparent
background. No floor, shadow, glow, scenery, text, labels, extra limbs,
missing limbs, cropped body parts, weapons or additional objects.

## Approval gate

Before runtime integration, review the animated preview for alternating limb
roles, foot sliding, perceived body-mass consistency and tattoo/accessory
continuity. Approved frames must then be normalized onto the fixed `640x420`
runtime canvas without rewriting these source candidates.
