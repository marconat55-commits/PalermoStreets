#!/usr/bin/env python3
"""Build Leandra's approved punch and elbow clips without altering source art.

The approved idle and guard plus the approved punch and elbow frames are placed on
runtime canvases. Other clips retain Cammy's motion reference for now.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/characters/cammy_ref_anim"
TARGET = ROOT / "public/assets/characters/leandra_anim"
ART = ROOT / "art_source/characters/leandra"
CANVAS = (640, 420)
FEET = 400
POSE_HEIGHT = 272
PUNCH_FRAMES = {
    "punch_left": [
        "P062_punch_right_06_agent_v1_640x420.png",  # shared guard at start
        "P058_punch_right_02_agent_v1_640x420.png",  # shared transition until P053 is fixed
        "P054_punch_left_03_640x420.png",
        "P058_punch_right_02_agent_v1_640x420.png",  # return through shared transition
        "P062_punch_right_06_agent_v1_640x420.png",
    ],
    "punch_right": [
        "P062_punch_right_06_agent_v1_640x420.png",  # shared guard at start
        "P058_punch_right_02_agent_v1_640x420.png",
        "P059_punch_right_03_agent_v1_640x420.png",
        "P060_punch_right_04_640x420.png",
        "P061_punch_right_05_agent_v1_640x420.png",
        "P062_punch_right_06_agent_v1_640x420.png",
    ],
}
ELBOW_FRAMES = [
    "P063_muay_elbow_01_agent_v1_640x420.png",
    "P064_muay_elbow_02_agent_v1_640x420.png",
    "P064_muay_elbow_02_agent_v1_640x420.png",
    "P063_muay_elbow_01_agent_v1_640x420.png",
    "P062_punch_right_06_agent_v1_640x420.png",
    "P062_punch_right_06_agent_v1_640x420.png",
]


def place_pose(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    visible = alpha.point(lambda value: 255 if value >= 8 else 0).getbbox()
    if visible is None:
        raise ValueError(f"Pose senza soggetto: {source}")
    crop = image.crop(visible)
    width = round(crop.width * POSE_HEIGHT / crop.height)
    if width > CANVAS[0] - 24:
        raise ValueError(f"Pose troppo larga: {source}")
    sprite = crop.resize((width, POSE_HEIGHT), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", CANVAS)
    frame.alpha_composite(sprite, ((CANVAS[0] - width) // 2, FEET - POSE_HEIGHT))
    destination.parent.mkdir(parents=True, exist_ok=True)
    frame.save(destination, optimize=True)


def main() -> None:
    for path in SOURCE.rglob("*.png"):
        relative = path.relative_to(SOURCE)
        if "atlas" in relative.parts or relative.parts[0] in {"idle", "block"}:
            continue
        destination = TARGET / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists():
            shutil.copyfile(path, destination)

    originals = {
        "idle": ROOT / "art_source/stage1_zen/characters_master/transparent/LEANDRA_MASTER.png",
        "block": ART / "pilot_v1/LEANDRA_GUARD_3Q_ALPHA.png",
    }
    for clip, source in originals.items():
        place_pose(source, TARGET / clip / "01.png")

    for clip, sources in (*PUNCH_FRAMES.items(), ("muay_elbow", ELBOW_FRAMES)):
        for frame, filename in enumerate(sources, start=1):
            source = ART / "incoming" / filename
            if not source.is_file():
                raise FileNotFoundError(f"Posa di prova mancante: {source}")
            shutil.copyfile(source, TARGET / clip / f"{frame:02d}.png")

    mapping = json.loads((ROOT / "character_specs/cammy_to_leandra_frame_map.json").read_text(encoding="utf-8"))
    progress = {
        "schema": 1,
        "character": "leandra",
        "motion_reference": "cammy_ref",
        "clips": {
            clip: {
                "status": "leandra_art" if clip in originals else "cammy_reference",
                "frames": 1 if clip in originals else len(frames),
                **({"source": str(originals[clip].relative_to(ROOT)).replace("\\", "/")} if clip in originals else {}),
            }
            for clip, frames in mapping["clips"].items()
        },
    }
    progress["clips"]["idle_variant_1"] = {
        "status": "leandra_art",
        "frames": 1,
        "source": str(originals["block"].relative_to(ROOT)).replace("\\", "/"),
        "note": "Guardia visibile come breve idle variante; usa lo stesso frame di block",
    }
    for clip, sources in (*PUNCH_FRAMES.items(), ("muay_elbow", ELBOW_FRAMES)):
        progress["clips"][clip] = {
            "status": "leandra_art",
            "frames": len(sources),
            "sources": [f"art_source/characters/leandra/incoming/{filename}" for filename in sources],
            "note": "Pose approvate: il frame iniziale di guardia e alcuni raccordi sono riusati finche non esistono pose dedicate.",
        }
    (ROOT / "character_specs/leandra_replacement_progress.json").write_text(
        json.dumps(progress, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("LEANDRA PILOT: idle, block, due pugni e due pose della gomitata approvati; gli altri clip conservano il riferimento Cammy")


if __name__ == "__main__":
    main()
