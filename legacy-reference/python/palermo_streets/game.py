from __future__ import annotations

import json
from pathlib import Path
import pygame

from .assets import AssetStore
from .config import TITLE, LOGICAL_WIDTH, LOGICAL_HEIGHT, FPS
from .states.title import TitleState
from .states.stage import StageState


class Game:
    def __init__(self) -> None:
        pygame.init()
        pygame.display.set_caption(TITLE)
        self.fullscreen = False
        self.window = pygame.display.set_mode((LOGICAL_WIDTH, LOGICAL_HEIGHT), pygame.RESIZABLE)
        self.canvas = pygame.Surface((LOGICAL_WIDTH, LOGICAL_HEIGHT))
        self.clock = pygame.time.Clock()
        self.assets = AssetStore()
        self.running = True
        self.title_state = TitleState()
        self.stage_state: StageState | None = None
        self.state = "title"

    def run(self) -> None:
        try:
            while self.running:
                dt = min(0.05, self.clock.tick(FPS) / 1000.0)
                self._events()
                self._update(dt)
                self._draw()
        finally:
            pygame.quit()

    def _events(self) -> None:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
                return
            if event.type == pygame.KEYDOWN and event.key == pygame.K_F11:
                self._toggle_fullscreen()
                continue
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                if self.state == "stage":
                    self.state = "title"
                    self.stage_state = None
                    self.title_state = TitleState()
                else:
                    self.running = False
                continue
            if self.state == "title":
                self.title_state.handle_event(event)
            elif self.stage_state is not None:
                self.stage_state.handle_event(event)

    def _toggle_fullscreen(self) -> None:
        self.fullscreen = not self.fullscreen
        flags = pygame.FULLSCREEN if self.fullscreen else pygame.RESIZABLE
        size = (0, 0) if self.fullscreen else (LOGICAL_WIDTH, LOGICAL_HEIGHT)
        self.window = pygame.display.set_mode(size, flags)

    def _update(self, dt: float) -> None:
        if self.state == "title":
            self.title_state.update(dt)
            if self.title_state.start_requested:
                data_path = Path(__file__).resolve().parent / "data" / "stage1_zen.json"
                stage_data = json.loads(data_path.read_text(encoding="utf-8"))
                root = Path(__file__).resolve().parents[1]
                for module in stage_data["modules"]:
                    module["background"] = str(root / module["background"])
                self.stage_state = StageState(self.assets, stage_data)
                self.state = "stage"
        elif self.stage_state is not None:
            self.stage_state.update(dt)

    def _draw(self) -> None:
        if self.state == "title":
            self.title_state.draw(self.canvas)
        elif self.stage_state is not None:
            self.stage_state.draw(self.canvas)

        win_w, win_h = self.window.get_size()
        scale = min(win_w / LOGICAL_WIDTH, win_h / LOGICAL_HEIGHT)
        scaled_size = (max(1, round(LOGICAL_WIDTH * scale)), max(1, round(LOGICAL_HEIGHT * scale)))
        scaled = pygame.transform.smoothscale(self.canvas, scaled_size)
        self.window.fill((0, 0, 0))
        self.window.blit(scaled, ((win_w - scaled_size[0]) // 2, (win_h - scaled_size[1]) // 2))
        pygame.display.flip()
