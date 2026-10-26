"""Normalize one approved-face Mark Nat idle pose and preview it beside guard."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art_source/characters/mark_nat/idle_wrist_v1"
GUARD = ROOT / "art_source/characters/merco/pilots/combo_preview_v1/guard_640x420.png"
CANVAS = (640, 420)


def main() -> None:
    figure = Image.open(SOURCE / "wrist_check_source.png").convert("RGBA")
    alpha = figure.getchannel("A").point(lambda value: value if value >= 16 else 0)
    figure.putalpha(alpha)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("Mark Nat idle pose has no visible figure")
    figure = figure.crop(bounds)
    height = 285
    width = round(figure.width * height / figure.height)
    figure = figure.resize((width, height), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", CANVAS)
    frame.alpha_composite(figure, ((CANVAS[0] - width) // 2, 400 - height))
    frame.save(SOURCE / "wrist_check_640x420.png", optimize=True)

    preview = Image.new("RGB", (640, 250), (38, 42, 46))
    draw = ImageDraw.Draw(preview)
    for index, (label, image) in enumerate((
        ("GUARDIA APPROVATA", Image.open(GUARD).convert("RGBA")),
        ("POLSO / VOLTO CORRETTO", frame),
    )):
        thumb = image.resize((320, 210), Image.Resampling.LANCZOS)
        preview.paste(thumb, (index * 320, 28), thumb)
        draw.text((index * 320 + 10, 10), label, fill=(246, 236, 213))
    preview.save(SOURCE / "preview.png", optimize=True)


if __name__ == "__main__":
    main()
