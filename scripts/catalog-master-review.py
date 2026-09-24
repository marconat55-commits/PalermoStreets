"""Read-only source audit; writes only review thumbnails, inventory and gallery."""
from pathlib import Path
from collections import defaultdict
import hashlib, json, html
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/reviews/masters-2026-09-24'
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'thumbs').mkdir(exist_ok=True)
previous = json.loads((OUT/'inventory.json').read_text(encoding='utf-8')) if (OUT/'inventory.json').exists() else {'items': []}
previous_ids = {r['path']: r['id'] for r in previous['items']}
next_id = max((int(v[1:]) for v in previous_ids.values()), default=0) + 1
items = []
def add(path, character, status, category):
    if path.is_file():
        items.append(dict(path=path.relative_to(ROOT).as_posix(), character=character, status=status, category=category))

for p in sorted((ROOT/'art_source/characters').rglob('*.png')):
    rel = p.relative_to(ROOT/'art_source/characters')
    if any(x in p.name.upper() for x in ('MASTER','PORTRAIT')) or 'keyframes' in rel.parts:
        add(p, rel.parts[0].replace('merco_arcade','merco'), 'Approvazione indicata nel nome/cartella; da riconciliare' if 'arcade' not in str(rel) else 'Variante arcade: non equiparare al master HD', 'identità' if 'keyframes' not in rel.parts else 'posa')
for p in sorted((ROOT/'art_source/stage1_zen/characters_master').rglob('*.png')):
    name = p.stem.split('_MASTER')[0].split('_SELECT')[0].split('_CARD')[0].lower()
    add(p, name, 'Riferimento approvato secondo master_manifest; versione storica', 'identità')
for p in sorted((ROOT/'art_source/stage1_zen/approved_bundle_2026_09_06').rglob('*.png')):
    if 'CHARACTERS' in p.parts:
        add(p, p.parent.name.lower(), 'Bundle denominato approved 06/09; versione da confrontare', 'identità')
add(ROOT/'art_source/stage1_zen/barbaccia_hd_master/BARBACCIA_HD_USER_MASTER.png', 'barbaccia', 'CONFERMATO: scelta esplicita utente 24/09, riferimento corrente', 'identità')
add(ROOT/'art_source/stage1_zen/barbaccia_arcade_v1/BARBACCIA_ARCADE_MASTER_GUARD_V1.png', 'barbaccia', 'SUPERATO: direzione arcade scartata dall’utente', 'esperimento')
for p in sorted((ROOT/'art_source/stage1_zen/enemy_motion_pilots_2026_09_20').glob('*.png')):
    add(p, 'barbaccia' if 'BARBACCIA' in p.name else 'pino_u_pizzettu', 'Pilot sperimentale: ciclo non approvato', 'esperimento')
for profile in sorted((ROOT/'public/data/characters').glob('*.json')):
    data = json.loads(profile.read_text(encoding='utf-8-sig'))
    if 'assets' not in data: continue
    root = data['assets'].get('animation_root')
    if root:
        add(ROOT/'public'/root/'idle/01.png', data['id'], 'Reference MUGEN, non personaggio originale' if data['id'].endswith('_ref') else 'Campione runtime attuale; non prova di approvazione master', 'runtime')

items.sort(key=lambda x:(x['character'], x['category'], x['path']))
hashes = defaultdict(list)
pixels = defaultdict(list)
for i, row in enumerate(items,1):
    row['id'] = previous_ids.get(row['path'])
    if row['id'] is None:
        row['id'] = f'M{next_id:03}'
        next_id += 1
    p = ROOT/row['path']
    row['sha256'] = hashlib.sha256(p.read_bytes()).hexdigest()
    im = Image.open(p).convert('RGBA')
    row['size'] = list(im.size)
    row['pixel_hash'] = hashlib.sha256(str(im.size).encode()+im.tobytes()).hexdigest()
    hashes[row['sha256']].append(row['id'])
    pixels[row['pixel_hash']].append(row['id'])
    thumb = Image.new('RGB',(300,260),'#343b46')
    small = ImageOps.contain(im,(296,256))
    thumb.paste(small,((300-small.width)//2,(260-small.height)//2),small)
    thumb.save(OUT/'thumbs'/f"{row['id']}.jpg",quality=88)
duplicates = [v for v in hashes.values() if len(v)>1]
active_ids = {r['id'] for r in items}
for old in previous['items']:
    if old['id'] not in active_ids:
        (OUT/'thumbs'/f"{old['id']}.jpg").unlink(missing_ok=True)
pixel_duplicates = [v for v in pixels.values() if len(v)>1]
(OUT/'inventory.json').write_text(json.dumps(dict(scope='Repository corrente; non include allegati remoti non importati. Nessuna cancellazione.',items=items,byte_duplicates=duplicates,pixel_duplicates=pixel_duplicates),ensure_ascii=False,indent=2),encoding='utf-8')
groups = defaultdict(list)
for row in items: groups[row['character']].append(row)
parts = ['<!doctype html><meta charset="utf-8"><title>Palermo Streets — revisione master</title><style>body{background:#171c25;color:#edf0f6;font:16px system-ui;margin:28px}h2{margin-top:48px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:15px}article{background:#252e3b;padding:14px;border-radius:8px}img{width:100%;height:260px;object-fit:contain}small{overflow-wrap:anywhere}a{color:#85d7ff}.status{color:#ffe093}</style><h1>Revisione master — Palermo Streets</h1><p>Ogni codice identifica un file preciso. Nessun file eliminato. Originale e trasparente possono essere versioni di lavorazione legittime. I campioni runtime non sono master approvati. Ambito: file presenti nel repository.</p><p>Barbaccia: il master HD scelto il 24/09 prevale sulla versione arcade. Le altre approvazioni riportano la provenienza documentale e richiedono confronto visivo.</p>']
parts.append('<p>Duplicati byte-identici: '+html.escape(str(duplicates))+'</p>')
parts.append('<p>Decisione utente: Marco, Merco e Pino U Pizzettu sono tre personaggi distinti; non vanno unificati come cloni.</p>')
for name, rows in groups.items():
    parts.append(f'<h2>{html.escape(name.upper())}</h2><div class="grid">')
    for row in rows:
        src = '../../../'+row['path']
        parts.append(f'<article><b>{row["id"]} · {row["category"]}</b><a href="{html.escape(src)}"><img loading="lazy" src="thumbs/{row["id"]}.jpg"></a><p class="status">{html.escape(row["status"])}</p><small>{html.escape(row["path"])}<br>{row["size"]}</small></article>')
    parts.append('</div>')
(OUT/'index.html').write_text(''.join(parts),encoding='utf-8')
# One overview card per character; detailed alternatives remain in gallery.
selected=[]
for name, rows in groups.items():
    choice = next((r for r in rows if 'CONFERMATO' in r['status']),None)
    choice = choice or next((r for r in rows if 'MASTER_3Q' in r['path'] and '/transparent/' in r['path']),None)
    choice = choice or next((r for r in rows if '/transparent/' in r['path']),None) or rows[0]
    selected.append(choice)
sheet=Image.new('RGB',(1200,310*((len(selected)+3)//4)),'#171c25')
draw=ImageDraw.Draw(sheet)
for i,r in enumerate(selected):
    x,y=(i%4)*300,(i//4)*310
    sheet.paste(Image.open(OUT/'thumbs'/f"{r['id']}.jpg"),(x,y))
    draw.text((x+8,y+266),r['character'].upper(),fill='white')
    draw.text((x+8,y+284),r['id']+' | vedere alternative in galleria',fill='#a9c5d8')
sheet.save(OUT/'overview.jpg',quality=90)
print(json.dumps(dict(files=len(items),characters=list(groups),byte_duplicates=duplicates,pixel_duplicates=pixel_duplicates),indent=2))
