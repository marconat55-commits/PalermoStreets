"""Bake approved source proportions into new runtime copies; never edit masters."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'art_source/stage1_zen/characters_candidates/u_tignusu'
OUT = ROOT / 'public/assets/characters/u_tignusu_anim'

def frame(source, folder, number, height):
    image = Image.open(source).convert('RGBA')
    # Match the approved preview's alpha bounds and uniform aspect ratio.
    box = image.getchannel('A').point(lambda a: 255 if a > 180 else 0).getbbox()
    crop = image.crop(box)
    size = (round(crop.width * height / crop.height), round(height))
    assert size[0] < 610 and size[1] < 390, size
    sprite = crop.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (640, 420))
    canvas.alpha_composite(sprite, ((640-size[0])//2, 400-size[1]))
    dest = OUT / folder / f'{number:02}.png'
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest)

master = ROOT / 'art_source/stage1_zen/characters_master/transparent/U_TIGNUSU_MASTER.png'
frame(master, 'idle', 1, 300)
for n in range(1, 9):
    frame(SRC / f'walk_ken_clone_v1/U_TIGNUSU_WALK_KEN_{n:02}_CANDIDATE.png', 'walk', n, 300)
for n, name in enumerate(['U_TIGNUSU_PUNCH_KEN_01_CANDIDATE.png', 'U_TIGNUSU_PUNCH_KEN_02_ALPHA.png', 'U_TIGNUSU_PUNCH_KEN_04_CANDIDATE.png'], 1):
    frame(SRC / 'attack_ken_clone_v1' / name, 'attack', n, 300)
frame(master, 'attack', 4, 300)
frame(SRC / 'reactions_arcade_v1/U_TIGNUSU_HIT_HAGGAR_02_CANDIDATE.png', 'hit', 1, 275)
frame(master, 'hit', 2, 300)
frame(SRC / 'reactions_arcade_v1/U_TIGNUSU_THROW_AIR_KEN_FALL_01_CANDIDATE.png', 'fall', 1, 210)
frame(SRC / 'getup_haggar_v1/01_ground_approved.png', 'fall', 2, 130*300/340)
for n, (name, h) in enumerate([('01_ground_approved.png',130),('02_seated_candidate.png',180),('03_push_candidate.png',205),('04_guard_reference.png',340)],1):
    frame(SRC / 'getup_haggar_v1' / name, 'getup', n, h*300/340)
assert (OUT/'fall/02.png').read_bytes() == (OUT/'getup/01.png').read_bytes()

def clip(folder, durations, loop=False, **extra):
    return dict(folder=folder, frames=len(durations), durations=durations, visual_scales=[1], loop=loop, source_facing=1, **extra)
profile = dict(schema=1, id='u_tignusu', display_name='U TIGNUSU', role='enemy', height_cm=185,
    body_type='massiccio', visual_height=300,
    assets=dict(master_root='assets/characters/u_tignusu', animation_root='assets/characters/u_tignusu_anim', texture_atlas='assets/characters/u_tignusu_anim/atlas/atlas.json', frame_meta='data/generated/characters/u_tignusu.frame_meta.json'),
    identity=dict(canon='Pose originali approvate in chat, prova isolata del 24 ottobre 2026'),
    gameplay=dict(enemy=dict(health=240, aggression=.8, move_speed_scale=.82, damage_scale=.65, attack_speed_scale=.85, heavy_chance=0, cooldown_scale=1.3, collision_scale=1.1, visual_scale=1, label='U TIGNUSU')),
    factory=dict(recipe='approved_pose_pilot', animation_canvas=[640,420], baseline_y=400, content_bottom_y=400, scale_mode='baked', attack_slots=1, dodge_slots=0),
    animations=dict(idle=clip('idle',[.6],True),walk=clip('walk',[.11]*8,True,reference_speed=110),
      attack=clip('attack',[.14,.1,.15,.12],contact_frame=2),heavy=clip('attack',[.14,.1,.15,.12],contact_frame=2),
      hit=clip('hit',[.13,.1]),knockdown=clip('fall',[.25,.4]),dead=clip('fall',[.25,9]),getup=clip('getup',[.18,.2,.18,.14])))
(ROOT/'public/data/characters/u_tignusu.json').write_text(json.dumps(profile,indent=2)+'\n',encoding='utf-8')
index_path=ROOT/'public/data/characters/index.json'
index=json.loads(index_path.read_text(encoding='utf-8'))
if 'u_tignusu' not in index['characters']: index['characters'].append('u_tignusu')
index_path.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
stage=json.loads((ROOT/'public/data/stage1_zen.json').read_text(encoding='utf-8'))
module=stage['modules'][0]
module.update(name='PROVA U TIGNUSU',world_width=1280,camera_bounds=[0,0],entry=[350,640],exit_x=1250,character_scale=1,ambient=[],items=[],walk_top=[[0,585],[1280,585]],walk_bottom=[[0,705],[1280,705]],waves=[dict(character='u_tignusu',spawns=[[900,640]],health=240,batch_size=1,lock_stage=True,trigger_x=0)])
stage.update(stage_name='PROVA U TIGNUSU',stage_subtitle='J: pugno / presa · K: lancio durante presa · ricarica per riprovare',modules=[module])
(ROOT/'public/data/stage_tignusu_pilot.json').write_text(json.dumps(stage,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('U Tignusu: runtime copies, profile and isolated stage prepared')
