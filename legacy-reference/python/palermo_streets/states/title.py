from __future__ import annotations

import math
import pygame


class TitleState:
    def __init__(self) -> None:
        self.start_requested = False
        self.elapsed = 0.0

    def handle_event(self, event: pygame.event.Event) -> None:
        if event.type == pygame.KEYDOWN and event.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
            self.start_requested = True

    def update(self, dt: float) -> None:
        self.elapsed += dt

    def draw(self, target: pygame.Surface) -> None:
        target.fill((14, 9, 11))
        for y in range(target.get_height()):
            amount = y / target.get_height()
            color = (round(20 + 28 * amount), round(10 + 10 * amount), round(12 + 7 * amount))
            pygame.draw.line(target, color, (0, y), (target.get_width(), y))

        title = pygame.font.Font(None, 78).render("MINCHIA FIGHTERS", True, (246, 155, 28))
        subtitle = pygame.font.Font(None, 54).render("PALERMO STREETS", True, (236, 228, 213))
        version = pygame.font.Font(None, 25).render("v0.7.4 — CHARACTER FACTORY + 4 NEMICI", True, (190, 175, 160))
        target.blit(title, title.get_rect(center=(640, 210)))
        target.blit(subtitle, subtitle.get_rect(center=(640, 282)))
        target.blit(version, version.get_rect(center=(640, 335)))

        pulse = 180 + round(65 * (0.5 + 0.5 * math.sin(self.elapsed * 4.0)))
        prompt = pygame.font.Font(None, 33).render("PREMI INVIO", True, (pulse, pulse, pulse))
        target.blit(prompt, prompt.get_rect(center=(640, 455)))

        controls = (
            "MOVIMENTO  WASD / FRECCE     J  PUGNO     I  CALCIO",
            "L  SUPERMOSSA",
            "P  PAUSA     F3  HITBOX     F11  SCHERMO INTERO     ESC  MENU",
        )
        font = pygame.font.Font(None, 24)
        for index, line in enumerate(controls):
            image = font.render(line, True, (205, 198, 187))
            target.blit(image, image.get_rect(center=(640, 535 + index * 30)))
