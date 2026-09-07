from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def visible_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A").point(lambda value: 255 if value > 8 else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError("Empty render")
    return bounds


def padded_bounds(bounds: tuple[int, int, int, int], size: tuple[int, int], padding: int = 3) -> tuple[int, int, int, int]:
    left, top, right, bottom = bounds
    return (
        max(0, left - padding),
        max(0, top - padding),
        min(size[0], right + padding),
        min(size[1], bottom + padding),
    )


def normalize(manifest: Path, input_root: Path, output_root: Path) -> dict[str, object]:
    data = json.loads(manifest.read_text(encoding="utf-8-sig"))
    render = data["render"]
    canvas = (int(render["runtime_width"]), int(render["runtime_height"]))
    target_height = int(render["visual_height"])
    baseline = int(render["baseline_y"])

    # Scale is a character property, not a frame property. Use one approved,
    # upright pose to derive it, then preserve every frame's position relative
    # to that pose. This prevents crouches, landings and knockdowns from being
    # enlarged merely because their visible bounding box is shorter.
    reference = render.get("scale_reference", {})
    reference_clip = str(reference.get("clip", "idle" if "idle" in data["clips"] else next(iter(data["clips"]))))
    reference_frame = int(reference.get("frame", 1))
    reference_files = sorted((input_root / "raw" / reference_clip).glob("*.png"))
    if reference_frame < 1 or reference_frame > len(reference_files):
        raise RuntimeError(f"Invalid scale reference: {reference_clip}/{reference_frame:02d}.png")
    reference_image = Image.open(reference_files[reference_frame - 1]).convert("RGBA")
    reference_bounds = visible_bounds(reference_image)
    reference_height = reference_bounds[3] - reference_bounds[1]
    source_scale = target_height / max(1, reference_height)
    anchor_x = float(reference.get("source_anchor_x", (reference_bounds[0] + reference_bounds[2]) / 2))
    anchor_y = float(reference.get("source_anchor_y", reference_bounds[3]))

    report: dict[str, object] = {
        "schema": 2,
        "character_id": data["character_id"],
        "scale_reference": {
            "clip": reference_clip,
            "frame": reference_frame,
            "source_bounds": reference_bounds,
            "source_anchor": [anchor_x, anchor_y],
            "source_to_runtime_scale": source_scale,
        },
        "clips": {},
    }

    for clip_name in data["clips"]:
        source_files = sorted((input_root / "raw" / clip_name).glob("*.png"))
        if not source_files:
            raise RuntimeError(f"No rendered frames for {clip_name}")
        target_dir = output_root / "runtime_candidate" / clip_name
        target_dir.mkdir(parents=True, exist_ok=True)
        clip_report = []
        for index, source_path in enumerate(source_files, start=1):
            image = Image.open(source_path).convert("RGBA")
            try:
                bounds = visible_bounds(image)
            except RuntimeError as error:
                raise RuntimeError(f"Empty render: {source_path}") from error
            crop_bounds = padded_bounds(bounds, image.size)
            subject = image.crop(crop_bounds)
            width = max(1, round(subject.width * source_scale))
            height = max(1, round(subject.height * source_scale))
            subject = subject.resize((width, height), Image.Resampling.LANCZOS)
            left = round(canvas[0] / 2 + (crop_bounds[0] - anchor_x) * source_scale)
            top = round(baseline + (crop_bounds[1] - anchor_y) * source_scale)
            if left < 0 or top < 0 or left + width > canvas[0] or top + height > canvas[1]:
                raise RuntimeError(
                    f"{clip_name}/{source_path.name}: fixed-scale bounds "
                    f"[{left}, {top}, {width}, {height}] exceed canvas {canvas}"
                )
            frame = Image.new("RGBA", canvas, (0, 0, 0, 0))
            frame.alpha_composite(subject, (left, top))
            target_path = target_dir / f"{index:02d}.png"
            frame.save(target_path, optimize=True)
            runtime_bounds = visible_bounds(frame)
            clip_report.append({
                "file": target_path.name,
                "source_bounds": bounds,
                "runtime_bounds": runtime_bounds,
                "runtime_scale": 1.0,
                "source_to_runtime_scale": source_scale,
            })
        report["clips"][clip_name] = clip_report

    output_root.mkdir(parents=True, exist_ok=True)
    (output_root / "normalization_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = normalize(args.manifest, args.input, args.output)
    print(f"PS_NORMALIZE PASS - {sum(len(value) for value in report['clips'].values())} candidate frames")


if __name__ == "__main__":
    main()
