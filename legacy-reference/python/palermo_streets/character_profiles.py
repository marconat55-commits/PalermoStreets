from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any

from .config import PACKAGE_ROOT, SPRITE_CANVAS, SPRITE_BASELINE


PROFILE_SCHEMA = 1
PROFILE_ROOT = PACKAGE_ROOT / "palermo_streets" / "data" / "characters"


@dataclass(frozen=True, slots=True)
class AnimationSpec:
    folder: str
    frames: int
    durations: tuple[float, ...]
    loop: bool = False
    source_facing: int = 1

    def expanded_durations(self) -> tuple[float, ...]:
        if len(self.durations) == 1:
            return self.durations * self.frames
        if len(self.durations) != self.frames:
            raise ValueError(
                f"Durate non coerenti per {self.folder}: "
                f"{len(self.durations)} valori per {self.frames} frame"
            )
        return self.durations


@dataclass(frozen=True, slots=True)
class CharacterProfile:
    character_id: str
    display_name: str
    role: str
    height_cm: int
    body_type: str
    visual_height: int
    master_root: Path
    animation_root: Path
    animations: dict[str, AnimationSpec]
    gameplay: dict[str, Any]
    identity: dict[str, Any]
    factory: dict[str, Any]
    raw: dict[str, Any]

    @property
    def is_player(self) -> bool:
        return self.role == "player"

    @property
    def enemy_defaults(self) -> dict[str, float | int | str]:
        defaults = self.gameplay.get("enemy", {})
        return {
            "health": int(defaults.get("health", 82)),
            "aggression": float(defaults.get("aggression", 1.0)),
            "move_speed_scale": float(defaults.get("move_speed_scale", 1.0)),
            "damage_scale": float(defaults.get("damage_scale", 1.0)),
            "attack_speed_scale": float(defaults.get("attack_speed_scale", 1.0)),
            "heavy_chance": float(defaults.get("heavy_chance", 0.13)),
            "cooldown_scale": float(defaults.get("cooldown_scale", 1.0)),
            "collision_scale": float(defaults.get("collision_scale", 1.0)),
            "label": str(defaults.get("label", self.display_name)),
        }


def _profile_path(character_id: str) -> Path:
    return PROFILE_ROOT / f"{character_id}.json"


def load_character_profile(character_id: str) -> CharacterProfile:
    path = _profile_path(character_id)
    if not path.exists():
        raise FileNotFoundError(f"Profilo personaggio non trovato: {path}")
    raw = json.loads(path.read_text(encoding="utf-8"))
    errors = validate_profile_data(raw, path=path)
    if errors:
        raise ValueError("Profilo non valido:\n- " + "\n- ".join(errors))

    animations = {
        name: AnimationSpec(
            folder=str(spec["folder"]),
            frames=int(spec["frames"]),
            durations=tuple(float(value) for value in spec["durations"]),
            loop=bool(spec.get("loop", False)),
            source_facing=int(spec.get("source_facing", 1)),
        )
        for name, spec in raw["animations"].items()
    }
    return CharacterProfile(
        character_id=str(raw["id"]),
        display_name=str(raw["display_name"]),
        role=str(raw["role"]),
        height_cm=int(raw["height_cm"]),
        body_type=str(raw["body_type"]),
        visual_height=int(raw["visual_height"]),
        master_root=PACKAGE_ROOT / str(raw["assets"]["master_root"]),
        animation_root=PACKAGE_ROOT / str(raw["assets"]["animation_root"]),
        animations=animations,
        gameplay=dict(raw.get("gameplay", {})),
        identity=dict(raw.get("identity", {})),
        factory=dict(raw.get("factory", {})),
        raw=raw,
    )


def validate_profile_data(raw: dict[str, Any], *, path: Path | None = None) -> list[str]:
    label = str(path) if path else "profile"
    errors: list[str] = []
    if raw.get("schema") != PROFILE_SCHEMA:
        errors.append(f"{label}: schema {raw.get('schema')} invece di {PROFILE_SCHEMA}")
    for key in ("id", "display_name", "role", "height_cm", "body_type", "visual_height", "assets", "animations"):
        if key not in raw:
            errors.append(f"{label}: campo obbligatorio mancante {key!r}")
    if errors:
        return errors

    character_id = str(raw["id"])
    if not character_id or any(ch not in "abcdefghijklmnopqrstuvwxyz0123456789_-" for ch in character_id):
        errors.append(f"{label}: id non valido {character_id!r}")
    if raw["role"] not in {"player", "enemy", "elite", "boss"}:
        errors.append(f"{label}: ruolo non supportato {raw['role']!r}")
    if not (120 <= int(raw["height_cm"]) <= 230):
        errors.append(f"{label}: altezza cm fuori intervallo")
    if not (180 <= int(raw["visual_height"]) <= 350):
        errors.append(f"{label}: visual_height fuori intervallo")

    assets = raw.get("assets", {})
    for key in ("master_root", "animation_root"):
        if not assets.get(key):
            errors.append(f"{label}: assets.{key} mancante")

    animations = raw.get("animations", {})
    required = {"idle", "walk", "hit", "knockdown", "getup", "dead"}
    if raw["role"] == "player":
        required |= {"punch_left", "punch_right", "kick_right", "super"}
    else:
        required |= {"attack", "heavy"}
    missing = sorted(required - set(animations))
    if missing:
        errors.append(f"{label}: animazioni obbligatorie mancanti {missing}")

    for name, spec in animations.items():
        try:
            frames = int(spec["frames"])
            durations = tuple(float(value) for value in spec["durations"])
            source_facing = int(spec.get("source_facing", 1))
        except (KeyError, TypeError, ValueError) as exc:
            errors.append(f"{label}: animazione {name} non valida ({exc})")
            continue
        if frames < 1 or frames > 24:
            errors.append(f"{label}: {name}.frames fuori intervallo")
        if len(durations) not in (1, frames):
            errors.append(f"{label}: {name}.durations deve avere 1 o {frames} valori")
        if any(value <= 0.0 or value > 10.0 for value in durations):
            errors.append(f"{label}: {name}.durations contiene valori non validi")
        if source_facing not in (-1, 1):
            errors.append(f"{label}: {name}.source_facing deve essere -1 o 1")
    return errors


def validate_profile_assets(profile: CharacterProfile) -> list[str]:
    errors: list[str] = []
    required_master = profile.factory.get(
        "master_pack_required",
        [
            "01_fronte.png", "02_3-4_fronte_guardia.png", "03_lato.png",
            "04_3-4_dietro_guardia.png", "05_dietro.png",
            "06_ritratto_aggressivo.png", "07_ritratto_neutro.png",
            "08_camminata_contatto.png", "09_camminata_passaggio.png",
        ],
    )
    for name in required_master:
        if not (profile.master_root / str(name)).is_file():
            errors.append(f"{profile.character_id}: master mancante {name}")
    for name, spec in profile.animations.items():
        paths = sorted((profile.animation_root / spec.folder).glob("*.png"))
        if len(paths) != spec.frames:
            errors.append(
                f"{profile.character_id}: {name}/{spec.folder} contiene {len(paths)} frame, attesi {spec.frames}"
            )
    canvas = tuple(int(value) for value in profile.factory.get("animation_canvas", SPRITE_CANVAS))
    baseline = int(profile.factory.get("baseline_y", SPRITE_BASELINE))
    if canvas != tuple(SPRITE_CANVAS):
        errors.append(f"{profile.character_id}: canvas factory {canvas} diverso da {SPRITE_CANVAS}")
    if baseline != SPRITE_BASELINE:
        errors.append(f"{profile.character_id}: baseline factory {baseline} diversa da {SPRITE_BASELINE}")
    return errors


def build_animation_bank(profile: CharacterProfile, assets: Any) -> Any:
    """Costruisce una AnimationBank dal profilo, senza hard-code nello stage.

    Gli import pygame vengono ritardati per permettere ai tool della Character
    Factory di leggere e validare i profili anche su macchine senza pygame.
    """
    import pygame
    from .systems.animation import AnimationBank, AnimationClip, VisualFrame

    clips: dict[str, AnimationClip] = {}
    for name, spec in profile.animations.items():
        paths = sorted((profile.animation_root / spec.folder).glob("*.png"))
        if len(paths) != spec.frames:
            raise FileNotFoundError(
                f"{profile.character_id}/{name}: {len(paths)} frame trovati in "
                f"{profile.animation_root / spec.folder}, attesi {spec.frames}"
            )
        durations = spec.expanded_durations()
        frames: list[VisualFrame] = []
        for path, duration in zip(paths, durations):
            image = assets.fixed_canvas(path)
            bbox = image.get_bounding_rect(min_alpha=8)
            offset_y = image.get_height() - bbox.bottom if bbox.height else 0
            bounds = (bbox.left, bbox.top, bbox.width, bbox.height)
            mask = pygame.mask.from_surface(image, 8)
            outline = mask.to_surface(
                setcolor=(24, 18, 18, 140), unsetcolor=(0, 0, 0, 0)
            )
            frames.append(VisualFrame(image, duration, 0, offset_y, bounds, outline))
        clips[name] = AnimationClip(
            tuple(frames), loop=spec.loop, source_facing=spec.source_facing
        )
    return AnimationBank(clips)


def list_registered_characters() -> list[str]:
    index_path = PROFILE_ROOT / "index.json"
    if index_path.exists():
        data = json.loads(index_path.read_text(encoding="utf-8"))
        return [str(item) for item in data.get("characters", [])]
    return sorted(path.stem for path in PROFILE_ROOT.glob("*.json") if path.name != "index.json")
