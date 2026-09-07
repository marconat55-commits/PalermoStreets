from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw


MODULE_PATH = Path(__file__).with_name("normalize_frames.py")
SPEC = importlib.util.spec_from_file_location("normalize_frames", MODULE_PATH)
assert SPEC and SPEC.loader
normalize_frames = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(normalize_frames)

KEN_MODULE_PATH = Path(__file__).parents[2] / "scripts" / "build-ken-reference.py"
KEN_SPEC = importlib.util.spec_from_file_location("build_ken_reference", KEN_MODULE_PATH)
assert KEN_SPEC and KEN_SPEC.loader
build_ken_reference = importlib.util.module_from_spec(KEN_SPEC)
sys.modules[KEN_SPEC.name] = build_ken_reference
KEN_SPEC.loader.exec_module(build_ken_reference)


def make_frame(path: Path, bounds: tuple[int, int, int, int]) -> None:
    image = Image.new("RGBA", (1000, 1000), (0, 0, 0, 0))
    ImageDraw.Draw(image).rectangle(bounds, fill=(255, 255, 255, 255))
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


class FixedCharacterScaleTest(unittest.TestCase):
    def test_crouch_stays_short_and_jump_preserves_height(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({
                "character_id": "test",
                "render": {
                    "runtime_width": 640,
                    "runtime_height": 420,
                    "visual_height": 290,
                    "baseline_y": 400,
                    "scale_reference": {"clip": "idle", "frame": 1},
                },
                "clips": {"idle": {}, "crouch": {}, "jump": {}},
            }), encoding="utf-8")
            make_frame(root / "input/raw/idle/01.png", (400, 200, 500, 700))
            make_frame(root / "input/raw/crouch/01.png", (400, 450, 550, 700))
            make_frame(root / "input/raw/jump/01.png", (400, 250, 500, 500))

            report = normalize_frames.normalize(manifest, root / "input", root / "output")
            idle = report["clips"]["idle"][0]["runtime_bounds"]
            crouch = report["clips"]["crouch"][0]["runtime_bounds"]
            jump = report["clips"]["jump"][0]["runtime_bounds"]

            self.assertAlmostEqual(idle[3] - idle[1], 290, delta=2)
            self.assertAlmostEqual(crouch[3] - crouch[1], 145, delta=2)
            self.assertLess(jump[3], 300)
            self.assertAlmostEqual(idle[3], 400, delta=1)
            self.assertAlmostEqual(crouch[3], 400, delta=1)

    def test_ken_grounded_flag_does_not_rescale_sprite(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source_path = Path(directory) / "ken.png"
            make_frame(source_path, (10, 20, 49, 79))
            frame = build_ken_reference.AirFrame(0, 0, 0, 0, 4, "")
            info = build_ken_reference.SpriteInfo(1000, 1000, 30, 79)
            grounded = build_ken_reference.render_frame(frame, info, source_path, True)
            airborne = build_ken_reference.render_frame(frame, info, source_path, False)
            self.assertEqual(grounded.tobytes(), airborne.tobytes())


if __name__ == "__main__":
    unittest.main()
