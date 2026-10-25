"""Extract Mark Nat's approved-style reaction sheets into 640x420 game frames.

The two generated sheets are preserved in art_source. Extraction uses the alpha
silhouette rather than grid cuts because hands and shoes can cross a cell edge.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art_source/characters/mark_nat/reactions_v1"
OUTPUT = SOURCE / "runtime_frames"
CANVAS = (640, 420)


def components(path: Path) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    width, height = sheet.size
    poses: list[Image.Image] = []
    for row in range(2):
        for col in range(2):
            x0, x1 = col * width // 2, (col + 1) * width // 2
            y0, y1 = row * height // 2, (row + 1) * height // 2
            margin = 32
            left, top = max(0, x0 - margin), max(0, y0 - margin)
            right, bottom = min(width, x1 + margin), min(height, y1 + margin)
            crop = sheet.crop((left, top, right, bottom))
            visible = np.asarray(crop.getchannel("A"), dtype=np.uint8) >= 32
            labels = Image.fromarray(np.where(visible, 255, 0).astype(np.uint8), "L").copy()
            candidates = np.argwhere(visible[max(0, y0 - top):y1 - top, max(0, x0 - left):x1 - left])
            if len(candidates) == 0:
                raise ValueError(f"Missing figure in {path.name} quadrant {row},{col}")
            center = np.array([(y0 + y1) / 2 - top, (x0 + x1) / 2 - left])
            relative = candidates + np.array([y0 - top, x0 - left])
            sy, sx = relative[np.argmin(np.sum((relative - center) ** 2, axis=1))]
            ImageDraw.floodfill(labels, (int(sx), int(sy)), 1)
            selected = np.asarray(labels) == 1
            ys, xs = np.nonzero(selected)
            if len(xs) == 0:
                raise ValueError(f"Could not isolate figure in {path.name} quadrant {row},{col}")
            bounds = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
            print(path.name, row, col, bounds)
            pixels = np.asarray(crop).copy()
            pixels[:, :, 3] = np.where(selected, pixels[:, :, 3], 0)
            poses.append(Image.fromarray(pixels, "RGBA").crop(bounds))
    return poses


def align(image: Image.Image, *, max_width: int, max_height: int, bottom: int = 400) -> Image.Image:
    scale = min(max_width / image.width, max_height / image.height)
    scaled = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS)
    canvas.alpha_composite(scaled, ((CANVAS[0] - scaled.width) // 2, bottom - scaled.height))
    return canvas


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    hit = components(SOURCE / "hit_fall_sheet.png")
    ground = components(SOURCE / "ground_getup_sheet.png")
    specs = {
        "hit_01": (hit[0], 310, 290, 400),
        "hit_02": (hit[1], 330, 280, 400),
        "hit_03": (hit[2], 350, 250, 400),
        "fall_01": (hit[2], 350, 250, 400),
        "fall_02": (hit[3], 390, 215, 362),
        "fall_03": (ground[0], 320, 175, 400),
        "fall_04": (ground[1], 315, 120, 400),
        "getup_02": (ground[2], 320, 180, 400),
        "getup_03": (ground[3], 320, 225, 400),
    }
    for name, (image, max_width, max_height, bottom) in specs.items():
        frame = align(image, max_width=max_width, max_height=max_height, bottom=bottom)
        frame.save(OUTPUT / f"{name}.png", optimize=True)

    labels = ["hit_01", "hit_02", "hit_03", "fall_01", "fall_02",
              "fall_03", "fall_04", "getup_02", "getup_03"]
    preview = Image.new("RGB", (1600, 520), (36, 39, 43))
    draw = ImageDraw.Draw(preview)
    for index, label in enumerate(labels):
        frame = Image.open(OUTPUT / f"{label}.png").convert("RGBA")
        thumb = frame.resize((320, 210), Image.Resampling.LANCZOS)
        x, y = (index % 5) * 320, (index // 5) * 260
        preview.paste(thumb, (x, y + 24), thumb)
        draw.text((x + 12, y + 8), label, fill=(245, 239, 221))
    preview.save(SOURCE / "reaction_preview.png", optimize=True)


if __name__ == "__main__":
    main()
