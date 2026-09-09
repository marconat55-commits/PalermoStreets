#!/usr/bin/env python3
"""Render the authored WALK polygons over the exact Stage 1 runtime composition."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "build" / "stage_walk_audit"


def interpolate(points, x, fallback):
    if not points:
        return fallback
    if x <= points[0][0]:
        return points[0][1]
    for left, right in zip(points, points[1:]):
        if x <= right[0]:
            span = right[0] - left[0]
            return right[1] if span <= 0 else left[1] + (right[1] - left[1]) * ((x - left[0]) / span)
    return points[-1][1]


def runtime_layer(module):
    main = next(layer for layer in module["background_layers"] if layer["plane"] == "main")
    source = Image.open(ROOT / "public" / main["src"]).convert("RGBA")
    width, height = int(main.get("width", source.width)), int(main.get("height", source.height))
    if source.size != (width, height):
        source = source.resize((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (module["world_width"], 720), (18, 20, 26, 255))
    canvas.alpha_composite(source, (int(main.get("x", 0)), int(main.get("y", 0))))
    return canvas


def actor(draw, x, feet, height=290, color=(255, 255, 255, 230)):
    head_radius = 18
    top = feet - height
    draw.ellipse((x-head_radius, top, x+head_radius, top+head_radius*2), outline=color, width=5)
    shoulder = top + 70
    hip = feet - 105
    draw.line((x, top+36, x, hip), fill=color, width=7)
    draw.line((x, shoulder, x-58, shoulder+92), fill=color, width=7)
    draw.line((x, shoulder, x+58, shoulder+92), fill=color, width=7)
    draw.line((x, hip, x-45, feet), fill=color, width=7)
    draw.line((x, hip, x+45, feet), fill=color, width=7)


def render(module):
    image = runtime_layer(module)
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    fallback = module["playfield_y"]
    step = 16
    top = [(x, interpolate(module.get("walk_top"), x, fallback[0])) for x in range(0, module["world_width"]+1, step)]
    bottom = [(x, interpolate(module.get("walk_bottom"), x, fallback[1])) for x in range(0, module["world_width"]+1, step)]
    polygon = top + list(reversed(bottom))
    draw.polygon(polygon, fill=(15, 220, 110, 70), outline=(60, 255, 150, 255), width=5)
    draw.line(top, fill=(255, 210, 45, 255), width=5)
    draw.line(bottom, fill=(255, 80, 95, 255), width=5)
    for x in range(320, module["world_width"], 640):
        feet = (interpolate(module.get("walk_top"), x, fallback[0]) + interpolate(module.get("walk_bottom"), x, fallback[1])) / 2
        actor(draw, x, feet)
    draw.rectangle((12, 12, 650, 72), fill=(0, 0, 0, 190))
    draw.text((28, 24), f'{module["id"]}  WALK: giallo=alto, rosso=basso, verde=area piedi', fill="white", font=ImageFont.load_default(size=22))
    result = Image.alpha_composite(image, overlay).convert("RGB")
    result.save(OUT / f'{module["id"]}_walk_overlay.jpg', quality=92, optimize=True)
    return result


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    stage = json.loads((ROOT / "public" / "data" / "stage1_zen.json").read_text(encoding="utf-8"))
    previews = []
    for module in stage["modules"]:
        full = render(module)
        ratio = 1400 / full.width
        previews.append(full.resize((1400, round(full.height * ratio)), Image.Resampling.LANCZOS))
    sheet = Image.new("RGB", (1400, sum(image.height for image in previews)), "#111318")
    y = 0
    for image in previews:
        sheet.paste(image, (0, y)); y += image.height
    sheet.save(OUT / "stage1_walk_contact_sheet.jpg", quality=92, optimize=True)
    print(f"STAGE WALK AUDIT PASS - {len(previews)} moduli in {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
