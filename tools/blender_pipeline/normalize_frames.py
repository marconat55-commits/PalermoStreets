from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    data = json.loads(args.manifest.read_text(encoding="utf-8-sig"))
    render = data["render"]
    canvas = (int(render["runtime_width"]), int(render["runtime_height"]))
    target_height = int(render["visual_height"])
    baseline = int(render["baseline_y"])
    report: dict[str, object] = {"schema": 1, "character_id": data["character_id"], "clips": {}}

    for clip_name in data["clips"]:
        source_files = sorted((args.input / "raw" / clip_name).glob("*.png"))
        if not source_files:
            raise RuntimeError(f"No rendered frames for {clip_name}")
        target_dir = args.output / "runtime_candidate" / clip_name
        target_dir.mkdir(parents=True, exist_ok=True)
        clip_report = []
        for index, source_path in enumerate(source_files, start=1):
            image = Image.open(source_path).convert("RGBA")
            alpha = image.getchannel("A").point(lambda value: 255 if value > 8 else 0)
            bounds = alpha.getbbox()
            if bounds is None:
                raise RuntimeError(f"Empty render: {source_path}")
            subject = image.crop((max(0, bounds[0] - 3), max(0, bounds[1] - 3), min(image.width, bounds[2] + 3), min(image.height, bounds[3] + 3)))
            scale = target_height / subject.height
            width = max(1, round(subject.width * scale))
            if width >= canvas[0] - 8:
                raise RuntimeError(f"{clip_name}/{source_path.name}: normalized width {width}px exceeds canvas")
            subject = subject.resize((width, target_height), Image.Resampling.LANCZOS)
            frame = Image.new("RGBA", canvas, (0, 0, 0, 0))
            left = round((canvas[0] - width) / 2)
            top = baseline - target_height
            frame.alpha_composite(subject, (left, top))
            target_path = target_dir / f"{index:02d}.png"
            frame.save(target_path, optimize=True)
            clip_report.append({"file": target_path.name, "source_bounds": bounds, "runtime_bounds": [left, top, width, target_height], "scale": 1.0})
        report["clips"][clip_name] = clip_report

    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "normalization_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"PS_NORMALIZE PASS - {sum(len(value) for value in report['clips'].values())} candidate frames")


if __name__ == "__main__":
    main()
