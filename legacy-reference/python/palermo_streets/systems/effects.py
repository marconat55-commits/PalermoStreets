from __future__ import annotations

from dataclasses import dataclass
import random
import pygame


@dataclass(slots=True)
class Particle:
    position: pygame.Vector2
    velocity: pygame.Vector2
    life: float
    max_life: float
    radius: float
    color: tuple[int, int, int]

    def update(self, dt: float) -> None:
        self.life -= dt
        self.position += self.velocity * dt
        self.velocity *= max(0.0, 1.0 - 4.5 * dt)
        self.velocity.y += 75.0 * dt

    def draw(self, target: pygame.Surface) -> None:
        if self.life <= 0.0:
            return
        ratio = max(0.0, self.life / self.max_life)
        radius = max(1, round(self.radius * ratio))
        pygame.draw.circle(target, self.color, self.position, radius)


@dataclass(slots=True)
class FloatingText:
    text: str
    position: pygame.Vector2
    life: float
    color: tuple[int, int, int]

    def update(self, dt: float) -> None:
        self.life -= dt
        self.position.y -= 42.0 * dt

    def draw(self, target: pygame.Surface) -> None:
        if self.life <= 0.0:
            return
        font = pygame.font.Font(None, 28)
        image = font.render(self.text, True, self.color)
        target.blit(image, image.get_rect(center=(round(self.position.x), round(self.position.y))))


class EffectsLayer:
    def __init__(self) -> None:
        self.particles: list[Particle] = []
        self.texts: list[FloatingText] = []

    def hit_spark(self, position: pygame.Vector2, heavy: bool = False) -> None:
        count = 14 if heavy else 8
        for _ in range(count):
            angle = random.uniform(-2.8, -0.25)
            speed = random.uniform(90.0, 250.0 if heavy else 190.0)
            velocity = pygame.Vector2(speed, 0).rotate_rad(angle)
            color = random.choice(((255, 225, 95), (255, 145, 45), (255, 245, 205)))
            life = random.uniform(0.16, 0.32)
            self.particles.append(Particle(position.copy(), velocity, life, life, random.uniform(2.0, 5.0), color))

    def dust(self, position: pygame.Vector2, facing: int) -> None:
        for _ in range(6):
            velocity = pygame.Vector2(random.uniform(-45, 10) * facing, random.uniform(-45, -10))
            life = random.uniform(0.20, 0.38)
            self.particles.append(Particle(position.copy(), velocity, life, life, random.uniform(3.0, 7.0), (150, 125, 100)))

    def damage_text(self, position: pygame.Vector2, amount: int, heavy: bool = False) -> None:
        color = (255, 205, 70) if heavy else (245, 245, 235)
        self.texts.append(FloatingText(str(amount), position.copy(), 0.65, color))

    def update(self, dt: float) -> None:
        for particle in self.particles:
            particle.update(dt)
        for text in self.texts:
            text.update(dt)
        self.particles = [p for p in self.particles if p.life > 0.0]
        self.texts = [t for t in self.texts if t.life > 0.0]

    def draw(self, target: pygame.Surface) -> None:
        for particle in self.particles:
            particle.draw(target)
        for text in self.texts:
            text.draw(target)
