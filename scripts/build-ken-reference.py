#!/usr/bin/env python3
"""Convert the locally supplied MUGEN Ken into the Palermo Streets raster contract.

The result is a technical/private reference character. It is intentionally not a
redistributable project asset: source ownership and commercial clearance remain
outside this converter's scope.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import struct
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


CANVAS = (640, 420)
PIVOT = (320, 400)
TARGET_HEIGHT = 290
MUGEN_FPS = 60


@dataclass(frozen=True)
class SpriteInfo:
    width: int
    height: int
    axis_x: int
    axis_y: int


@dataclass(frozen=True)
class AirFrame:
    group: int
    item: int
    offset_x: int
    offset_y: int
    ticks: int
    flags: str


def read_sff_sprite_info(path: Path) -> dict[tuple[int, int], SpriteInfo]:
    with path.open("rb") as source:
        header = source.read(512)
        if not header.startswith(b"ElecbyteSpr") or header[15] != 2:
            raise ValueError("Il convertitore richiede un archivio SFF v2")
        sprite_offset, sprite_total = struct.unpack_from("<II", header, 36)
        source.seek(sprite_offset)
        result: dict[tuple[int, int], SpriteInfo] = {}
        for _ in range(sprite_total):
            row = source.read(28)
            group, item, width, height, axis_x, axis_y = struct.unpack_from("<6H", row)
            result[(group, item)] = SpriteInfo(
                width=width,
                height=height,
                axis_x=axis_x if axis_x < 32768 else axis_x - 65536,
                axis_y=axis_y if axis_y < 32768 else axis_y - 65536,
            )
    return result


def parse_air(path: Path) -> dict[int, list[AirFrame]]:
    actions: dict[int, list[AirFrame]] = {}
    current: list[AirFrame] | None = None
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.split(";", 1)[0].strip()
        match = re.match(r"\[Begin Action\s+(-?\d+)\]", line, re.IGNORECASE)
        if match:
            current = actions.setdefault(int(match.group(1)), [])
            continue
        if current is None or not re.match(r"^-?\d+\s*,", line):
            continue
        parts = [part.strip() for part in line.split(",")]
        if len(parts) < 5:
            continue
        try:
            group, item, x, y, ticks = map(int, parts[:5])
        except ValueError:
            continue
        flags = ",".join(parts[5:]).upper()
        current.append(AirFrame(group, item, x, y, ticks, flags))
    return actions


def unique_frames(frames: list[AirFrame], limit: int | None = None) -> list[AirFrame]:
    result: list[AirFrame] = []
    for frame in frames:
        if frame.ticks < 0:
            frame = AirFrame(frame.group, frame.item, frame.offset_x, frame.offset_y, 12, frame.flags)
        if result and (frame.group, frame.item, frame.offset_x, frame.offset_y, frame.flags) == (
            result[-1].group,
            result[-1].item,
            result[-1].offset_x,
            result[-1].offset_y,
            result[-1].flags,
        ):
            previous = result[-1]
            result[-1] = AirFrame(previous.group, previous.item, previous.offset_x, previous.offset_y, previous.ticks + max(1, frame.ticks), previous.flags)
        else:
            result.append(frame)
    if limit and len(result) > limit:
        indexes = [round(index * (len(result) - 1) / (limit - 1)) for index in range(limit)]
        result = [result[index] for index in indexes]
    return result


def sprite_path(extract_root: Path, group: int, item: int) -> Path:
    return extract_root / f"Ken {group} {item}.png"


def render_frame(frame: AirFrame, info: SpriteInfo, source_path: Path, grounded: bool) -> Image.Image:
    source = Image.open(source_path).convert("RGBA")
    flip_h = "H" in frame.flags
    flip_v = "V" in frame.flags
    if flip_h:
        source = source.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if flip_v:
        source = source.transpose(Image.Transpose.FLIP_TOP_BOTTOM)

    axis_x = info.width - info.axis_x if flip_h else info.axis_x
    axis_y = info.height - info.axis_y if flip_v else info.axis_y
    scale = TARGET_HEIGHT / 103.0
    size = (max(1, round(source.width * scale)), max(1, round(source.height * scale)))
    source = source.resize(size, Image.Resampling.NEAREST)
    axis_x *= scale
    axis_y *= scale
    x = round(PIVOT[0] + frame.offset_x * scale - axis_x)
    y = round(PIVOT[1] + frame.offset_y * scale - axis_y)
    # Aerial and super AIR origins may intentionally leave MUGEN's viewport.
    # Preserve the whole sprite inside Palermo Streets' fixed runtime canvas.
    x = min(max(4, x), CANVAS[0] - source.width - 4)
    y = min(max(4, y), CANVAS[1] - source.height - 4)
    canvas = Image.new("RGBA", CANVAS)
    canvas.alpha_composite(source, (x, y))

    if grounded:
        bounds = canvas.getchannel("A").getbbox()
        if bounds:
            left, top, right, bottom = bounds
            crop = canvas.crop(bounds)
            ratio = TARGET_HEIGHT / max(1, bottom - top)
            crop = crop.resize((max(1, round(crop.width * ratio)), TARGET_HEIGHT), Image.Resampling.NEAREST)
            canvas = Image.new("RGBA", CANVAS)
            canvas.alpha_composite(crop, (round(PIVOT[0] - crop.width / 2), PIVOT[1] - TARGET_HEIGHT))
    return canvas


def save_clip(
    name: str,
    frames: list[AirFrame],
    output_root: Path,
    extract_root: Path,
    sprite_info: dict[tuple[int, int], SpriteInfo],
    grounded: bool = False,
) -> tuple[int, list[float]]:
    folder = output_root / name
    folder.mkdir(parents=True, exist_ok=True)
    durations: list[float] = []
    saved = 0
    for frame in frames:
        source_path = sprite_path(extract_root, frame.group, frame.item)
        info = sprite_info.get((frame.group, frame.item))
        if not source_path.exists() or not info:
            continue
        image = render_frame(frame, info, source_path, grounded)
        saved += 1
        image.save(folder / f"{saved:02d}.png", optimize=True)
        durations.append(round(max(2, frame.ticks) / MUGEN_FPS, 4))
    if not saved:
        raise ValueError(f"Nessun fotogramma prodotto per {name}")
    return saved, durations


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mugen-root", type=Path, required=True)
    parser.add_argument("--extract-root", type=Path, required=True)
    parser.add_argument("--project", type=Path, required=True)
    args = parser.parse_args()

    air = parse_air(args.mugen_root / "Ken.air")
    sprite_info = read_sff_sprite_info(args.mugen_root / "Ken.sff")
    public = args.project / "public"
    animation_root = public / "assets" / "characters" / "ken_ref_anim"
    if animation_root.exists():
        shutil.rmtree(animation_root)
    animation_root.mkdir(parents=True)

    # Palermo Streets action -> MUGEN AIR action. The short lists keep the
    # beat-em-up controls readable while retaining original key poses/timing.
    recipes: dict[str, tuple[int, int | None, bool]] = {
        "idle": (0, 6, True),
        "walk": (20, 8, True),
        "run": (100, 6, True),
        "brake": (105, 4, True),
        "jump": (42, 5, False),
        "land": (47, 4, True),
        "air_attack": (630, 6, False),
        "air_punch": (600, 6, False),
        "punch_left": (200, 4, True),
        "punch_right": (210, 5, True),
        "muay_elbow": (220, 5, True),
        "combo_finisher": (250, 6, True),
        "kick_front": (230, 5, True),
        "kick_right": (240, 6, True),
        "kick_finisher": (250, 6, True),
        "block": (120, 2, True),
        "grab": (800, 4, True),
        "grab_strike": (220, 4, True),
        "throw": (810, 8, False),
        "super": (3000, 10, False),
        "hit": (5000, 4, False),
    }
    specs: dict[str, dict] = {}
    for name, (action, limit, grounded) in recipes.items():
        selected = unique_frames(air.get(action, []), limit)
        count, durations = save_clip(name, selected, animation_root, args.extract_root, sprite_info, grounded)
        spec = {"folder": name, "frames": count, "durations": durations, "visual_scales": [1.0], "source_facing": 1}
        if name in {"idle", "walk", "run", "block"}:
            spec["loop"] = True
        if name == "walk":
            spec["reference_speed"] = 295
        if name == "run":
            spec["reference_speed"] = 455
        if name in {"air_attack", "air_punch", "punch_left", "punch_right", "muay_elbow", "combo_finisher", "kick_front", "kick_right", "kick_finisher", "grab_strike", "throw", "super"}:
            spec["contact_frame"] = max(1, round(count * 0.65))
        specs[name] = spec

    lying = unique_frames(air.get(5110, []), 1)
    falling = unique_frames(air.get(5100, []), 2) + lying
    fall_count, fall_durations = save_clip("fall", falling, animation_root, args.extract_root, sprite_info)
    getup_frames = lying + unique_frames(air.get(5120, []), 7)
    getup_count, getup_durations = save_clip("getup", getup_frames, animation_root, args.extract_root, sprite_info)
    specs["knockdown"] = {"folder": "fall", "frames": fall_count, "durations": fall_durations, "visual_scales": [1.0], "source_facing": 1}
    specs["dead"] = {"folder": "fall", "frames": fall_count, "durations": [*fall_durations[:-1], 9.0], "visual_scales": [1.0], "source_facing": 1}
    specs["getup"] = {"folder": "getup", "frames": getup_count, "durations": getup_durations, "visual_scales": [1.0], "source_facing": 1}

    profile = {
        "schema": 1,
        "id": "ken_ref",
        "display_name": "KEN REF",
        "role": "player",
        "height_cm": 175,
        "body_type": "fighter arcade",
        "visual_height": TARGET_HEIGHT,
        "assets": {
            "master_root": "assets/characters/ken_ref",
            "animation_root": "assets/characters/ken_ref_anim",
            "texture_atlas": "assets/characters/ken_ref_anim/atlas/atlas.json",
        },
        "identity": {
            "fighting_style": "Ansatsuken arcade adattato al belt-scroller",
            "special_move": "Shouryureppa di riferimento",
            "canon": "PROTOTIPO TECNICO PRIVATO derivato dal personaggio MUGEN fornito dall'utente; non destinato alla distribuzione commerciale",
        },
        "gameplay": {"player": {"max_health": 112, "move_speed": 295.0, "depth_speed": 215.0}},
        "factory": {
            "animation_template": "data/character_templates/ken_reference_v1.json",
            "animation_canvas": [640, 420],
            "baseline_y": 400,
            "content_bottom_y": 400,
            "scale_mode": "baked",
        },
        "selection": {
            "portrait": "assets/ui/character_select/ken_ref_portrait.png",
            "subtitle": "MUGEN MOTION REFERENCE — NON COMMERCIALE",
            "stats": {"strength": 4, "speed": 5, "technique": 5},
            "prototype": True,
        },
        "animations": specs,
    }
    profile_path = public / "data" / "characters" / "ken_ref.json"
    profile_path.write_text(json.dumps(profile, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    portrait_source = Image.open(animation_root / "idle" / "01.png").convert("RGBA")
    bounds = portrait_source.getchannel("A").getbbox()
    portrait = Image.new("RGBA", (512, 512))
    if bounds:
        crop = portrait_source.crop(bounds)
        scale = min(460 / crop.width, 460 / crop.height)
        crop = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.NEAREST)
        portrait.alpha_composite(crop, ((512 - crop.width) // 2, 512 - crop.height))
    portrait_path = public / "assets" / "ui" / "character_select" / "ken_ref_portrait.png"
    portrait_path.parent.mkdir(parents=True, exist_ok=True)
    portrait.save(portrait_path, optimize=True)
    print(f"KEN REF: {sum(spec['frames'] for spec in specs.values())} frame runtime in {len(specs)} clip")


if __name__ == "__main__":
    main()
