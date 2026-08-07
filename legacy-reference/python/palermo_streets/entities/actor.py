from __future__ import annotations

from dataclasses import dataclass
from itertools import count
import pygame

from ..systems.animation import AnimationBank, Animator


_IDS = count(1)


@dataclass(frozen=True, slots=True)
class AttackData:
    name: str
    damage: int
    startup: float
    active: float
    recovery: float
    range_x: int
    range_y: int
    knockback_x: float
    knockback_y: float
    fury_gain: int
    hit_stop: float
    shake: float
    knockdown: bool = False
    multi_hit: bool = False

    @property
    def total(self) -> float:
        return self.startup + self.active + self.recovery


@dataclass(frozen=True, slots=True)
class HitResult:
    accepted: bool
    killed: bool
    knocked_down: bool


class Actor:
    def __init__(
        self,
        animations: AnimationBank,
        position: pygame.Vector2,
        max_health: int,
        *,
        visual_height: int,
    ) -> None:
        self.actor_id = next(_IDS)
        self.animator = Animator(animations)
        self.position = position
        self.velocity = pygame.Vector2()
        self.max_health = max_health
        self.health = max_health
        self.visual_height = visual_height
        # facing è la direzione desiderata nel mondo. L'orientamento nativo
        # viene letto dalla singola AnimationClip, perché il Marco Pack
        # contiene clip sorgente rivolte sia a sinistra sia a destra.
        self.facing = 1
        self.state = "idle"
        self.state_elapsed = 0.0
        self.invulnerable = 0.0
        self.hit_flash = 0.0
        self.alpha = 255
        self.dead = False
        self.remove_ready = False

    @property
    def feet(self) -> pygame.Vector2:
        return self.position

    @property
    def frame_image(self) -> pygame.Surface:
        return self.animator.frame.image

    @property
    def collision_radius(self) -> pygame.Vector2:
        """Ingombro sul piano stradale, indipendente dal canvas trasparente."""
        if self.state in ("knockdown", "dead"):
            return pygame.Vector2(60.0, 16.0)
        if self.state == "getup":
            return pygame.Vector2(38.0, 19.0)
        return pygame.Vector2(35.0, 21.0)

    @property
    def hurtbox(self) -> pygame.Rect:
        # La hitbox fisica non dipende dal canvas trasparente dello sprite.
        if self.state in ("knockdown", "dead"):
            width, height = 126, 46
        elif self.state == "getup":
            width, height = 76, 102
        else:
            width, height = 58, 142
        return pygame.Rect(
            int(self.position.x - width / 2),
            int(self.position.y - height),
            width,
            height,
        )

    @property
    def can_be_hit(self) -> bool:
        return not self.dead and self.invulnerable <= 0.0 and self.state not in ("knockdown", "getup")

    def begin_state(self, state: str, animation: str | None = None, *, restart: bool = True) -> None:
        self.state = state
        self.state_elapsed = 0.0
        self.animator.play(animation or state, restart=restart)

    def update_common(self, dt: float) -> None:
        self.state_elapsed += dt
        self.invulnerable = max(0.0, self.invulnerable - dt)
        self.hit_flash = max(0.0, self.hit_flash - dt)
        self.animator.update(dt)
        self.position += self.velocity * dt
        self.velocity *= max(0.0, 1.0 - 8.0 * dt)

    def clamp_to_playfield(self, playfield: tuple[float, float, float, float]) -> None:
        left, top, right, bottom = playfield
        self.position.x = max(left, min(right, self.position.x))
        self.position.y = max(top, min(bottom, self.position.y))

    def receive_hit(
        self,
        damage: int,
        knockback: pygame.Vector2,
        *,
        knockdown: bool = False,
    ) -> HitResult:
        if not self.can_be_hit:
            return HitResult(False, False, False)

        self.health = max(0, self.health - damage)
        self.hit_flash = 0.075
        self.invulnerable = 0.12
        self.velocity = knockback
        killed = self.health <= 0
        if killed:
            self.dead = True
            self.begin_state("dead", "dead")
            self.invulnerable = 999.0
            return HitResult(True, True, True)

        if knockdown:
            self.begin_state("knockdown", "knockdown")
            self.invulnerable = 0.55
            return HitResult(True, False, True)

        self.begin_state("hit", "hit")
        return HitResult(True, False, False)

    def render_image(self) -> pygame.Surface:
        """Restituisce il frame orientato, preservando l'alpha trasparente."""
        image = self.animator.frame.image
        if self.facing != self.animator.source_facing:
            image = pygame.transform.flip(image, True, False)
        if self.hit_flash > 0.0:
            flashed = image.copy()
            # Alpha 0: colora solo i pixel esistenti e non crea il rettangolo
            # rosso del canvas trasparente osservato nel video v0.5.3.
            flashed.fill((255, 95, 80, 0), special_flags=pygame.BLEND_RGBA_ADD)
            image = flashed
        if self.alpha < 255:
            image = image.copy()
            image.set_alpha(self.alpha)
        return image

    def visual_top(self, offset: pygame.Vector2 = pygame.Vector2()) -> int:
        """Y superiore della silhouette visibile nel mondo/schermo.

        Il canvas trasparente è molto più alto del personaggio: usare questo
        valore evita barre vita troppo alte nelle pose accovacciate o a terra.
        """
        frame = self.animator.frame
        _left, top, _width, height = frame.bounds
        if height <= 0:
            bbox = frame.image.get_bounding_rect(min_alpha=8)
            top = bbox.top
        canvas_bottom = round(self.position.y + offset.y + frame.offset_y)
        canvas_top = canvas_bottom - frame.image.get_height()
        return canvas_top + top

    def draw(self, target: pygame.Surface, offset: pygame.Vector2 = pygame.Vector2()) -> None:
        frame = self.animator.frame
        image = self.render_image()
        x = round(self.position.x + offset.x + frame.offset_x * self.facing)
        y = round(self.position.y + offset.y + frame.offset_y)
        rect = image.get_rect(midbottom=(x, y))

        # Sottile outline scuro stile arcade. È precalcolato una sola volta
        # durante il caricamento della AnimationBank, non a ogni draw.
        outline = frame.outline
        if outline is not None:
            if self.facing != self.animator.source_facing:
                outline = pygame.transform.flip(outline, True, False)
            if self.alpha < 255:
                outline = outline.copy()
                outline.set_alpha(self.alpha)
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                target.blit(outline, rect.move(dx, dy))
        target.blit(image, rect)
