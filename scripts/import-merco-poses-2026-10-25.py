"""Bake the nine approved, keyed Merco poses into fixed runtime canvases.

The original chroma PNGs and keyed alpha PNGs live in art_source and are never
modified. Run scripts/remove-green-screen.ps1 on the chroma files first.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'art_source/characters/merco/approved/poses_2026_10_25/alpha'
RUNTIME = ROOT / 'public/assets/characters/merco_anim'

# Heights are baked per pose so crouch and extension read naturally against the
# approved 290 px upright Merco while all runtime scales remain exactly 1.0.
POSES = {
    'guard_recovery': 290,
    'return_opposite': 282,
    'first_straight': 275,
    'second_straight': 275,
    'uppercut_charge': 268,
    'uppercut_impact': 285,
    'recovery_uppercut': 282,
    'super_charge': 268,
    'run_brake': 267,
}

CLIPS = {
    'punch_left': ['guard_recovery', 'return_opposite', 'first_straight', 'guard_recovery'],
    'punch_right': ['return_opposite', 'second_straight', 'recovery_uppercut', 'guard_recovery'],
    'combo_finisher': ['uppercut_charge', 'uppercut_impact', 'recovery_uppercut', 'guard_recovery'],
    'super': ['super_charge', 'first_straight', 'uppercut_impact', 'recovery_uppercut', 'guard_recovery'],
    'brake': ['run_exit', 'run_brake', 'guard_recovery'],
}


def bake(name: str, height: int) -> Image.Image:
    source = Image.open(SOURCES / f'{name}.png').convert('RGBA')
    alpha = source.getchannel('A')
    box = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
    if box is None:
        raise ValueError(f'{name}: empty silhouette')
    crop = source.crop(box)
    size = (round(crop.width * height / crop.height), height)
    if size[0] >= 610 or size[1] >= 390:
        raise ValueError(f'{name}: sprite exceeds safe canvas margins: {size}')
    sprite = crop.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (640, 420), (0, 0, 0, 0))
    canvas.alpha_composite(sprite, ((640 - size[0]) // 2, 400 - size[1]))
    return canvas


frames = {name: bake(name, height) for name, height in POSES.items()}
frames['run_exit'] = Image.open(RUNTIME / 'run/06.png').convert('RGBA')
for clip, sequence in CLIPS.items():
    for index, name in enumerate(sequence, 1):
        destination = RUNTIME / clip / f'{index:02}.png'
        destination.parent.mkdir(parents=True, exist_ok=True)
        frames[name].save(destination)
        print(f'{clip}/{index:02}: {name}, bounds={frames[name].getchannel("A").getbbox()}')
