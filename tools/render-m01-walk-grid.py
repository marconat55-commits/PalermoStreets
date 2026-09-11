#!/usr/bin/env python3
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "production-preview" / "M01" / "final_v1" / "M01_WALK_GRID_CURRENT.png"


def interpolate(points, x):
    if x <= points[0][0]:
        return points[0][1]
    for left, right in zip(points, points[1:]):
        if x <= right[0]:
            t = (x - left[0]) / (right[0] - left[0])
            return left[1] + (right[1] - left[1]) * t
    return points[-1][1]


stage = json.loads((ROOT / "public/data/stage1_zen.json").read_text(encoding="utf-8"))
module = next(item for item in stage["modules"] if item["id"] == "M01")
canvas = Image.new("RGBA", (module["world_width"], 720), "#111318")

for plane in ("far", "main"):
    layer = next(item for item in module["background_layers"] if item["plane"] == plane)
    source = Image.open(ROOT / "public" / layer["src"]).convert("RGBA")
    size = (int(layer.get("width", source.width)), int(layer.get("height", source.height)))
    if source.size != size:
        source = source.resize(size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(source, (int(layer.get("x", 0)), int(layer.get("y", 0))))

overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)
font = ImageFont.load_default(size=18)
font_large = ImageFont.load_default(size=24)

for x in range(0, module["world_width"] + 1, 50):
    major = x % 100 == 0
    draw.line((x, 0, x, 720), fill=(255, 255, 255, 95 if major else 42), width=2 if major else 1)
    if major and x < module["world_width"]:
        draw.rectangle((x + 3, 4, x + 74, 28), fill=(0, 0, 0, 185))
        draw.text((x + 7, 6), f"X{x}", fill="white", font=font)

for y in range(0, 721, 50):
    major = y % 100 == 0
    draw.line((0, y, module["world_width"], y), fill=(255, 255, 255, 95 if major else 42), width=2 if major else 1)
    label = f"Y{y}"
    draw.rectangle((4, y + 3, 66, y + 28), fill=(0, 0, 0, 185))
    draw.text((8, y + 5), label, fill="white", font=font)

top = [(x, interpolate(module["walk_top"], x)) for x in range(0, module["world_width"] + 1, 8)]
bottom = [(x, interpolate(module["walk_bottom"], x)) for x in range(0, module["world_width"] + 1, 8)]
draw.line(top, fill=(255, 220, 30, 255), width=6)
draw.line(bottom, fill=(255, 55, 65, 255), width=5)
draw.rectangle((80, 42, 650, 82), fill=(0, 0, 0, 205), outline=(255, 220, 30, 255), width=2)
draw.text((96, 50), "GIALLO = WALKLINE ATTUALE  |  ROSSO = LIMITE BASSO", fill="white", font=font_large)

Image.alpha_composite(canvas, overlay).convert("RGB").save(OUT, quality=95)
print(f"M01 WALK GRID PASS - {OUT.relative_to(ROOT)}")
