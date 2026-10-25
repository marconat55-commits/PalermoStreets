"""Build a non-runtime preview from Merco's approved pose sheet and punch pose.

The two source images remain untouched. Green-screen removal is performed first
with remove-green-screen.ps1; this script only extracts and aligns those keyed
images on the project's fixed 640x420 sprite canvas.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PILOT = ROOT / "art_source/characters/merco/pilots/combo_preview_v1"
CANVAS = (640, 420)
FEET_Y = 400
BODY_X = 320


def visible_box(image: Image.Image) -> tuple[int, int, int, int]:
    box = image.getchannel("A").point(lambda alpha: 255 if alpha >= 16 else 0).getbbox()
    if box is None:
        raise ValueError("Empty pose after keying")
    return box


def isolate_sheet() -> dict[str, Image.Image]:
    sheet = Image.open(PILOT / "sheet_alpha.png").convert("RGBA")
    if sheet.size != (1024, 1536):
        raise ValueError(f"Unexpected approved sheet size: {sheet.size}")
    poses = {
        "guard": sheet.crop((0, 0, 512, 768)),
        "charge": sheet.crop((512, 0, 1024, 768)),
    }

    # The extended fist crosses the sheet's nominal center. Select each
    # contiguous silhouette instead of cutting the lower row in half.
    lower = np.asarray(sheet.crop((0, 768, 1024, 1536)), dtype=np.uint8).copy()
    labels = Image.fromarray(lower[:, :, 3], "L").point(lambda alpha: 255 if alpha >= 16 else 0)
    if labels.getpixel((250, 300)) != 255 or labels.getpixel((800, 300)) != 255:
        raise ValueError("Pose extraction seeds no longer lie inside the silhouettes")
    ImageDraw.floodfill(labels, (250, 300), 128)
    ImageDraw.floodfill(labels, (800, 300), 64)
    label_pixels = np.asarray(labels)
    left = lower.copy()
    right = lower.copy()
    for pixels, value in ((left, 128), (right, 64)):
        mask = Image.fromarray(np.uint8(label_pixels == value) * 255, "L").filter(ImageFilter.MaxFilter(3))
        pixels[:, :, 3] = np.where(np.asarray(mask) > 0, pixels[:, :, 3], 0)
    poses["straight_one"] = Image.fromarray(left, "RGBA")
    poses["recovery"] = Image.fromarray(right, "RGBA")
    poses["straight_two"] = Image.open(PILOT / "opposite_alpha.png").convert("RGBA")
    return poses


def aligned_frame(name: str, image: Image.Image, height: int) -> Image.Image:
    crop = image.crop(visible_box(image))
    width = round(crop.width * height / crop.height)
    if width >= CANVAS[0] - 40:
        raise ValueError(f"{name}: pose too wide at target height ({width}px)")
    resized = crop.resize((width, height), Image.Resampling.LANCZOS)
    # Anchor torso rather than the full silhouette: long punches must not push
    # the feet/body across the stage just because the fist extends farther.
    alpha = np.asarray(resized.getchannel("A"))
    torso = alpha[int(height * 0.42):int(height * 0.61)] > 32
    torso_columns = np.flatnonzero(torso.sum(axis=0) > max(2, torso.shape[0] // 8))
    torso_x = int(np.median(torso_columns)) if len(torso_columns) else width // 2
    x = BODY_X - torso_x
    canvas = Image.new("RGBA", CANVAS)
    canvas.alpha_composite(resized, (x, FEET_Y - height))
    return canvas


def main() -> None:
    PILOT.mkdir(parents=True, exist_ok=True)
    raw = isolate_sheet()
    heights = {"guard": 290, "charge": 286, "straight_one": 285,
               "recovery": 290, "straight_two": 285}
    frames = {name: aligned_frame(name, pose, heights[name]) for name, pose in raw.items()}
    for name, frame in frames.items():
        frame.save(PILOT / f"{name}_640x420.png")
        print(f"{name}: {visible_box(frame)}")

    green = Image.new("RGBA", CANVAS, (15, 241, 41, 255))
    order = ["guard", "charge", "straight_one", "recovery", "guard", "straight_two", "recovery"]
    durations = [220, 100, 150, 110, 110, 170, 220]
    sequence = []
    for name in order:
        image = green.copy()
        image.alpha_composite(frames[name])
        sequence.append(image.convert("RGB"))
    sequence[0].save(PILOT / "merco_two_punch_preview.gif", save_all=True,
                     append_images=sequence[1:], duration=durations, loop=0,
                     optimize=False)

    contact = Image.new("RGBA", (CANVAS[0] * len(order), CANVAS[1]), (15, 241, 41, 255))
    for index, name in enumerate(order):
        tile = green.copy()
        tile.alpha_composite(frames[name])
        contact.alpha_composite(tile, (CANVAS[0] * index, 0))
    contact.save(PILOT / "merco_two_punch_contact.png")


if __name__ == "__main__":
    main()
