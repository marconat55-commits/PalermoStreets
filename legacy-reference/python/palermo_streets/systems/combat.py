from __future__ import annotations

from dataclasses import dataclass
import math
import pygame

from ..config import PLAYFIELD
from ..entities.player import Player, FURY, HEAVY, LIGHT_COMBO
from ..entities.enemy import Enemy


@dataclass(slots=True)
class CombatEvent:
    position: pygame.Vector2
    damage: int
    heavy: bool
    hit_stop: float
    shake: float
    target_killed: bool


def resolve_player_attack(player: Player, enemies: list[Enemy]) -> list[CombatEvent]:
    box = player.active_attack_box()
    attack = player.current_attack
    if box is None or attack is None:
        return []

    events: list[CombatEvent] = []
    candidates = sorted(
        (enemy for enemy in enemies if not enemy.dead),
        key=lambda enemy: (
            0 if (enemy.position.x - player.position.x) * player.facing >= 0 else 1,
            abs(enemy.position.x - player.position.x)
            + abs(enemy.position.y - player.position.y) * 1.6,
        ),
    )
    for enemy in candidates:
        if enemy.actor_id in player.attack_hits:
            continue
        if box.colliderect(enemy.hurtbox):
            knockback = pygame.Vector2(player.facing * attack.knockback_x, 0.0)
            result = enemy.receive_hit(attack.damage, knockback, knockdown=attack.knockdown)
            if not result.accepted:
                continue
            player.register_hit(enemy.actor_id, attack.damage)
            impact = pygame.Vector2(enemy.hurtbox.centerx, enemy.hurtbox.centery)
            events.append(
                CombatEvent(
                    impact,
                    attack.damage,
                    attack in (HEAVY, FURY) or attack is LIGHT_COMBO[-1],
                    attack.hit_stop,
                    attack.shake,
                    result.killed,
                )
            )
            if not attack.multi_hit:
                break
    return events


def resolve_enemy_attack(enemy: Enemy, player: Player) -> CombatEvent | None:
    box = enemy.active_attack_box()
    attack = enemy.current_attack
    if box is None or attack is None or not box.colliderect(player.hurtbox):
        return None
    direction = 1 if player.position.x >= enemy.position.x else -1
    result = player.receive_hit(
        attack.damage,
        pygame.Vector2(direction * attack.knockback_x, 0.0),
        knockdown=attack.knockdown,
    )
    if not result.accepted:
        return None
    enemy.attack_hit_player = True
    return CombatEvent(
        pygame.Vector2(player.hurtbox.centerx, player.hurtbox.centery),
        attack.damage,
        attack.knockdown,
        attack.hit_stop,
        attack.shake,
        result.killed,
    )


def _pair_shares(first: Player | Enemy, second: Player | Enemy) -> tuple[float, float]:
    # Marco resta più stabile sotto input; il nemico assorbe gran parte della correzione.
    if isinstance(first, Player) and isinstance(second, Enemy):
        return 0.20, 0.80
    if isinstance(first, Enemy) and isinstance(second, Player):
        return 0.80, 0.20
    return 0.50, 0.50


def _separate_pair(first: Player | Enemy, second: Player | Enemy) -> bool:
    """Pushbox ellittiche: separazione leggibile senza attraversamenti."""
    if first.dead or second.dead:
        return False

    rx = first.collision_radius.x + second.collision_radius.x
    ry = first.collision_radius.y + second.collision_radius.y
    dx = second.position.x - first.position.x
    dy = second.position.y - first.position.y

    nx = dx / max(1.0, rx)
    ny = dy / max(1.0, ry)
    distance = math.hypot(nx, ny)
    if distance >= 1.0:
        return False

    if abs(dx) < 0.001 and abs(dy) < 0.001:
        dx = 1.0 if first.actor_id < second.actor_id else -1.0
        dy = 0.0

    overlap_x = max(0.0, rx - abs(dx))
    overlap_y = max(0.0, ry - abs(dy))
    player_enemy_pair = isinstance(first, Player) != isinstance(second, Player)

    # In uno scontro frontale la separazione deve essere orizzontale: scegliere
    # l'asse Y faceva scivolare i personaggi uno dentro l'altro in profondità.
    force_horizontal = player_enemy_pair and abs(dy) <= ry * 0.95
    if force_horizontal or overlap_x <= overlap_y * 1.10:
        sign = 1.0 if dx >= 0 else -1.0
        axis = pygame.Vector2(sign * (overlap_x + 1.25), 0.0)
    else:
        sign = 1.0 if dy >= 0 else -1.0
        axis = pygame.Vector2(0.0, sign * (overlap_y + 0.75))

    first_share, second_share = _pair_shares(first, second)
    first.position -= axis * first_share
    second.position += axis * second_share
    return True


def prevent_crossings(
    player: Player,
    enemies: list[Enemy],
    previous_positions: dict[int, pygame.Vector2],
) -> None:
    """Impedisce lo scambio istantaneo di lato durante una mischia ravvicinata."""
    previous_player = previous_positions.get(player.actor_id)
    if previous_player is None:
        return

    for enemy in enemies:
        if enemy.dead:
            continue
        previous_enemy = previous_positions.get(enemy.actor_id)
        if previous_enemy is None:
            continue

        old_dx = previous_enemy.x - previous_player.x
        new_dx = enemy.position.x - player.position.x
        old_dy = abs(previous_enemy.y - previous_player.y)
        new_dy = abs(enemy.position.y - player.position.y)
        if old_dy > 54.0 or new_dy > 54.0:
            continue
        if old_dx == 0.0 or old_dx * new_dx >= 0.0:
            continue

        minimum = player.collision_radius.x + enemy.collision_radius.x + 7.0
        side = 1.0 if old_dx > 0.0 else -1.0
        enemy.position.x = player.position.x + side * minimum
        enemy.engage_side = int(side)
        enemy.clamp_to_playfield(PLAYFIELD)


def separate_actors(actors: list[Player | Enemy]) -> None:
    """Solver iterativo Combat Lock con clamp finale."""
    for _ in range(7):
        changed = False
        for i, first in enumerate(actors):
            for second in actors[i + 1 :]:
                changed = _separate_pair(first, second) or changed
        if not changed:
            break
    for actor in actors:
        actor.clamp_to_playfield(PLAYFIELD)
