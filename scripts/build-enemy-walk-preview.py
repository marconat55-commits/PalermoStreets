#!/usr/bin/env python3
"""Build a review-only animated walk preview from original art-source frames."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


def render(manifest_path: Path, output_path: Path) -> None:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest["status"] != "art_review_only" or len(manifest["frames"]) != 6:
        raise ValueError("Expected a six-pose art-review walk cycle")
    sources = [(manifest_path.parent / entry["source"]).resolve() for entry in manifest["frames"]]
    if any(not source.is_relative_to(manifest_path.parent.resolve()) for source in sources):
        raise ValueError("A source frame escapes the pilot directory")
    frames = [Image.open(source).convert("RGBA") for source in sources]
    if any(frame.size != (640, 420) for frame in frames):
        raise ValueError("Every frame must be a 640x420 transparent PNG")
    hashes = [hashlib.sha256(frame.tobytes()).digest() for frame in frames]
    if len(set(hashes)) != 6:
        raise ValueError("Walk cycle contains duplicate source poses")

    masks = [frame.getchannel("A").point(lambda value: 1 if value >= 128 else 0).tobytes()
             for frame in frames]
    for index, (frame, mask) in enumerate(zip(frames, masks, strict=True)):
        bounds = frame.getchannel("A").point(lambda value: 255 if value >= 16 else 0).getbbox()
        if bounds is None or bounds[3] != manifest["baseline_y"]:
            raise ValueError(f"Frame {index + 1} is not grounded at Y={manifest['baseline_y']}")
        following = masks[(index + 1) % len(masks)]
        intersection = sum(left & right for left, right in zip(mask, following))
        union = sum(left | right for left, right in zip(mask, following))
        overlap = intersection / union
        if overlap > 0.9:
            raise ValueError(f"Frames {index + 1} and {(index + 1) % 6 + 1} repeat a silhouette ({overlap:.2f})")
        print(f"{index + 1} -> {(index + 1) % 6 + 1}: silhouette overlap {overlap:.2f}")

    preview = []
    for index, frame in enumerate(frames):
        canvas = Image.new("RGBA", frame.size, "#292930")
        canvas.alpha_composite(frame)
        draw = ImageDraw.Draw(canvas)
        draw.line((0, manifest["baseline_y"], 640, manifest["baseline_y"]),
                  fill="#efbd62", width=2)
        draw.text((16, 16), f"BARBACCIA WALK PILOT - {index + 1}/6", fill="white")
        preview.append(canvas.convert("RGB"))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    preview[0].save(output_path, save_all=True, append_images=preview[1:], loop=0,
                    duration=[entry["duration_ms"] for entry in manifest["frames"]],
                    optimize=False)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    render(args.manifest, args.output)
