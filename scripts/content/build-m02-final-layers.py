#!/usr/bin/env python3
"""Build the approved M02 layered masters and camera proofs deterministically."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageStat


MASTER_SIZE = (3840, 1080)
RUNTIME_SIZE = (2560, 720)
VIEWPORT_SIZE = (1280, 720)
WALK_TOP = 600
WALK_BOTTOM = 705
HORIZON_Y = 300
FAR_PARALLAX = 0.22
CAMERAS = (0, 640, 1280)
# Safe sky-only window traced to remain entirely left of the nearest building.
# A soft edge blends the moving FAR into the original sky without cutting
# balconies, walls or other architecture.
SKY_CUT_RUNTIME = (
    (0, 0), (168, 0), (132, 305), (0, 305),
)


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


def build_master_alpha() -> Image.Image:
    alpha = Image.new("L", MASTER_SIZE, 255)
    scale = MASTER_SIZE[0] / RUNTIME_SIZE[0]
    polygon = [(round(x * scale), round(y * scale)) for x, y in SKY_CUT_RUNTIME]
    ImageDraw.Draw(alpha).polygon(polygon, fill=0)
    return alpha.filter(ImageFilter.GaussianBlur(radius=18))


def color_match_far(far: Image.Image, reference: Image.Image, sample_mask: Image.Image) -> Image.Image:
    far_rgb = far.convert("RGB")
    reference_rgb = reference.convert("RGB")
    far_stats = ImageStat.Stat(far_rgb, sample_mask)
    reference_stats = ImageStat.Stat(reference_rgb, sample_mask)
    matched_channels: list[Image.Image] = []
    for channel, far_mean, far_std, ref_mean, ref_std in zip(
        far_rgb.split(), far_stats.mean, far_stats.stddev, reference_stats.mean, reference_stats.stddev
    ):
        ratio = ref_std / far_std if far_std > 0.001 else 1.0
        ratio = min(1.35, max(0.65, ratio))
        lookup = [round(max(0, min(255, (value - far_mean) * ratio + ref_mean))) for value in range(256)]
        matched_channels.append(channel.point(lookup))
    return Image.merge("RGB", matched_channels)


def load_rgba(path: Path, expected_size: tuple[int, int] | None = None) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    if expected_size and image.size != expected_size:
        raise ValueError(f"{path}: size {image.size}, expected {expected_size}")
    return image


def crop_layer(image: Image.Image, x: int) -> Image.Image:
    return image.crop((x, 0, x + VIEWPORT_SIZE[0], VIEWPORT_SIZE[1]))


def paste_actor(frame: Image.Image, target: Image.Image, center_x: int, feet_y: int) -> None:
    x = center_x - frame.width // 2
    y = feet_y - 400
    target.alpha_composite(frame, (x, y))


def font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arialbd.ttf", size)
    except OSError:
        return ImageFont.load_default()


def draw_label(image: Image.Image, text: str) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle((18, 16, 356, 62), radius=10, fill=(10, 12, 18, 205))
    draw.text((34, 26), text, font=font(22), fill=(255, 255, 255, 255))


def technical_overlay(image: Image.Image) -> Image.Image:
    result = image.copy()
    draw = ImageDraw.Draw(result, "RGBA")
    draw.rectangle((0, WALK_TOP, VIEWPORT_SIZE[0], WALK_BOTTOM), fill=(34, 197, 94, 38))
    draw.line((0, WALK_TOP, VIEWPORT_SIZE[0], WALK_TOP), fill=(74, 222, 128, 255), width=3)
    draw.line((0, WALK_BOTTOM, VIEWPORT_SIZE[0], WALK_BOTTOM), fill=(74, 222, 128, 255), width=3)
    draw.line((0, HORIZON_Y, VIEWPORT_SIZE[0], HORIZON_Y), fill=(250, 204, 21, 220), width=2)
    draw.text((18, WALK_TOP + 8), "WALK 600-705", font=font(18), fill=(220, 252, 231, 255))
    draw.text((18, HORIZON_Y - 28), "HORIZON 300", font=font(18), fill=(254, 240, 138, 255))
    return result


def main(project_root: Path) -> None:
    background_root = project_root / "public/assets/backgrounds/stage1_zen"
    main_source_path = background_root / "long/ZEN_LONG_02_PORTICATO_GARAGE.png"
    far_source_path = background_root / "long/ZEN_FAR_SKYLINE.png"
    authored_main_path = background_root / "layers_v2/M02/MAIN_V2.png"
    marco_path = project_root / "public/assets/characters/marco_anim/idle/01.png"
    talebano_path = project_root / "public/assets/characters/talebano_anim/idle/01.png"

    master_main_rgb = Image.open(main_source_path).convert("RGB")
    master_far_rgb = Image.open(far_source_path).convert("RGB")
    if master_main_rgb.size != MASTER_SIZE or master_far_rgb.size != MASTER_SIZE:
        raise ValueError("M02 and FAR source masters must be 3840x1080")

    authored_main = load_rgba(authored_main_path, RUNTIME_SIZE)
    master_alpha = build_master_alpha()
    master_main = master_main_rgb.convert("RGBA")
    master_main.putalpha(master_alpha)
    far_sample_mask = Image.eval(master_alpha, lambda value: 255 - value)
    master_far = color_match_far(master_far_rgb, master_main_rgb, far_sample_mask)
    master_foreground = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))

    art_output = project_root / "art_source/stages/stage1_zen/M02/final_v1"
    runtime_output = art_output / "runtime"
    preview_output = project_root / "production-preview/M02/final_v1"

    master_paths = {
        "far": art_output / "M02_FAR_MASTER.png",
        "main": art_output / "M02_MAIN_MASTER.png",
        "foreground": art_output / "M02_FOREGROUND_MASTER.png",
    }
    save_png(master_far, master_paths["far"])
    save_png(master_main, master_paths["main"])
    save_png(master_foreground, master_paths["foreground"])

    runtime_far = resize(master_far, RUNTIME_SIZE).convert("RGBA")
    runtime_main = resize(master_main, RUNTIME_SIZE)
    runtime_foreground = Image.new("RGBA", RUNTIME_SIZE, (0, 0, 0, 0))
    runtime_paths = {
        "far": runtime_output / "M02_FAR.png",
        "main": runtime_output / "M02_MAIN.png",
        "foreground": runtime_output / "M02_FOREGROUND.png",
    }
    save_png(runtime_far, runtime_paths["far"])
    save_png(runtime_main, runtime_paths["main"])
    save_png(runtime_foreground, runtime_paths["foreground"])

    marco = load_rgba(marco_path, (640, 420))
    talebano = load_rgba(talebano_path, (640, 420))
    technical_frames: list[Image.Image] = []
    preview_paths: list[Path] = []
    for camera_x in CAMERAS:
        far_x = round(camera_x * FAR_PARALLAX)
        composite = crop_layer(runtime_far, far_x)
        composite.alpha_composite(crop_layer(runtime_main, camera_x))
        composite.alpha_composite(crop_layer(runtime_foreground, camera_x))
        paste_actor(marco, composite, 385, 690)
        paste_actor(talebano, composite, 895, 690)
        draw_label(composite, f"M02 CAMERA X={camera_x}")
        preview_path = preview_output / f"M02_CAMERA_X{camera_x:04d}.png"
        save_png(composite, preview_path)
        preview_paths.append(preview_path)
        technical_frames.append(resize(technical_overlay(composite), (640, 360)).convert("RGB"))

    contact = Image.new("RGB", (1920, 360), (20, 20, 20))
    for index, frame in enumerate(technical_frames):
        contact.paste(frame, (index * 640, 0))
    contact_path = preview_output / "M02_APPROVAL_CONTACT_SHEET.jpg"
    contact.save(contact_path, format="JPEG", quality=90, optimize=True)

    alpha = runtime_main.getchannel("A")
    alpha_histogram = alpha.histogram()
    manifest = {
        "schema": 1,
        "id": "M02_final_layers_v1",
        "status": "approved",
        "source_master": str(main_source_path.relative_to(project_root)).replace("\\", "/"),
        "far_master_source": str(far_source_path.relative_to(project_root)).replace("\\", "/"),
        "legacy_alpha_reference": str(authored_main_path.relative_to(project_root)).replace("\\", "/"),
        "mask_strategy": {
            "type": "soft_sky_window",
            "runtime_points": [list(point) for point in SKY_CUT_RUNTIME],
            "feather_master_px": 18,
            "far_color_match": "mean_std_per_rgb_channel_against_source_sky",
            "reason": "Replaces the rejected curved V2 edge without cutting any architecture."
        },
        "master_size": list(MASTER_SIZE),
        "runtime_size": list(RUNTIME_SIZE),
        "walk_band": [WALK_TOP, WALK_BOTTOM],
        "horizon_y": HORIZON_Y,
        "camera_proofs": list(CAMERAS),
        "parallax": {"far": FAR_PARALLAX, "main": 1.0, "foreground": 1.08},
        "foreground_policy": "transparent_placeholder_disabled_until_authored",
        "runtime_main_alpha": {
            "transparent_pixels": alpha_histogram[0],
            "opaque_pixels": alpha_histogram[255],
            "partial_pixels": sum(alpha_histogram[1:255]),
        },
        "files": {
            "masters": {key: str(value.relative_to(project_root)).replace("\\", "/") for key, value in master_paths.items()},
            "runtime_candidates": {key: str(value.relative_to(project_root)).replace("\\", "/") for key, value in runtime_paths.items()},
            "previews": [str(value.relative_to(project_root)).replace("\\", "/") for value in preview_paths],
            "contact_sheet": str(contact_path.relative_to(project_root)).replace("\\", "/"),
        },
    }
    manifest["sha256"] = {
        str(path.relative_to(project_root)).replace("\\", "/"): sha256(path)
        for path in [*master_paths.values(), *runtime_paths.values(), *preview_paths, contact_path]
    }
    manifest_path = art_output / "M02_FINAL_LAYERS_MANIFEST.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"M02 FINAL LAYERS PASS - {len(manifest['sha256'])} files, manifest {manifest_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("project_root", nargs="?", default=".")
    args = parser.parse_args()
    main(Path(args.project_root).resolve())
