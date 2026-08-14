#!/usr/bin/env python3
"""Rebuild deterministic frame metadata for one character without touching PNG pixels."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def deep_merge(base: object, override: object) -> object:
    if not isinstance(base, dict) or not isinstance(override, dict):
        return override
    result = dict(base)
    for key, value in override.items():
        result[key] = deep_merge(result[key], value) if key in result else value
    return result


def resolve_profile(public: Path, character_id: str, chain: tuple[str, ...] = ()) -> dict:
    if character_id in chain:
        raise ValueError(f"Eredità circolare: {' -> '.join((*chain, character_id))}")
    source = load_json(public / "data" / "characters" / f"{character_id}.json")
    base_id = source.get("extends")
    if not base_id:
        return source
    return deep_merge(resolve_profile(public, base_id, (*chain, character_id)), source)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    parser.add_argument("--character", required=True)
    args = parser.parse_args()

    project = args.project.resolve()
    public = project / "public"
    profile = resolve_profile(public, args.character)
    meta_path = public / "data" / "generated" / "frame_meta.json"
    meta = load_json(meta_path)
    animation_root = profile["assets"]["animation_root"]
    content_bottom = profile["factory"].get("content_bottom_y", profile["factory"]["baseline_y"])
    expected: dict[str, dict] = {}

    specs = list(profile["animations"].values()) + list(profile.get("archived_animations", {}).values())
    for spec in specs:
        source_frames = spec.get("source_frames", spec["frames"])
        for index in range(1, source_frames + 1):
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
