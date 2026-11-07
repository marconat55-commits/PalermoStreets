#!/usr/bin/env python3
"""Build the local Cammy motion prototype from the user-supplied MUGEN files.

Keep the original archive outside the project. The exported sprites are a
temporary motion reference to replace frame by frame with Leandra artwork.
"""

from __future__ import annotations

import argparse
import io
import json
import re
import struct
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

CANVAS = (640, 420)
PIVOT = (320, 400)
SCALE = 2.95


@dataclass(frozen=True)
class Sprite:
    image: Image.Image
    axis_x: int
    axis_y: int


@dataclass(frozen=True)
class Frame:
    group: int
    item: int
    x: int
    y: int
    ticks: int
    flags: str
    action: int


def read_sff(path: Path, palette_path: Path) -> dict[tuple[int, int], Sprite]:
    data = path.read_bytes()
    if not data.startswith(b"ElecbyteSpr") or data[15] != 1:
        raise ValueError("Cammy2x.sff deve essere in formato SFF v1")
    _, total, offset, header_size = struct.unpack_from("<4I", data, 16)
    if header_size > 64 and data[offset + 32] == 10:
        header_size = 32
    act = palette_path.read_bytes()
    if len(act) < 768:
        raise ValueError("Palette ACT incompleta")
    # MUGEN ACT entries are stored in reverse index order.
    palette = b"".join(act[index:index + 3] for index in range(765, -1, -3))
    previous: list[Image.Image | None] = []
    sprites: dict[tuple[int, int], Sprite] = {}
    for _ in range(total):
        if offset + header_size > len(data):
            break
        next_offset, length = struct.unpack_from("<II", data, offset)
        axis_x, axis_y, group, item, linked = struct.unpack_from("<hhHHH", data, offset + 8)
        image: Image.Image | None = None
        if length >= 128:
            source = Image.open(io.BytesIO(data[offset + header_size:offset + header_size + length]))
            source.load()
            # Shared-palette PCX files decode as L; their bytes are still indices.
            indexed = Image.frombytes("P", source.size, source.tobytes())
            indexed.putpalette(palette)
            image = indexed.convert("RGBA")
            alpha = bytes(0 if value == 0 else 255 for value in indexed.tobytes())
            image.putalpha(Image.frombytes("L", indexed.size, alpha))
        elif linked < len(previous):
            image = previous[linked]
        previous.append(image)
        if image is not None:
            sprites[(group, item)] = Sprite(image, axis_x, axis_y)
        if next_offset == 0:
            break
        offset = next_offset
    return sprites


def read_air(path: Path) -> dict[int, list[Frame]]:
    actions: dict[int, list[Frame]] = {}
    current: int | None = None
    for raw in path.read_text(encoding="latin-1").splitlines():
        line = raw.split(";", 1)[0].strip()
        heading = re.match(r"\[\s*Begin\s+Action\s+(-?\d+)\s*\]", line, re.I)
        if heading:
            current = int(heading.group(1))
            actions[current] = []
            continue
        if current is None or not re.match(r"^-?\d+\s*,", line):
            continue
        cells = [cell.strip() for cell in line.split(",")]
        if len(cells) < 5:
            continue
        try:
            group, item, x, y, ticks = map(int, cells[:5])
        except ValueError:
            continue
        actions[current].append(Frame(group, item, x, y, ticks, ",".join(cells[5:]).upper(), current))
    return actions


def distinct(frames: list[Frame]) -> list[Frame]:
    result: list[Frame] = []
    for frame in frames:
        if frame.group < 0:
            continue
        if result and (result[-1].group, result[-1].item, result[-1].x, result[-1].y, result[-1].flags) == (
            frame.group, frame.item, frame.x, frame.y, frame.flags
        ):
            previous = result[-1]
            result[-1] = Frame(previous.group, previous.item, previous.x, previous.y,
                               previous.ticks + max(1, frame.ticks), previous.flags, previous.action)
        else:
            result.append(frame)
    return result


def render(frame: Frame, sprite: Sprite, grounded: bool) -> Image.Image:
    source = sprite.image
    bounds = source.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"Sprite vuoto: {frame.group},{frame.item}")
    source = source.crop(bounds)
    # Cropping transparent PCX padding must move the MUGEN axis with the art.
    cropped_axis_x = sprite.axis_x - bounds[0]
    cropped_axis_y = sprite.axis_y - bounds[1]
    flip_h = "H" in frame.flags
    flip_v = "V" in frame.flags
    if flip_h:
        source = source.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if flip_v:
        source = source.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    axis_x = source.width - cropped_axis_x if flip_h else cropped_axis_x
    axis_y = source.height - cropped_axis_y if flip_v else cropped_axis_y
    width, height = max(1, round(source.width * SCALE)), max(1, round(source.height * SCALE))
    source = source.resize((width, height), Image.Resampling.NEAREST)
    x = round(PIVOT[0] + (frame.x - axis_x) * SCALE)
    y = round(PIVOT[1] + (frame.y - axis_y) * SCALE)
    if grounded:
        y = PIVOT[1] - height
    x = min(max(4, x), CANVAS[0] - width - 4)
    y = min(max(4, y), CANVAS[1] - height - 4)
    if x < 0 or y < 0:
        raise ValueError(f"Frame troppo grande per la tela: {frame.action}/{frame.group},{frame.item}")
    canvas = Image.new("RGBA", CANVAS)
    canvas.alpha_composite(source, (x, y))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mugen-root", type=Path, required=True)
    parser.add_argument("--project", type=Path, required=True)
    args = parser.parse_args()
    source = args.mugen_root
    public = args.project / "public"
    output = public / "assets/characters/cammy_ref_anim"
    actions = read_air(source / "Cammy2.air")
    sprites = read_sff(source / "Cammy2x.sff", source / "cammy3.ACT")
    # Keep full walk/run cycles so opposite legs and arms remain authentic.
    recipes: dict[str, list[int]] = {
        "idle": [0], "walk": [20], "run": [100], "brake": [105],
        "jump": [40, 41, 42], "land": [47],
        "air_attack": [640], "air_punch": [600],
        "punch_left": [200], "punch_right": [201], "muay_elbow": [204],
        "combo_finisher": [211], "kick_front": [210], "kick_right": [240],
        "kick_finisher": [214], "block": [120], "grab": [950],
        "grab_strike": [202], "throw": [951], "super": [1082],
        "hit": [5030],
        "punch_backfist": [203], "kick_low": [410], "kick_slide": [420],
    }
    lying = distinct(actions[5110])
    recipes["knockdown"] = [5050, 5110]
    recipes["getup"] = [5110, 5120]
    recipes["dead"] = [5050, 5110]
    specs: dict[str, dict] = {}
    frame_map: dict[str, list[dict]] = {}
    for clip, action_ids in recipes.items():
        grounded = clip not in {"jump", "air_attack", "air_punch", "super"}
        frames = distinct([frame for action_id in action_ids for frame in actions[action_id]])
        if clip == "run":
            seen: set[bytes] = set()
            unique_run: list[Frame] = []
            for frame in frames:
                pixels = render(frame, sprites[frame.group, frame.item], grounded).tobytes()
                if pixels not in seen:
                    seen.add(pixels)
                    unique_run.append(frame)
            frames = unique_run
        if clip == "knockdown":
            frames = distinct(actions[5050]) + lying
        if clip == "getup":
            frames = lying + distinct(actions[5120])
        if clip == "dead":
            frames = distinct(actions[5050]) + lying
        directory = output / clip
        directory.mkdir(parents=True, exist_ok=True)
        for old in directory.glob("*.png"):
            old.unlink()
        durations: list[float] = []
        mapping: list[dict] = []
        for index, frame in enumerate(frames, 1):
            sprite = sprites.get((frame.group, frame.item))
            if sprite is None:
                raise ValueError(f"Sprite mancante per {clip}: {frame.group},{frame.item}")
            render(frame, sprite, grounded).save(directory / f"{index:02d}.png", optimize=True)
            durations.append(round(max(2, frame.ticks if frame.ticks > 0 else 6) / 60, 4))
            mapping.append({"frame": index, "action": frame.action, "sprite": [frame.group, frame.item]})
        spec = {"folder": clip, "frames": len(frames), "durations": durations,
                "visual_scales": [1.0], "source_facing": 1}
        if clip in {"idle", "walk", "run", "block", "grab"}:
            spec["loop"] = True
        if clip == "walk":
            spec["reference_speed"] = 295
        if clip == "run":
            spec["reference_speed"] = 455
        if clip in {"air_attack", "air_punch", "punch_left", "punch_right", "muay_elbow",
                    "combo_finisher", "kick_front", "kick_right", "kick_finisher", "grab_strike",
                    "throw", "super", "punch_backfist", "kick_low", "kick_slide"}:
            spec["contact_frame"] = max(1, round(len(frames) * 0.6))
        specs[clip] = spec
        frame_map[clip] = mapping

    def attack(animation: str, damage: int, reach: int, knockback: int,
               finisher: bool = False) -> dict:
        return {
            "name": f"cammy_{animation}", "animation": animation,
            "damage": damage, "startup": 0.10 if not finisher else 0.15,
            "active": 0.12 if not finisher else 0.15,
            "recovery": 0.18 if not finisher else 0.29,
            "rangeX": reach, "rangeY": 68, "knockbackX": knockback,
            "knockbackY": 0, "furyGain": 8 if not finisher else 14,
            "hitStop": 0.055 if not finisher else 0.09,
            "shake": 5 if not finisher else 11,
            **({"knockdown": True, "launchVelocity": 440} if finisher else {}),
        }

    combo_variants = [
        [attack("punch_left", 13, 88, 150),
         attack("punch_right", 18, 105, 220),
         attack("combo_finisher", 28, 150, 530, True)],
        [attack("punch_backfist", 15, 100, 175),
         attack("muay_elbow", 19, 110, 250),
         attack("kick_finisher", 30, 154, 575, True)],
        [attack("kick_low", 14, 112, 175),
         attack("kick_front", 19, 130, 245),
         attack("kick_slide", 32, 164, 600, True)],
    ]
    profile = {
        "schema": 1, "id": "cammy_ref", "display_name": "CAMMY REF", "role": "player",
        "height_cm": 164, "body_type": "fighter arcade", "visual_height": 272,
        "assets": {"master_root": "assets/characters/cammy_ref",
                   "animation_root": "assets/characters/cammy_ref_anim",
                   "texture_atlas": "assets/characters/cammy_ref_anim/atlas/atlas.json",
                   "frame_meta": "data/generated/characters/cammy_ref.frame_meta.json"},
        "identity": {"fighting_style": "acrobatic arcade", "special_move": "spiral kick",
                     "canon": "Prototipo tecnico locale MUGEN fornito dall'utente; riferimento temporaneo per Leandra"},
        "gameplay": {"player": {"max_health": 110, "move_speed": 310.0,
                                 "depth_speed": 225.0, "combo_variants": combo_variants}},
        "factory": {"animation_template": "data/character_templates/cammy_reference_v1.json",
                    "animation_canvas": [640, 420], "baseline_y": 400,
                    "content_bottom_y": 400, "scale_mode": "baked"},
        "selection": {"portrait": "assets/ui/character_select/cammy_ref_portrait.png",
                      "subtitle": "PROTOTIPO MOVIMENTO PER LEANDRA", "stats": {"strength": 3, "speed": 5, "technique": 5},
                      "prototype": True},
        "animations": specs,
    }
    profile_path = public / "data/characters/cammy_ref.json"
    profile_path.write_text(json.dumps(profile, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    map_path = args.project / "character_specs/cammy_to_leandra_frame_map.json"
    map_path.write_text(json.dumps({"source": "Cammy2.rar / Cammy2x.sff / Cammy2.air",
                                    "clips": frame_map}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    portrait_source = Image.open(output / "idle/01.png").convert("RGBA")
    bounds = portrait_source.getchannel("A").getbbox()
    portrait = Image.new("RGBA", (512, 512))
    if bounds:
        crop = portrait_source.crop(bounds)
        scale = min(460 / crop.width, 460 / crop.height)
        crop = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.NEAREST)
        portrait.alpha_composite(crop, ((512 - crop.width) // 2, 512 - crop.height))
    portrait.save(public / "assets/ui/character_select/cammy_ref_portrait.png", optimize=True)
    print(f"CAMMY REF: {sum(spec['frames'] for spec in specs.values())} frame in {len(specs)} clip; {len(sprites)} sprite sorgente")


if __name__ == "__main__":
    main()
