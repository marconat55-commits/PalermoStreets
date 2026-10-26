"""Prepare the complete 16-pose Hulk-reference Barbaccia walk for the Pixi pilot.

The approved source candidates are left untouched.  Derived files are placed on
the project's fixed 640x420 runtime canvas, aligned to the same feet baseline.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "art_source/stage1_zen/barbaccia_hd_master/hulk_walk_candidates_v2"
OUTPUT_DIR = SOURCE_DIR / "runtime_preview"
MERCO_REFERENCE = ROOT / "public/assets/characters/merco_anim/idle/01.png"

CANVAS_SIZE = (640, 420)
FEET_Y = 400
ALPHA_THRESHOLD = 128
TARGET_MASS_RATIO = 2.10

SOURCES = (
    ("phase01_pose_locked_candidate.png", "01_phase01.png", 1),
    ("phase02_pose_locked_candidate.png", "02_phase02.png", 2),
    ("phase03_pose_locked_candidate.png", "03_phase03.png", 3),
    ("phase04_pose_locked_candidate.png", "04_phase04.png", 4),
    ("phase05_pose_locked_candidate.png", "05_phase05.png", 5),
    ("phase06_pose_locked_candidate.png", "06_phase06.png", 6),
    ("phase07_pose_locked_candidate.png", "07_phase07.png", 7),
    ("phase08_pose_locked_candidate.png", "08_phase08.png", 8),
    ("phase09_pose_locked_candidate.png", "09_phase09.png", 9),
    ("phase10_pose_locked_candidate.png", "10_phase10.png", 10),
    ("phase11_pose_locked_candidate.png", "11_phase11.png", 11),
    ("phase12_pose_locked_candidate.png", "12_phase12.png", 12),
    ("phase13_pose_locked_candidate.png", "13_phase13.png", 13),
    ("phase14_pose_locked_candidate.png", "14_phase14.png", 14),
    ("phase15_pose_locked_candidate.png", "15_phase15.png", 15),
    ("phase16_pose_locked_candidate.png", "16_phase16.png", 16),
)


def alpha_area(image: Image.Image) -> int:
    return sum(
        1 for value in image.getchannel("A").get_flattened_data() if value >= ALPHA_THRESHOLD
    )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare(source_path: Path, output_path: Path, target_area: int) -> dict[str, object]:
    source = Image.open(source_path).convert("RGBA")
    alpha_bbox = source.getchannel("A").point(lambda value: 255 if value >= 8 else 0).getbbox()
    if alpha_bbox is None:
        raise ValueError(f"No visible pixels in {source_path}")

    cropped = source.crop(alpha_bbox)
    source_area = alpha_area(cropped)
    scale = math.sqrt(target_area / source_area)
    resized_size = (
        max(1, round(cropped.width * scale)),
        max(1, round(cropped.height * scale)),
    )
    resized = cropped.resize(resized_size, Image.Resampling.LANCZOS)

    # Drop only near-transparent resize fringe; painted pixels remain unchanged.
    pixels = list(resized.get_flattened_data())
    resized.putdata([(r, g, b, 0 if a < 8 else a) for r, g, b, a in pixels])

    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    left = (CANVAS_SIZE[0] - resized.width) // 2
    top = FEET_Y - resized.height
    if left < 0 or top < 0 or left + resized.width > CANVAS_SIZE[0]:
        raise ValueError(f"Prepared pose does not fit runtime canvas: {resized_size}")
    canvas.alpha_composite(resized, (left, top))
    canvas.save(output_path, optimize=True)

    result_bbox = canvas.getchannel("A").getbbox()
    return {
        "source": source_path.name,
        "source_sha256": sha256(source_path),
        "output": output_path.name,
        "canvas": list(CANVAS_SIZE),
        "feet_y": FEET_Y,
        "visible_bbox": list(result_bbox) if result_bbox else None,
        "visible_size": [resized.width, resized.height],
        "opaque_area": alpha_area(canvas),
        "scale_from_source": round(scale, 6),
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for previous_preview in OUTPUT_DIR.glob("*.png"):
        previous_preview.unlink()
    merco = Image.open(MERCO_REFERENCE).convert("RGBA")
    merco_area = alpha_area(merco)
    target_area = round(merco_area * TARGET_MASS_RATIO)

    outputs: list[dict[str, object]] = []
    for source_name, output_name, reference_phase in SOURCES:
        item = prepare(SOURCE_DIR / source_name, OUTPUT_DIR / output_name, target_area)
        item["reference_phase"] = reference_phase
        outputs.append(item)

    manifest = {
        "status": "sixteen_pose_hulk_cycle_preview_not_approved",
        "source_candidates_untouched": True,
        "normalization": "equal opaque mass, uniform scale, common feet baseline",
        "merco_reference": str(MERCO_REFERENCE.relative_to(ROOT)).replace("\\", "/"),
        "target_mass_ratio_vs_merco": TARGET_MASS_RATIO,
        "target_opaque_area": target_area,
        "frames": outputs,
    }
    (OUTPUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
