#!/usr/bin/env python3
"""Build the M01 layered candidate and camera proofs deterministically."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageStat


MASTER_SIZE = (3840, 1080)
RUNTIME_SIZE = (2560, 720)
VIEWPORT_SIZE = (1280, 720)
WALK_TOP = 635
WALK_BOTTOM = 705
HORIZON_Y = 315
FAR_PARALLAX = 0.22
CAMERAS = (0, 640, 1280)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return image.resize(size, Image.Resampling.LANCZOS)


def color_match_far(far: Image.Image, reference: Image.Image, mask: Image.Image) -> Image.Image:
    far_rgb = far.convert("RGB")
    reference_rgb = reference.convert("RGB")
    far_stats = ImageStat.Stat(far_rgb, mask)
    reference_stats = ImageStat.Stat(reference_rgb, mask)
    channels: list[Image.Image] = []
    for channel, far_mean, far_std, ref_mean, ref_std in zip(
        far_rgb.split(), far_stats.mean, far_stats.stddev, reference_stats.mean, reference_stats.stddev
    ):
        ratio = ref_std / far_std if far_std > 0.001 else 1.0
        ratio = min(1.25, max(0.75, ratio))
        lookup = [round(max(0, min(255, (value - far_mean) * ratio + ref_mean))) for value in range(256)]
        channels.append(channel.point(lookup))
    return Image.merge("RGB", channels)


def font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arialbd.ttf", size)
    except OSError:
        return ImageFont.load_default()


def actor_frame(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def paste_actor(frame: Image.Image, target: Image.Image, center_x: int, feet_y: int) -> None:
    target.alpha_composite(frame, (center_x - frame.width // 2, feet_y - 400))


def crop(image: Image.Image, x: int) -> Image.Image:
    return image.crop((x, 0, x + VIEWPORT_SIZE[0], VIEWPORT_SIZE[1]))


def overlay(image: Image.Image) -> Image.Image:
    result = image.copy()
    draw = ImageDraw.Draw(result, "RGBA")
    draw.rectangle((0, WALK_TOP, 1280, WALK_BOTTOM), fill=(34, 197, 94, 42))
    draw.line((0, WALK_TOP, 1280, WALK_TOP), fill=(74, 222, 128, 255), width=3)
    draw.line((0, WALK_BOTTOM, 1280, WALK_BOTTOM), fill=(74, 222, 128, 255), width=3)
    draw.line((0, HORIZON_Y, 1280, HORIZON_Y), fill=(250, 204, 21, 220), width=2)
    draw.text((18, WALK_TOP + 8), "WALK 635-705", font=font(18), fill=(220, 252, 231, 255))
    return result


def main(project_root: Path) -> None:
    bg = project_root / "public/assets/backgrounds/stage1_zen"
    main_source_path = bg / "long/ZEN_LONG_01_STRADA_CORTILE.png"
    far_source_path = bg / "long/ZEN_FAR_SKYLINE.png"
    alpha_reference_path = bg / "layers_v2/M01/MAIN_SKY_V3.png"

    main_rgb = Image.open(main_source_path).convert("RGB")
    far_rgb = Image.open(far_source_path).convert("RGB")
    alpha_reference = Image.open(alpha_reference_path).convert("RGBA")
    if main_rgb.size != MASTER_SIZE or far_rgb.size != MASTER_SIZE or alpha_reference.size != RUNTIME_SIZE:
        raise ValueError("M01 sources must be 3840x1080 and alpha reference 2560x720")

    # Reuse the authored architectural silhouette, then soften only its alpha edge.
    # RGB comes from the untouched long master, avoiding accumulated resampling damage.
    alpha_runtime = alpha_reference.getchannel("A").filter(ImageFilter.GaussianBlur(radius=1.25))
    alpha_master = resize(alpha_runtime, MASTER_SIZE)
    main_master = main_rgb.convert("RGBA")
    main_master.putalpha(alpha_master)
    far_mask = Image.eval(alpha_master, lambda value: 255 - value)
    far_master = color_match_far(far_rgb, main_rgb, far_mask).convert("RGBA")
    foreground_master = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))

    art = project_root / "art_source/stages/stage1_zen/M01/final_v1"
    runtime = art / "runtime"
    previews = project_root / "production-preview/M01/final_v1"
    masters = {
        "far": art / "M01_FAR_MASTER.png",
        "main": art / "M01_MAIN_MASTER.png",
        "foreground": art / "M01_FOREGROUND_MASTER.png",
    }
    runtime_paths = {
        "far": runtime / "M01_FAR.png",
        "main": runtime / "M01_MAIN.png",
        "foreground": runtime / "M01_FOREGROUND.png",
    }
    save_png(far_master, masters["far"])
    save_png(main_master, masters["main"])
    save_png(foreground_master, masters["foreground"])
    runtime_far = resize(far_master, RUNTIME_SIZE)
    runtime_main = resize(main_master, RUNTIME_SIZE)
    runtime_foreground = Image.new("RGBA", RUNTIME_SIZE, (0, 0, 0, 0))
    save_png(runtime_far, runtime_paths["far"])
    save_png(runtime_main, runtime_paths["main"])
    save_png(runtime_foreground, runtime_paths["foreground"])

    marco = actor_frame(project_root / "public/assets/characters/marco_anim/idle/01.png")
    talebano = actor_frame(project_root / "public/assets/characters/talebano_anim/idle/01.png")
    proof_paths: list[Path] = []
    strips: list[Image.Image] = []
    for camera_x in CAMERAS:
        frame = crop(runtime_far, round(camera_x * FAR_PARALLAX))
        frame.alpha_composite(crop(runtime_main, camera_x))
        frame.alpha_composite(crop(runtime_foreground, camera_x))
        paste_actor(marco, frame, 390, 690)
        paste_actor(talebano, frame, 890, 690)
        draw = ImageDraw.Draw(frame, "RGBA")
        draw.rounded_rectangle((18, 16, 378, 62), radius=10, fill=(10, 12, 18, 205))
        draw.text((34, 26), f"M01 CAMERA X={camera_x}", font=font(22), fill="white")
        proof = previews / f"M01_CAMERA_X{camera_x:04d}.png"
        save_png(frame, proof)
        proof_paths.append(proof)
        strips.append(resize(overlay(frame), (640, 360)).convert("RGB"))

    sheet = Image.new("RGB", (1920, 360), (20, 20, 20))
    for index, frame in enumerate(strips):
        sheet.paste(frame, (index * 640, 0))
    sheet_path = previews / "M01_APPROVAL_CONTACT_SHEET.jpg"
    sheet.save(sheet_path, "JPEG", quality=90, optimize=True)

    alpha_hist = runtime_main.getchannel("A").histogram()
    manifest = {
        "schema": 1,
        "id": "M01_final_layers_v1",
        "status": "approval_candidate",
        "source_master": str(main_source_path.relative_to(project_root)).replace("\\", "/"),
        "far_master_source": str(far_source_path.relative_to(project_root)).replace("\\", "/"),
        "legacy_alpha_reference": str(alpha_reference_path.relative_to(project_root)).replace("\\", "/"),
        "mask_strategy": {
            "type": "authored_silhouette_softened",
            "runtime_blur_px": 1.25,
            "far_color_match": "mean_std_per_rgb_channel_against_source_sky",
            "reason": "Preserves all architecture while removing hard or cut sky edges."
        },
        "master_size": list(MASTER_SIZE),
        "runtime_size": list(RUNTIME_SIZE),
        "module_length_viewports": 2,
        "walk_band": [WALK_TOP, WALK_BOTTOM],
        "horizon_y": HORIZON_Y,
        "camera_proofs": list(CAMERAS),
        "parallax": {"far": FAR_PARALLAX, "main": 1.0, "foreground": 1.08},
        "foreground_policy": "transparent_placeholder_disabled_until_authored",
        "runtime_main_alpha": {
            "transparent_pixels": alpha_hist[0],
            "opaque_pixels": alpha_hist[255],
            "partial_pixels": sum(alpha_hist[1:255]),
        },
        "files": {
            "masters": {key: str(path.relative_to(project_root)).replace("\\", "/") for key, path in masters.items()},
            "runtime_candidates": {key: str(path.relative_to(project_root)).replace("\\", "/") for key, path in runtime_paths.items()},
            "previews": [str(path.relative_to(project_root)).replace("\\", "/") for path in proof_paths],
            "contact_sheet": str(sheet_path.relative_to(project_root)).replace("\\", "/"),
        },
    }
    all_files = [*masters.values(), *runtime_paths.values(), *proof_paths, sheet_path]
    manifest["sha256"] = {str(path.relative_to(project_root)).replace("\\", "/"): sha256(path) for path in all_files}
    manifest_path = art / "M01_FINAL_LAYERS_MANIFEST.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"M01 FINAL LAYERS PASS - {len(all_files)} files")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("project_root", nargs="?", default=".")
    args = parser.parse_args()
    main(Path(args.project_root).resolve())
