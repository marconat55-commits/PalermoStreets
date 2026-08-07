from __future__ import annotations

from dataclasses import replace
import random
import pygame

from .actor import Actor, AttackData
from ..config import PLAYFIELD
from ..systems.animation import AnimationBank


# Attacchi base. Ogni Enemy crea copie scalate dal profilo personaggio:
# in questo modo la Character Factory può registrare archetipi rapidi, pesanti
# o tecnici senza duplicare la logica dello stage.
ENEMY_ATTACK = AttackData("attack", 10, 0.48, 0.12, 0.56, 84, 56, 175, 0, 0, 0.050, 3.0)
ENEMY_HEAVY = AttackData("heavy", 16, 0.70, 0.15, 0.80, 100, 64, 250, 0, 0, 0.070, 6.0, knockdown=True)


def _scaled_attack(base: AttackData, damage_scale: float, speed_scale: float) -> AttackData:
    speed = max(0.55, min(1.80, speed_scale))
    damage = max(1, round(base.damage * max(0.35, damage_scale)))
    return replace(
        base,
        damage=damage,
        startup=base.startup / speed,
        active=base.active / speed,
        recovery=base.recovery / speed,
    )


class Enemy(Actor):
    def __init__(
        self,
        animations: AnimationBank,
        position: pygame.Vector2,
        health: int = 82,
        *,
        aggression: float = 1.0,
        boss: bool = False,
        display_name: str = "SGHERRO",
        variant_index: int = 0,
        character_id: str = "barbetta",
        visual_height: int = 275,
        move_speed_scale: float = 1.0,
        damage_scale: float = 1.0,
        attack_speed_scale: float = 1.0,
        heavy_chance: float = 0.13,
        cooldown_scale: float = 1.0,
        collision_scale: float = 1.0,
    ) -> None:
        super().__init__(animations, position, health, visual_height=visual_height)
        self.character_id = character_id
        self.aggression = aggression
        self.is_boss = boss
        self.display_name = display_name
        self.variant_index = variant_index
        self.move_speed_scale = max(0.60, min(1.65, move_speed_scale))
        self.cooldown_scale = max(0.55, min(1.80, cooldown_scale))
        self.collision_scale = max(0.75, min(1.35, collision_scale))
        self.heavy_chance = max(0.0, min(0.80, heavy_chance + (0.11 if boss else 0.0)))
        self.light_attack = _scaled_attack(ENEMY_ATTACK, damage_scale, attack_speed_scale)
        self.heavy_attack = _scaled_attack(ENEMY_HEAVY, damage_scale, attack_speed_scale)
        self.current_attack: AttackData | None = None
        self.attack_elapsed = 0.0
        self.attack_hit_player = False
        self.attack_cooldown = random.uniform(0.82, 1.22) * self.cooldown_scale
        self.attack_facing = -1
        self.preferred_depth_offset = random.uniform(-28.0, 28.0)
        self.engage_side: int | None = None
        self.spawn_elapsed = 0.0
        self.alpha = 0
        self.begin_state("spawn", "idle")

    @property
    def collision_radius(self) -> pygame.Vector2:
        if self.state in ("knockdown", "dead"):
            base = pygame.Vector2(62.0 if self.is_boss else 60.0, 16.0)
        elif self.state == "getup":
            base = pygame.Vector2(42.0 if self.is_boss else 40.0, 20.0)
        else:
            base = pygame.Vector2(43.0 if self.is_boss else 39.0, 23.0 if self.is_boss else 22.0)
        return base * self.collision_scale

    @property
    def attack_warning_ratio(self) -> float:
        attack = self.current_attack
        if self.state != "attack" or attack is None or attack.startup <= 0.0:
            return 0.0
        if self.attack_elapsed >= attack.startup:
            return 0.0
        return max(0.0, min(1.0, self.attack_elapsed / attack.startup))

    @property
    def attack_active(self) -> bool:
        attack = self.current_attack
        return bool(
            self.state == "attack"
            and attack is not None
            and attack.startup <= self.attack_elapsed <= attack.startup + attack.active
        )

    def _start_attack(self, attack: AttackData, player: Actor) -> None:
        self.current_attack = attack
        self.attack_elapsed = 0.0
        self.attack_hit_player = False
        self.attack_facing = 1 if player.position.x >= self.position.x else -1
        self.facing = self.attack_facing
        self.velocity.update(0, 0)
        self.begin_state("attack", attack.name)

    def update(
        self,
        dt: float,
        player: Actor,
        allies: list["Enemy"],
        *,
        may_attack: bool,
        support_rank: int = 0,
    ) -> None:
        self.update_common(dt)
        self.attack_cooldown = max(0.0, self.attack_cooldown - dt)

        if self.dead:
            # Lascia completare davvero la caduta prima della dissolvenza.
            # Le vecchie soglie fisse iniziavano il fade mentre alcuni archetipi
            # erano ancora a mezz'aria, rendendo le morti leggere e spezzate.
            dead_clip = self.animator.bank.clip("dead")
            landing_time = sum(frame.duration for frame in dead_clip.frames[:-1])
            hold = landing_time + (0.62 if self.is_boss else 0.34)
            if self.state_elapsed > hold:
                self.alpha = max(0, self.alpha - round((235 if self.is_boss else 430) * dt))
            if self.alpha <= 0:
                self.remove_ready = True
            return

        if self.state == "spawn":
            self.spawn_elapsed += dt
            duration = 0.44 if self.is_boss else 0.30
            self.alpha = min(255, round(255 * self.spawn_elapsed / duration))
            if self.spawn_elapsed >= duration:
                self.begin_state("idle", "idle")
                self.invulnerable = 0.15
            return

        if self.state == "hit":
            # Ogni personaggio può avere una reazione diversa: attendere la
            # fine della clip evita tagli dell'ultimo frame e salti di scala.
            if self.animator.finished:
                self.begin_state("idle", "idle")
            self._clamp()
            return

        if self.state == "knockdown":
            if self.animator.finished:
                self.begin_state("getup", "getup")
            self._clamp()
            return

        if self.state == "getup":
            if self.animator.finished:
                self.begin_state("idle", "idle")
                self.invulnerable = 0.14
            self._clamp()
            return

        if self.state == "attack" and self.current_attack is not None:
            attack = self.current_attack
            self.attack_elapsed += dt
            self.facing = self.attack_facing
            if attack.startup <= self.attack_elapsed <= attack.startup + attack.active:
                speed = 68.0 if attack.name == "heavy" else 48.0
                if self.is_boss:
                    speed *= 1.12
                self.position.x += self.attack_facing * speed * self.move_speed_scale * dt
            if self.attack_elapsed >= attack.total:
                self.current_attack = None
                base_low, base_high = ((0.66, 0.98) if self.is_boss else (0.96, 1.36))
                self.attack_cooldown = (
                    random.uniform(base_low, base_high)
                    * self.cooldown_scale
                    / max(0.78, self.aggression)
                )
                self.begin_state("idle", "idle")
            self._clamp()
            return

        delta = player.position - self.position
        if self.engage_side is None:
            self.engage_side = -1 if self.position.x < player.position.x else 1
        elif abs(delta.x) > 205.0:
            self.engage_side = -1 if self.position.x < player.position.x else 1

        if may_attack:
            side = self.engage_side
            desired_x = player.position.x + side * (96.0 if self.is_boss else 91.0)
            desired_y = player.position.y + self.preferred_depth_offset * 0.28
            self.facing = -side
        else:
            side = -1 if support_rank % 2 == 0 else 1
            ring = support_rank // 2
            distance = 176.0 + ring * 62.0
            lane_sign = -1 if ring % 2 == 0 else 1
            desired_x = player.position.x + side * distance
            desired_y = player.position.y + lane_sign * (50.0 + ring * 12.0)
            self.facing = 1 if player.position.x >= self.position.x else -1

        to_slot = pygame.Vector2(desired_x - self.position.x, desired_y - self.position.y)
        distance_x = abs(delta.x)
        distance_y = abs(delta.y)
        correct_side = (self.position.x - player.position.x) * self.engage_side > 0.0

        player_vulnerable = not player.dead and player.state not in ("hit", "knockdown", "getup")
        if (
            may_attack
            and player_vulnerable
            and correct_side
            and self.attack_cooldown <= 0.0
            and distance_x <= (118.0 if self.is_boss else 108.0)
            and distance_y <= 46.0
        ):
            chance = max(0.0, min(0.85, self.heavy_chance * self.aggression))
            attack = self.heavy_attack if random.random() < chance else self.light_attack
            self._start_attack(attack, player)
            self._clamp()
            return

        moved = False
        if to_slot.length_squared() > 12.0 ** 2:
            direction = to_slot.normalize()
            speed_x = ((132.0 if self.is_boss else 120.0) if may_attack else 92.0) * self.move_speed_scale
            speed_y = ((100.0 if self.is_boss else 92.0) if may_attack else 78.0) * self.move_speed_scale
            step = pygame.Vector2(direction.x * speed_x * dt, direction.y * speed_y * dt)
            if abs(step.x) > abs(to_slot.x):
                step.x = to_slot.x
            if abs(step.y) > abs(to_slot.y):
                step.y = to_slot.y
            self.position += step
            moved = step.length_squared() > 0.01

        for ally in allies:
            if ally is self or ally.dead:
                continue
            offset = self.position - ally.position
            if abs(offset.y) < 40.0 and abs(offset.x) < 90.0:
                sign = 1.0 if offset.x >= 0 else -1.0
                if abs(offset.x) < 1.0:
                    sign = 1.0 if self.actor_id > ally.actor_id else -1.0
                self.position.x += sign * (90.0 - abs(offset.x)) * 0.20

        self.animator.play("walk" if moved else "idle")
        self.state = "walk" if moved else "idle"
        self._clamp()

    def active_attack_box(self) -> pygame.Rect | None:
        attack = self.current_attack
        if attack is None or self.state != "attack" or self.attack_hit_player:
            return None
        if not (attack.startup <= self.attack_elapsed <= attack.startup + attack.active):
            return None
        center_x = self.position.x + self.attack_facing * attack.range_x * 0.50
        return pygame.Rect(
            round(center_x - attack.range_x / 2),
            round(self.position.y - attack.range_y),
            attack.range_x,
            attack.range_y,
        )

    def _clamp(self) -> None:
        self.clamp_to_playfield(PLAYFIELD)
