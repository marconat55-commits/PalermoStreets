"""Create Mark Nat's independent runtime pack from the approved combo pilot.

Existing Merco frames are copied only as temporary fallback moves. Merco's
profile, PNGs and atlas are never modified by this preparation step.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "assets/characters/merco_anim"
TARGET = PUBLIC / "assets/characters/mark_nat_anim"
PILOT = ROOT / "art_source/characters/merco/pilots/combo_preview_v1"
REACTIONS = ROOT / "art_source/characters/mark_nat/reactions_v1/runtime_frames"
PREFIX = "/assets/characters/mark_nat_anim/"


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def install_frame(clip: str, number: int, pose: str) -> None:
    destination = TARGET / clip / f"{number:02d}.png"
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(PILOT / f"{pose}_640x420.png", destination)


def replace_reaction(clip: str, sources: tuple[Path, ...]) -> None:
    folder = TARGET / clip
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("*.png"):
        old.unlink()
    for index, source in enumerate(sources, 1):
        shutil.copyfile(source, folder / f"{index:02d}.png")


def main() -> None:
    if not PILOT.joinpath("straight_two_640x420.png").exists():
        raise FileNotFoundError("Approved two-punch pilot is missing")
    shutil.copytree(SOURCE, TARGET, ignore=shutil.ignore_patterns("atlas"), dirs_exist_ok=True)
    install_frame("idle", 1, "guard")
    for number in range(2, 7):
        (TARGET / "idle" / f"{number:02d}.png").unlink(missing_ok=True)
    for number, pose in enumerate(("guard", "charge", "straight_one", "recovery"), 1):
        install_frame("punch_left", number, pose)
    for number, pose in enumerate(("guard", "straight_two", "recovery"), 1):
        install_frame("punch_right", number, pose)
    (TARGET / "punch_right/04.png").unlink(missing_ok=True)
    replace_reaction("hit", (
        REACTIONS / "hit_01.png", REACTIONS / "hit_02.png",
        REACTIONS / "hit_03.png", PILOT / "guard_640x420.png",
    ))
    replace_reaction("fall", tuple(REACTIONS / f"fall_{index:02d}.png" for index in range(1, 5)))
    replace_reaction("getup", (
        REACTIONS / "fall_04.png", REACTIONS / "getup_02.png",
        REACTIONS / "getup_03.png", PILOT / "charge_640x420.png",
        PILOT / "guard_640x420.png",
    ))

    # The portrait uses the same approved image, cropped without inventing art.
    sheet = Image.open(PILOT / "sheet_alpha.png").convert("RGBA")
    guard = sheet.crop((0, 0, 512, 768))
    bounds = guard.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("The approved guard is transparent")
    guard = guard.crop(bounds)
    guard = guard.crop((0, 0, guard.width, round(guard.height * 0.69)))
    portrait = Image.new("RGBA", (512, 512))
    scale = min(490 / guard.width, 500 / guard.height)
    guard = guard.resize((round(guard.width * scale), round(guard.height * scale)), Image.Resampling.LANCZOS)
    portrait.alpha_composite(guard, ((512 - guard.width) // 2, 512 - guard.height))
    portrait_path = PUBLIC / "assets/ui/character_select/mark_nat_portrait.png"
    portrait.save(portrait_path, optimize=True)

    profile = {
        "schema": 1,
        "id": "mark_nat",
        "extends": "merco",
        "display_name": "MARK NAT",
        "assets": {
            "animation_root": "assets/characters/mark_nat_anim",
            "texture_atlas": "assets/characters/mark_nat_anim/atlas/atlas.json",
            "frame_meta": "data/generated/characters/mark_nat.frame_meta.json",
        },
        "identity": {
            "canon": "Prototipo Mark Nat separato da Merco: guardia, due pugni, colpi subiti, caduta e rialzata in stile cartoon; altri movimenti ereditati temporaneamente da Merco in un pacchetto runtime indipendente"
        },
        "factory": {"animation_template": "data/character_templates/mark_nat_pilot_v1.json"},
        "selection": {
            "portrait": "assets/ui/character_select/mark_nat_portrait.png",
            "subtitle": "DUE PUGNI — PROTOTIPO CARTOON",
            "stats": {"strength": 4, "speed": 5, "technique": 5},
            "prototype": True,
        },
        "animations": {
            "idle": {
                "folder": "idle", "frames": 1, "source_frames": 1,
                "frame_sequence": [1], "durations": [0.3], "visual_scales": [1.0],
                "source_facing": 1, "loop": True,
            },
            "punch_left": {
                "folder": "punch_left", "frames": 4, "source_frames": 4,
                "frame_sequence": [1, 2, 3, 4],
                "durations": [0.07, 0.09, 0.14, 0.12], "visual_scales": [1.0],
                "source_facing": 1, "contact_frame": 3,
            },
            "punch_right": {
                "folder": "punch_right", "frames": 3, "source_frames": 3,
                "frame_sequence": [1, 2, 3],
                "durations": [0.09, 0.16, 0.13], "visual_scales": [1.0],
                "source_facing": 1, "contact_frame": 2,
            },
            "hit": {
                "folder": "hit", "frames": 4, "source_frames": 4,
                "frame_sequence": [1, 2, 3, 4],
                "durations": [0.07, 0.09, 0.1, 0.11], "visual_scales": [1.0],
                "source_facing": 1,
            },
            "knockdown": {
                "folder": "fall", "frames": 4, "source_frames": 4,
                "frame_sequence": [1, 2, 3, 4],
                "durations": [0.1, 0.14, 0.19, 0.5], "visual_scales": [1.0],
                "source_facing": 1,
            },
            "getup": {
                "folder": "getup", "frames": 5, "source_frames": 5,
                "frame_sequence": [1, 2, 3, 4, 5],
                "durations": [0.15, 0.17, 0.21, 0.2, 0.18], "visual_scales": [1.0],
                "source_facing": 1,
            },
            "dead": {
                "folder": "fall", "frames": 4, "source_frames": 4,
                "frame_sequence": [1, 2, 3, 4],
                "durations": [0.1, 0.14, 0.19, 9.0], "visual_scales": [1.0],
                "source_facing": 1,
            },
        },
    }
    write_json(PUBLIC / "data/characters/mark_nat.json", profile)

    template = json.loads((PUBLIC / "data/character_templates/merco_hq_ken_clone_v2.json").read_text(encoding="utf-8"))
    template["id"] = "mark_nat_pilot_v1"
    template["purpose"] = "Prototipo Mark Nat: due pugni cartoon approvati e locomozione Merco provvisoria"
    template["locomotion"]["idle"] = {"frames": 1, "loop": True, "phases": ["guard_static"]}
    # Fallback clips are still Merco art; compare their heights independently
    # until their Mark Nat equivalents are authored.
    template["qa"]["apparent_area_ratio_by_clip"] = {}
    write_json(PUBLIC / "data/character_templates/mark_nat_pilot_v1.json", template)

    index_path = PUBLIC / "data/characters/index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    if "mark_nat" not in index["characters"]:
        index["characters"].insert(index["characters"].index("merco") + 1, "mark_nat")
    write_json(index_path, index)

    meta_path = PUBLIC / "data/generated/frame_meta.json"
    global_meta = json.loads(meta_path.read_text(encoding="utf-8"))
    for key in [key for key in global_meta if key.startswith(PREFIX)]:
        del global_meta[key]
    for source in TARGET.rglob("*.png"):
        if "atlas" in source.relative_to(TARGET).parts:
            continue
        relative = source.relative_to(TARGET).as_posix()
        image = Image.open(source).convert("RGBA")
        bounds = image.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError(f"Empty frame: {source}")
        left, top, right, bottom = bounds
        global_meta[f"{PREFIX}{relative}"] = {
            "width": image.width, "height": image.height,
            "bounds": [left, top, right - left, bottom - top],
            "offsetY": image.height - 400,
        }
    write_json(meta_path, global_meta)
    write_json(PUBLIC / "data/generated/characters/mark_nat.frame_meta.json", {
        key: value for key, value in global_meta.items() if key.startswith(PREFIX)
    })
    print(f"Mark Nat ready: {sum(1 for key in global_meta if key.startswith(PREFIX))} frames")


if __name__ == "__main__":
    main()
