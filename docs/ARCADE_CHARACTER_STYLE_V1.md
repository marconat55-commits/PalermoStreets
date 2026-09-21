# Arcade character style V1

Barbaccia is the first review character for the simplified arcade rendering direction approved on 2026-09-21. The source master and walk sheet live in `art_source/stage1_zen/barbaccia_arcade_v1`; they remain outside runtime until visual approval and a complete combat pack.

The style uses crisp dark contours, clustered cel shading, a restrained warm palette and simplified surface detail. Character identity, clothing and relative body mass remain locked. Runtime preparation keeps the existing 640×420 transparent canvas, feet at Y=400 and uniform scale on both axes.

The six-pose Barbaccia walk currently spans 2.07–2.27 times Merco's visible idle area. The local `?barbacciaWalkPilot` viewer loads these review frames on M01 without registering the character in waves. Space pauses the cycle; the left and right arrow keys inspect individual poses.

Convert other characters gradually only after this pilot is accepted in motion. Each conversion needs one approved guard master before animation production, then a six-pose walk and compact attacks using the budgets in `docs/CADILLACS_CHARACTER_REFERENCE_AUDIT_2026-09-20.md`.
