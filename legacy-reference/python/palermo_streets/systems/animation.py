from __future__ import annotations

from dataclasses import dataclass
import pygame


@dataclass(frozen=True, slots=True)
class VisualFrame:
    image: pygame.Surface
    duration: float
    offset_x: int = 0
    offset_y: int = 0
    # Bounding box alpha sul canvas sorgente: left, top, width, height.
    # Permette all'HUD di seguire la silhouette reale, non il canvas 640x420.
    bounds: tuple[int, int, int, int] = (0, 0, 0, 0)
    # Outline precalcolato: evita di ricreare una mask 640x420 per ogni
    # personaggio a ogni frame, mantenendo il rendering fluido con più nemici.
    outline: pygame.Surface | None = None


@dataclass(frozen=True, slots=True)
class AnimationClip:
    frames: tuple[VisualFrame, ...]
    loop: bool = True
    # Direzione nativa disegnata nei PNG: -1 = sinistra, +1 = destra.
    # Marco usa fogli provenienti da pack diversi, quindi non tutte le clip
    # condividono lo stesso orientamento sorgente.
    source_facing: int = 1

    def __post_init__(self) -> None:
        if self.source_facing not in (-1, 1):
            raise ValueError(f"source_facing non valido: {self.source_facing}")


class AnimationBank:
    def __init__(self, clips: dict[str, AnimationClip]) -> None:
        if "idle" not in clips:
            raise ValueError("AnimationBank richiede la clip idle")
        self.clips = clips

    def clip(self, name: str) -> AnimationClip:
        return self.clips.get(name, self.clips["idle"])


class Animator:
    def __init__(self, bank: AnimationBank, initial: str = "idle") -> None:
        self.bank = bank
        self.name = initial
        self.frame_index = 0
        self.frame_elapsed = 0.0
        self.finished = False

    def play(self, name: str, *, restart: bool = False) -> None:
        if name == self.name and not restart:
            return
        self.name = name if name in self.bank.clips else "idle"
        self.frame_index = 0
        self.frame_elapsed = 0.0
        self.finished = False

    def update(self, dt: float) -> None:
        clip = self.bank.clip(self.name)
        if not clip.frames or self.finished:
            return
        self.frame_elapsed += dt
        while self.frame_elapsed >= clip.frames[self.frame_index].duration:
            self.frame_elapsed -= clip.frames[self.frame_index].duration
            self.frame_index += 1
            if self.frame_index >= len(clip.frames):
                if clip.loop:
                    self.frame_index = 0
                else:
                    self.frame_index = len(clip.frames) - 1
                    self.finished = True
                    break

    @property
    def frame(self) -> VisualFrame:
        clip = self.bank.clip(self.name)
        return clip.frames[min(self.frame_index, len(clip.frames) - 1)]

    @property
    def source_facing(self) -> int:
        return self.bank.clip(self.name).source_facing
