"""Read-only pixel audit of enemy candidates; writes a reproducible inventory only."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art_source/stage1_zen'
manifest_path = ART / 'barbaccia_arcade_v1/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8-sig'))
frames = []
errors = []
for clip in ('idle', 'walk', 'quick_attack'):
    for spec in manifest[clip]:
        path = manifest_path.parent / spec['frame']
        im = Image.open(path).convert('RGBA')
        bbox = im.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
        digest = hashlib.sha256(im.tobytes()).hexdigest()
        record = dict(clip=clip, path=path.relative_to(ROOT).as_posix(), size=list(im.size),
                      alpha_bounds=bbox, pixel_sha256=digest)
        frames.append(record)
        if im.size != (640, 420) or not bbox or bbox[3] != 400:
            errors.append(record['path'])

inventory = []
for path in sorted(ART.rglob('*.png')):
    if not any(name in path.as_posix().lower() for name in ('barbaccia', 'pizzettu')):
        continue
    relative = path.relative_to(ROOT).as_posix()
    status = 'identity_master' if 'approved_bundle_' in relative else 'experimental'
    inventory.append(dict(path=relative, status=status, bytes=path.stat().st_size,
                          sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
report = dict(schema=1, inventory=inventory, arcade_frames=frames,
              format_errors=errors, unique_pixel_frames=len({x['pixel_sha256'] for x in frames}),
              motion_approved=False,
              visual_findings=[
                  'Walk pass_right/pass_left require anatomical alternation review.',
                  'Attack-to-idle body size and foot placement need transition review.',
                  'Pino V2 has blue edge fringes and only four concept poses.',
                  'Pixel uniqueness and baseline checks do not certify animation quality.',
              ])
output = ART / 'enemy_pose_audit.json'
output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(f'{len(inventory)} source images; {len(frames)} frames; {len(errors)} format errors')
if errors:
    raise SystemExit(1)
