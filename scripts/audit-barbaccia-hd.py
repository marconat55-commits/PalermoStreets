"""Audit riproducibile del master e del pilot HD canonico di Barbaccia."""
import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art_source/stage1_zen/barbaccia_hd_master"
MANIFEST_PATH = SOURCE / "walk_manifest_v1.json"
OUTPUT = SOURCE.parent / "barbaccia_hd_pose_audit.json"

manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8-sig"))
master_path = SOURCE / manifest["identity_master"]
frames = []
errors = []

for spec in manifest["frames"]:
    path = SOURCE / spec["file"]
    image = Image.open(path).convert("RGBA")
    alpha_bounds = image.getchannel("A").point(lambda alpha: 255 if alpha >= 16 else 0).getbbox()
    record = {
        "path": path.relative_to(ROOT).as_posix(),
        "size": list(image.size),
        "alpha_bounds": alpha_bounds,
        "pixel_sha256": hashlib.sha256(image.tobytes()).hexdigest(),
    }
    frames.append(record)
    if image.size != (640, 420) or not alpha_bounds or alpha_bounds[3] != 400:
        errors.append(record["path"])

master = Image.open(master_path).convert("RGBA")
report = {
    "schema": 2,
    "character": "barbaccia",
    "canonical_identity_master": master_path.relative_to(ROOT).as_posix(),
    "canonical_master_size": list(master.size),
    "canonical_master_sha256": hashlib.sha256(master_path.read_bytes()).hexdigest(),
    "style_reference": [
        "art_source/characters/marco/MARCO_MASTER_APPROVED.png",
        "art_source/characters/merco/approved/MERCO_MASTER_APPROVED_CHROMA.png",
    ],
    "walk_frames": frames,
    "format_errors": errors,
    "unique_pixel_frames": len({frame["pixel_sha256"] for frame in frames}),
    "motion_approved": False,
    "visual_findings": [
        "Il master HD scelto dall'utente e' l'unico riferimento canonico di identita.",
        "Le quattro pose di camminata restano art_review_only e richiedono verifica in movimento.",
        "Le viste frontale e tre quarti storiche servono solo come supporto anatomico.",
    ],
}
OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(frames)} frame HD; {len(errors)} errori di formato; master {master.size[0]}x{master.size[1]}")
if errors:
    raise SystemExit(1)
