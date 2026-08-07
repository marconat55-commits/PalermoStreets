from __future__ import annotations

import pygame

from .actor import Actor, AttackData, HitResult
from ..config import PLAYER_SPEED, PLAYER_DEPTH_SPEED, PLAYER_MAX_HEALTH, FURY_MAX, PLAYFIELD
from ..systems.animation import AnimationBank

# v0.5.3: knockback solo orizzontale sul piano stradale.
# La caduta verticale è già rappresentata dall'animazione e non deve spostare
# il personaggio verso il fondo della scena facendolo sembrare sospeso.
PUNCH_LEFT = AttackData("punch_left", 14, 0.11, 0.10, 0.18, 92, 54, 170, 0, 7, 0.045, 3.0)
PUNCH_RIGHT = AttackData("punch_right", 20, 0.12, 0.12, 0.24, 108, 58, 250, 0, 10, 0.060, 5.0)
KICK_RIGHT = AttackData("kick_right", 30, 0.20, 0.14, 0.34, 132, 62, 390, 0, 15, 0.085, 9.0, knockdown=True)
SUPER = AttackData("super", 52, 0.18, 0.34, 0.38, 158, 74, 560, 0, 0, 0.115, 15.0, knockdown=True, multi_hit=True)

PUNCH1 = PUNCH_LEFT
PUNCH2 = PUNCH_RIGHT
HEAVY = KICK_RIGHT
FURY = SUPER
LIGHT_COMBO = (PUNCH_LEFT, PUNCH_RIGHT)


class Player(Actor):
    def __init__(
        self,
        animations: AnimationBank,
        position: pygame.Vector2,
        *,
        max_health: int = PLAYER_MAX_HEALTH,
        visual_height: int = 290,
        move_speed: float = PLAYER_SPEED,
        depth_speed: float = PLAYER_DEPTH_SPEED,
    ) -> None:
        super().__init__(animations, position, max_health, visual_height=visual_height)
        self.move_speed = float(move_speed)
        self.depth_speed = float(depth_speed)
        self.fury = 0
        self.score = 0
        self.current_attack: AttackData | None = None
        self.queued_attack: AttackData | None = None
        self.attack_elapsed = 0.0
        self.attack_hits: set[int] = set()
        self.combo_step = 0
        # Un solo tasto pugno (J): alterna automaticamente Extra A SX/DX.
        # K resta libero per il futuro salto.
        self.next_punch_index = 0
        self.combo_counter = 0
        self.combo_display_timer = 0.0
        self.dodge_elapsed = 0.0
        self.dodge_cooldown = 0.0
        self.dodge_direction = pygame.Vector2(1, 0)
        self.last_move = pygame.Vector2(1, 0)
        self.block_elapsed = 0.0
        self.block_success_timer = 0.0
        self.auto_target_x: float | None = None


    @property
    def collision_radius(self) -> pygame.Vector2:
        if self.state in ("knockdown", "dead"):
            return pygame.Vector2(60.0, 16.0)
        if self.state == "getup":
            return pygame.Vector2(40.0, 20.0)
        return pygame.Vector2(38.0, 22.0)

    def set_auto_target(self, target_x: float | None) -> None:
        # Memorizza il bersaglio senza sovrascrivere l'orientamento mentre
        # il giocatore sta camminando. Il facing viene deciso nel punto
        # corretto: input durante la marcia, bersaglio durante idle/attacco.
        self.auto_target_x = target_x

    def _face_auto_target(self) -> None:
        if self.auto_target_x is None:
            return
        delta = self.auto_target_x - self.position.x
        if abs(delta) > 3.0:
            self.facing = 1 if delta > 0 else -1

    def _request_attack(self, attack: AttackData, *, chainable: bool = False) -> bool:
        if self.dead or self.state in ("hit", "knockdown", "getup", "dodge", "block"):
            return False
        if self.state == "attack":
            if (
                chainable
                and self.current_attack in LIGHT_COMBO
                and attack in LIGHT_COMBO
                and attack is not self.current_attack
                and self.attack_elapsed >= self.current_attack.startup + self.current_attack.active * 0.45
            ):
                self.queued_attack = attack
                return True
            return False
        self.combo_step = 0
        self._face_auto_target()
        self._start_attack(attack)
        return True

    def request_punch(self) -> bool:
        """Esegue il pugno successivo della sequenza Extra A usando un solo tasto.

        Da fermo alterna SX/DX a ogni pressione accettata. Durante un pugno,
        una nuova pressione nella finestra combo mette in coda il pugno opposto.
        """
        if self.state == "attack" and self.current_attack in LIGHT_COMBO:
            attack = PUNCH_RIGHT if self.current_attack is PUNCH_LEFT else PUNCH_LEFT
        else:
            attack = LIGHT_COMBO[self.next_punch_index]

        accepted = self._request_attack(attack, chainable=True)
        if accepted:
            self.next_punch_index = 0 if attack is PUNCH_RIGHT else 1
        return accepted

    def request_punch_left(self) -> bool:
        # API mantenuta per compatibilità con vecchi test/tool.
        return self._request_attack(PUNCH_LEFT, chainable=True)

    def request_punch_right(self) -> bool:
        # API mantenuta per compatibilità con vecchi test/tool.
        return self._request_attack(PUNCH_RIGHT, chainable=True)

    def request_kick_right(self) -> bool:
        return self._request_attack(KICK_RIGHT)

    def request_super(self) -> bool:
        if self.fury < 50:
            return False
        if not self._request_attack(SUPER):
            return False
        self.fury -= 50
        self.invulnerable = SUPER.startup + SUPER.active
        return True

    def request_block(self) -> bool:
        if self.dead or self.state in ("attack", "hit", "knockdown", "getup", "dodge"):
            return False
        self.current_attack = None
        self.queued_attack = None
        self.block_elapsed = 0.0
        self._face_auto_target()
        self.begin_state("block", "block")
        return True

    # API v0.5 conservata per test e compatibilità.
    def request_light(self) -> bool:
        return self.request_punch()

    def request_heavy(self) -> bool:
        return self.request_kick_right()

    def request_fury(self) -> bool:
        return self.request_super()

    def request_dodge(self, keys: pygame.key.ScancodeWrapper) -> bool:
        if self.dead or self.dodge_cooldown > 0.0 or self.state in ("attack", "hit", "knockdown", "getup", "block"):
            return False
        x = float(keys[pygame.K_d] or keys[pygame.K_RIGHT]) - float(keys[pygame.K_a] or keys[pygame.K_LEFT])
        y = float(keys[pygame.K_s] or keys[pygame.K_DOWN]) - float(keys[pygame.K_w] or keys[pygame.K_UP])
        direction = pygame.Vector2(x, y)
        if direction.length_squared() < 0.1:
            direction = self.last_move.copy()
        if direction.length_squared() < 0.1:
            direction = pygame.Vector2(self.facing, 0)
        self.dodge_direction = direction.normalize()
        if abs(self.dodge_direction.x) > 0.1:
            self.facing = 1 if self.dodge_direction.x > 0 else -1
        self.dodge_elapsed = 0.0
        self.dodge_cooldown = 0.58
        self.invulnerable = 0.25
        self.begin_state("dodge", "dodge")
        return True

    def _start_attack(self, attack: AttackData) -> None:
        self.current_attack = attack
        self.queued_attack = None
        self.attack_elapsed = 0.0
        self.attack_hits.clear()
        self.begin_state("attack", attack.name)

    def update(self, dt: float, keys: pygame.key.ScancodeWrapper) -> None:
        self.update_common(dt)
        self.combo_display_timer = max(0.0, self.combo_display_timer - dt)
        self.dodge_cooldown = max(0.0, self.dodge_cooldown - dt)
        self.block_success_timer = max(0.0, self.block_success_timer - dt)

        if self.dead:
            return
        if self.state == "hit":
            if self.animator.finished:
                self.begin_state("idle", "idle")
            self._clamp(); return
        if self.state == "knockdown":
            if self.animator.finished:
                self.begin_state("getup", "getup")
            self._clamp(); return
        if self.state == "getup":
            if self.animator.finished:
                self.begin_state("idle", "idle")
            self._clamp(); return
        if self.state == "dodge":
            self.dodge_elapsed += dt
            speed = 650.0 * max(0.25, 1.0 - self.dodge_elapsed / 0.28)
            self.position += self.dodge_direction * speed * dt
            if self.dodge_elapsed >= 0.28:
                self.begin_state("idle", "idle")
            self._clamp(); return
        if self.state == "block":
            self.block_elapsed += dt
            self._face_auto_target()
            if not keys[pygame.K_h]:
                self.begin_state("idle", "idle")
            self._clamp(); return
        if self.state == "attack" and self.current_attack is not None:
            self.attack_elapsed += dt
            if self.current_attack is SUPER:
                if self.attack_elapsed >= 0.18:
                    self.position.x += self.facing * 245.0 * dt
            elif self.attack_elapsed < self.current_attack.startup + self.current_attack.active:
                lunge_speed = {
                    "punch_left": 82.0,
                    "punch_right": 112.0,
                    "kick_right": 72.0,
                }.get(self.current_attack.name, 52.0)
                self.position.x += self.facing * lunge_speed * dt
            if self.attack_elapsed >= self.current_attack.total:
                queued = self.queued_attack
                if queued is not None:
                    self.combo_step += 1
                    self._start_attack(queued)
                else:
                    self.current_attack = None
                    self.combo_step = 0
                    self.begin_state("idle", "idle")
            self._clamp(); return

        x = float(keys[pygame.K_d] or keys[pygame.K_RIGHT]) - float(keys[pygame.K_a] or keys[pygame.K_LEFT])
        y = float(keys[pygame.K_s] or keys[pygame.K_DOWN]) - float(keys[pygame.K_w] or keys[pygame.K_UP])
        move = pygame.Vector2(x, y)
        if move.length_squared() > 1.0:
            move = move.normalize()
        if move.length_squared() > 0.01:
            self.last_move = move.normalize()
        self.position.x += move.x * self.move_speed * dt
        self.position.y += move.y * self.depth_speed * dt

        # Durante la camminata Marco guarda sempre nella direzione premuta:
        # niente più moonwalk. Quando è fermo torna a guardare il bersaglio.
        if x != 0:
            self.facing = 1 if x > 0 else -1
        elif self.auto_target_x is not None:
            self._face_auto_target()

        moving = move.length_squared() > 0.01
        self.animator.play("walk" if moving else "idle")
        self.state = "walk" if moving else "idle"
        self._clamp()

    def receive_hit(
        self,
        damage: int,
        knockback: pygame.Vector2,
        *,
        knockdown: bool = False,
    ) -> HitResult:
        incoming_sign = 1 if knockback.x > 0 else -1 if knockback.x < 0 else 0
        front_block = incoming_sign == 0 or self.facing == -incoming_sign
        if self.state == "block" and front_block and self.invulnerable <= 0.0 and not self.dead:
            reduced = max(1, round(damage * 0.20))
            self.health = max(0, self.health - reduced)
            self.hit_flash = 0.07
            self.velocity = pygame.Vector2(knockback.x * 0.12, 0.0)
            self.block_success_timer = 0.22
            self.add_fury(4)
            killed = self.health <= 0
            if killed:
                self.dead = True
                self.begin_state("dead", "dead")
                self.invulnerable = 999.0
                return HitResult(True, True, True)
            self.invulnerable = 0.08
            self.animator.play("block", restart=False)
            return HitResult(True, False, False)
        return super().receive_hit(damage, pygame.Vector2(knockback.x, 0.0), knockdown=knockdown)

    def _clamp(self) -> None:
        self.clamp_to_playfield(PLAYFIELD)

    def active_attack_box(self) -> pygame.Rect | None:
        attack = self.current_attack
        if attack is None or self.state != "attack":
            return None
        if not (attack.startup <= self.attack_elapsed <= attack.startup + attack.active):
            return None
        factor = 0.72 if attack is SUPER else 0.62
        center_x = self.position.x + self.facing * attack.range_x * factor
        return pygame.Rect(
            round(center_x - attack.range_x / 2),
            round(self.position.y - attack.range_y),
            attack.range_x,
            attack.range_y,
        )

    def register_hit(self, actor_id: int, damage: int) -> None:
        self.attack_hits.add(actor_id)
        self.add_fury(self.current_attack.fury_gain if self.current_attack else 0)
        self.score += damage * 10
        self.combo_counter += 1
        self.combo_display_timer = 1.25

    def add_fury(self, amount: int) -> None:
        self.fury = min(FURY_MAX, self.fury + amount)
