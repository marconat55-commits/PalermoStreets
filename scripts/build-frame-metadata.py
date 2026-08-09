#!/usr/bin/env python3
"""Rebuild deterministic frame metadata for one character without touching PNG pixels."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    parser.add_argument("--character", required=True)
    args = parser.parse_args()

    project = args.project.resolve()
    public = project / "public"
    profile = load_json(public / "data" / "characters" / f"{args.character}.json")
    meta_path = public / "data" / "generated" / "frame_meta.json"
    meta = load_json(meta_path)
    animation_root = profile["assets"]["animation_root"]
    content_bottom = profile["factory"].get("content_bottom_y", profile["factory"]["baseline_y"])
    expected: dict[str, dict] = {}

    for spec in profile["animations"].values():
        for index in range(1, spec["frames"] + 1):
            relative = f'{animation_root}/{spec["folder"]}/{index:02d}.png'
            path = public / relative
            image = Image.open(path).convert("RGBA")
            bounds = image.getchannel("A").getbbox()
            if bounds is None:
                raise ValueError(f"Frame trasparente vuoto: {relative}")
            left, top, right, bottom = bounds
            expected[f"/{relative}"] = {
                "width": image.width,
                "height": image.height,
                "bounds": [left, top, right - left, bottom - top],
                "offsetY": image.height - content_bottom,
            }

    prefix = f"/{animation_root}/"
    for key in list(meta):
        if key.startswith(prefix) and key not in expected:
            del meta[key]
    for key, value in expected.items():
        meta[key] = value

    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK {args.character}: {len(expected)} metadata frame; orphan rimossi")


if __name__ == "__main__":
    main()
