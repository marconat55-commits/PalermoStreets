from __future__ import annotations

from pathlib import Path

TITLE = "Minchia Fighters: Palermo Streets — Character Polish v0.7.8"
VERSION = "0.7.8"
LOGICAL_WIDTH = 1280
LOGICAL_HEIGHT = 720
FPS = 60

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = PACKAGE_ROOT / "assets"
STAGE_ROOT = ASSET_ROOT / "backgrounds" / "stage1_zen"
MARCO_ROOT = ASSET_ROOT / "characters" / "marco"
MARCO_ANIM_ROOT = ASSET_ROOT / "characters" / "marco_anim"
BARBETTA_ROOT = ASSET_ROOT / "characters" / "barbetta"
BARBETTA_ANIM_ROOT = ASSET_ROOT / "characters" / "barbetta_anim"

# Coordinate sul canvas logico 1280x720. Tutti i sette fondali ZEN condividono
# la stessa fascia di combattimento: in questo modo i piedi restano sul piano
# stradale e le transizioni non modificano la scala percepita dei personaggi.
PLAYFIELD = (45.0, 510.0, 1235.0, 684.0)
PLAYER_START = (128.0, 610.0)
EXIT_X = 1215.0
EXIT_TRIGGER_TOLERANCE = 8.0

PLAYER_SPEED = 285.0
PLAYER_DEPTH_SPEED = 205.0
PLAYER_MAX_HEALTH = 120
FURY_MAX = 100

# Tutti gli sprite canonici sono preparati offline su canvas fisso 640x420.
SPRITE_CANVAS = (640, 420)
SPRITE_BASELINE = 414
# Contenuto alpha massimo: lascia 10 px trasparenti sotto i piedi.
SPRITE_CONTENT_BOTTOM = 410
MARCO_VISIBLE_HEIGHT = 290
BARBETTA_VISIBLE_HEIGHT = 275

MODULE_FADE_SECONDS = 0.42
MODULE_ENTRY_LOCK = 0.22
DEBUG_DRAW = False
