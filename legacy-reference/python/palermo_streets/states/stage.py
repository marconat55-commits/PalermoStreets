from __future__ import annotations

from pathlib import Path
import math
import random
import pygame

from ..assets import AssetStore
from ..config import (
    LOGICAL_WIDTH,
    LOGICAL_HEIGHT,
    PLAYER_START,
    EXIT_X,
    EXIT_TRIGGER_TOLERANCE,
    PLAYFIELD,
    MODULE_FADE_SECONDS,
    MODULE_ENTRY_LOCK,
    DEBUG_DRAW,
)
from ..character_profiles import CharacterProfile, build_animation_bank, load_character_profile
from ..entities.enemy import Enemy
from ..entities.player import Player
from ..systems.combat import resolve_player_attack, resolve_enemy_attack, separate_actors, prevent_crossings
from ..systems.effects import EffectsLayer


class StageState:
    """Stage 1 ZEN completo: sette moduli, ondate, checkpoint e boss finale."""

    def __init__(self, assets: AssetStore, stage_data: dict) -> None:
        self.assets = assets
        self.stage_data = stage_data
        self.modules = stage_data["modules"]
        self.backgrounds = [self._load_background(Path(module["background"])) for module in self.modules]
        self.character_profiles: dict[str, CharacterProfile] = {}
        self.animation_banks: dict[str, object] = {}
        self.player_profile = self._get_character_profile("marco")
        self.player_bank = self._get_animation_bank("marco")
        self.enemy_bank = self._get_animation_bank("talebano")  # alias compatibilità smoke/tool
        self.player = self._create_player()
        self.enemies: list[Enemy] = []
        self.effects = EffectsLayer()

        # Cache HUD: font e label dei nomi vengono creati una sola volta.
        # Questo evita render font ripetuti quando sono presenti più nemici.
        self.enemy_hud_font = pygame.font.Font(None, 18)
        self.enemy_hud_font.set_bold(True)
        self.enemy_label_cache: dict[str, tuple[pygame.Surface, pygame.Surface]] = {}

        self.module_index = 0
        self.current_module: dict = {}
        self.background = self.backgrounds[0]
        self.wave_data: list[dict] = []
        self.wave_index = -1
        self.next_wave_timer = 0.70
        self.module_clear = False
        self.clear_timer = 0.0
        self.exit_x = EXIT_X
        self.entry_lock = MODULE_ENTRY_LOCK
        self.checkpoint_module = 0

        self.hit_stop = 0.0
        self.screen_shake = 0.0
        self.camera_offset = pygame.Vector2()
        self.enemy_attack_lock = 0.0
        self.message = ""
        self.message_timer = 0.0
        self.stage_complete = False
        self.paused = False
        self.debug_draw = DEBUG_DRAW
        self.elapsed = 0.0

        self.transition_phase = "in"  # in, out, None
        self.transition_alpha = 255.0
        self.transition_target = 0
        self._enter_module(0, preserve_player=False)

    def _load_background(self, path: Path) -> pygame.Surface:
        # Overscan di 32x18: durante lo screen shake non appaiono strisce
        # bianche o nere ai bordi del fondale.
        image = AssetStore.load_image(path, alpha=False)
        return pygame.transform.smoothscale(image, (LOGICAL_WIDTH + 32, LOGICAL_HEIGHT + 18))

    def _get_character_profile(self, character_id: str) -> CharacterProfile:
        profile = self.character_profiles.get(character_id)
        if profile is None:
            profile = load_character_profile(character_id)
            self.character_profiles[character_id] = profile
        return profile

    def _get_animation_bank(self, character_id: str):
        bank = self.animation_banks.get(character_id)
        if bank is None:
            profile = self._get_character_profile(character_id)
            bank = build_animation_bank(profile, self.assets)
            self.animation_banks[character_id] = bank
        return bank

    def _create_player(self) -> Player:
        tuning = self.player_profile.gameplay.get("player", {})
        return Player(
            self.player_bank,
            pygame.Vector2(*PLAYER_START),
            max_health=int(tuning.get("max_health", 120)),
            visual_height=self.player_profile.visual_height,
            move_speed=float(tuning.get("move_speed", 285.0)),
            depth_speed=float(tuning.get("depth_speed", 205.0)),
        )

    def _enter_module(self, index: int, *, preserve_player: bool) -> None:
        self.module_index = index
        self.checkpoint_module = index
        self.current_module = self.modules[index]
        self.background = self.backgrounds[index]
        self.wave_data = self.current_module.get("waves", [])
        self.wave_index = -1
        self.next_wave_timer = 0.70
        self.module_clear = False
        self.clear_timer = 0.0
        self.exit_x = float(self.current_module.get("exit_x", EXIT_X))
        self.entry_lock = MODULE_ENTRY_LOCK
        self.enemies.clear()
        self.effects = EffectsLayer()
        self.enemy_attack_lock = 0.0
        self.hit_stop = 0.0
        self.screen_shake = 0.0
        self.camera_offset.update(0, 0)

        entry = self.current_module.get("entry", PLAYER_START)
        self.player.position.update(float(entry[0]), float(entry[1]))
        self.player.velocity.update(0, 0)
        self.player.current_attack = None
        self.player.queued_attack = None
        self.player.attack_hits.clear()
        self.player.combo_counter = 0
        self.player.combo_display_timer = 0.0
        self.player.dead = False
        self.player.remove_ready = False
        self.player.invulnerable = 0.32
        self.player.begin_state("idle", "idle")
        if preserve_player:
            heal = int(self.current_module.get("heal", 0))
            self.player.health = min(self.player.max_health, self.player.health + heal)
        else:
            self.player.health = self.player.max_health
            self.player.fury = 0

        self.message = f"{self.current_module['id']} — {self.current_module['name'].upper()}"
        self.message_timer = 2.0

    def handle_event(self, event: pygame.event.Event) -> None:
        if event.type != pygame.KEYDOWN:
            return
        if event.key == pygame.K_p:
            self.paused = not self.paused
        elif event.key == pygame.K_F3:
            self.debug_draw = not self.debug_draw
        elif event.key == pygame.K_r and self.player.dead:
            self.restart()
        elif not self.paused and not self.stage_complete and self.transition_phase is None:
            # Schema comandi v0.7: tre soli tasti d'azione.
            # J alterna automaticamente i due pugni Extra A. K resta
            # intenzionalmente libero per il futuro salto.
            if event.key == pygame.K_j:
                self.player.request_punch()
            elif event.key == pygame.K_i:
                self.player.request_kick_right()
            elif event.key == pygame.K_l:
                self.player.request_super()

    def restart(self) -> None:
        score = self.player.score
        self.player = self._create_player()
        self.player.score = max(0, score - 500)
        self.stage_complete = False
        self.transition_phase = "in"
        self.transition_alpha = 255.0
        self.transition_target = self.checkpoint_module
        self._enter_module(self.checkpoint_module, preserve_player=False)
        self.message = "CHECKPOINT — RIPROVA"
        self.message_timer = 1.3

    def _spawn_next_wave(self) -> None:
        self.wave_index += 1
        if self.wave_index >= len(self.wave_data):
            return
        wave = self.wave_data[self.wave_index]
        is_boss = bool(wave.get("boss", False))
        character_id = str(wave.get("character", "talebano"))
        profile = self._get_character_profile(character_id)
        bank = self._get_animation_bank(character_id)
        defaults = profile.enemy_defaults
        for index, spawn in enumerate(wave["spawns"]):
            enemy = Enemy(
                bank,
                pygame.Vector2(float(spawn[0]), float(spawn[1])),
                int(wave.get("health", defaults["health"])),
                aggression=float(wave.get("aggression", defaults["aggression"])) + index * 0.035,
                boss=is_boss,
                display_name=str(
                    wave.get(
                        "name",
                        profile.display_name if is_boss else defaults["label"],
                    )
                ),
                variant_index=index % 3,
                character_id=character_id,
                visual_height=profile.visual_height,
                move_speed_scale=float(wave.get("move_speed_scale", defaults["move_speed_scale"])),
                damage_scale=float(wave.get("damage_scale", defaults["damage_scale"])),
                attack_speed_scale=float(wave.get("attack_speed_scale", defaults["attack_speed_scale"])),
                heavy_chance=float(wave.get("heavy_chance", defaults["heavy_chance"])),
                cooldown_scale=float(wave.get("cooldown_scale", defaults["cooldown_scale"])),
                collision_scale=float(wave.get("collision_scale", defaults["collision_scale"])),
            )
            self.enemies.append(enemy)
        if is_boss:
            boss_name = str(wave.get("name", profile.display_name)).upper()
            self.message = f"{boss_name} — RESA DEI CONTI"
            self.message_timer = 2.1
            self.screen_shake = 5.0
        else:
            self.message = f"ONDATA {self.wave_index + 1}/{len(self.wave_data)}"
            self.message_timer = 1.05

    def _start_transition(self) -> None:
        if self.transition_phase is not None:
            return
        self.transition_phase = "out"
        self.transition_alpha = 0.0
        self.transition_target = self.module_index + 1
        self.player.begin_state("idle", "idle")
        self.player.velocity.update(0, 0)

    def _update_transition(self, dt: float) -> None:
        rate = 255.0 / max(0.05, MODULE_FADE_SECONDS)
        if self.transition_phase == "out":
            self.transition_alpha = min(255.0, self.transition_alpha + rate * dt)
            if self.transition_alpha >= 255.0:
                if self.transition_target >= len(self.modules):
                    self.stage_complete = True
                    self.transition_phase = None
                    self.transition_alpha = 0.0
                    return
                self._enter_module(self.transition_target, preserve_player=True)
                self.transition_phase = "in"
                self.transition_alpha = 255.0
        elif self.transition_phase == "in":
            self.transition_alpha = max(0.0, self.transition_alpha - rate * dt)
            if self.transition_alpha <= 0.0:
                self.transition_phase = None

    def update(self, dt: float) -> None:
        if self.paused:
            return
        self.elapsed += dt
        self.message_timer = max(0.0, self.message_timer - dt)

        if self.transition_phase is not None:
            self._update_transition(dt)
            return
        if self.stage_complete:
            return

        self.entry_lock = max(0.0, self.entry_lock - dt)
        if self.hit_stop > 0.0:
            self.hit_stop = max(0.0, self.hit_stop - dt)
            return

        self.screen_shake = max(0.0, self.screen_shake - 24.0 * dt)
        if self.screen_shake > 0.0:
            amount = min(8.0, self.screen_shake)
            self.camera_offset.update(random.uniform(-amount, amount), random.uniform(-amount, amount))
        else:
            self.camera_offset.update(0, 0)

        self.enemy_attack_lock = max(0.0, self.enemy_attack_lock - dt)
        previous_positions = {
            actor.actor_id: actor.position.copy()
            for actor in [self.player, *self.enemies]
        }

        live_before_update = [enemy for enemy in self.enemies if not enemy.dead and enemy.state != "spawn"]
        combat_ready = [
            enemy for enemy in live_before_update
            if enemy.state not in ("hit", "knockdown", "getup")
        ]
        target_pool = combat_ready or live_before_update
        nearest = min(
            target_pool,
            key=lambda enemy: abs(enemy.position.x - self.player.position.x) + abs(enemy.position.y - self.player.position.y) * 1.35,
            default=None,
        )
        self.player.set_auto_target(nearest.position.x if nearest is not None else None)
        if self.entry_lock <= 0.0:
            self.player.update(dt, pygame.key.get_pressed())
        else:
            self.player.update(dt, _NoKeys())

        player_can_be_pressured = self.player.state not in ("hit", "knockdown", "getup") and not self.player.dead
        active_attacker = next((enemy for enemy in combat_ready if enemy.state == "attack"), None)
        if (
            active_attacker is None
            and combat_ready
            and self.enemy_attack_lock <= 0.0
            and player_can_be_pressured
        ):
            active_attacker = min(
                combat_ready,
                key=lambda enemy: (
                    max(0.0, enemy.attack_cooldown) * 95.0
                    + abs(enemy.position.x - self.player.position.x)
                    + abs(enemy.position.y - self.player.position.y) * 1.7
                ),
            )
        supporters = [enemy for enemy in live_before_update if enemy is not active_attacker]
        support_rank = {
            enemy.actor_id: rank
            for rank, enemy in enumerate(sorted(supporters, key=lambda e: e.actor_id))
        }
        attack_states_before = {enemy.actor_id: enemy.state == "attack" for enemy in self.enemies}
        for enemy in self.enemies:
            enemy.update(
                dt,
                self.player,
                self.enemies,
                may_attack=enemy is active_attacker,
                support_rank=support_rank.get(enemy.actor_id, 0),
            )
        if any(
            attack_states_before.get(enemy.actor_id, False) and enemy.state != "attack"
            for enemy in self.enemies
        ):
            self.enemy_attack_lock = max(self.enemy_attack_lock, 0.40)

        player_events = resolve_player_attack(self.player, self.enemies)
        for event in player_events:
            self.hit_stop = max(self.hit_stop, event.hit_stop)
            self.screen_shake = max(self.screen_shake, event.shake)
            self.effects.hit_spark(event.position, event.heavy)
            self.effects.damage_text(event.position, event.damage, event.heavy)

        for enemy in self.enemies:
            event = resolve_enemy_attack(enemy, self.player)
            if event is None:
                continue
            self.hit_stop = max(self.hit_stop, event.hit_stop)
            self.screen_shake = max(self.screen_shake, event.shake)
            self.effects.hit_spark(event.position, event.heavy)
            self.effects.damage_text(event.position, event.damage, event.heavy)
            self.enemy_attack_lock = max(self.enemy_attack_lock, 0.48)

        separate_actors([self.player, *self.enemies])
        prevent_crossings(self.player, self.enemies, previous_positions)
        separate_actors([self.player, *self.enemies])
        self.enemies = [enemy for enemy in self.enemies if not enemy.remove_ready]
        self.effects.update(dt)

        live_enemies = [enemy for enemy in self.enemies if not enemy.dead]
        any_enemy_objects = bool(self.enemies)
        if not live_enemies and not any_enemy_objects and self.wave_index < len(self.wave_data) - 1:
            self.next_wave_timer -= dt
            if self.next_wave_timer <= 0.0:
                self._spawn_next_wave()
                self.next_wave_timer = 0.82
        elif not live_enemies and not any_enemy_objects and self.wave_index == len(self.wave_data) - 1:
            self.clear_timer += dt
            if self.clear_timer > 0.38:
                self.module_clear = True
            # Zona d'uscita con tolleranza: evita che una velocità residua
            # microscopica o l'arrotondamento dei float impediscano il fade.
            if self.module_clear and self.player.position.x >= self.exit_x - EXIT_TRIGGER_TOLERANCE:
                self._start_transition()
        else:
            self.clear_timer = 0.0
            self.module_clear = False

    def draw(self, target: pygame.Surface) -> None:
        target.fill((0, 0, 0))
        background_pos = (-16 + round(self.camera_offset.x), -9 + round(self.camera_offset.y))
        target.blit(self.background, background_pos)
        self._draw_scene_grade(target)
        pygame.draw.rect(target, (0, 0, 0, 110), (0, 0, LOGICAL_WIDTH, 88))

        # Indicatori a terra prima degli sprite: distinguono il boss e rendono
        # leggibile la posizione reale anche quando i personaggi si incrociano.
        for enemy in self.enemies:
            if enemy.dead:
                continue
            color = (176, 42, 36) if enemy.is_boss else ((105, 73, 155) if enemy.variant_index == 1 else (65, 92, 128))
            width = 104 if enemy.is_boss else 76
            pygame.draw.ellipse(
                target,
                color,
                pygame.Rect(
                    round(enemy.position.x + self.camera_offset.x - width / 2),
                    round(enemy.position.y + self.camera_offset.y - 8),
                    width,
                    13,
                ),
                2,
            )

        actors = [*self.enemies, self.player]
        actors.sort(key=lambda actor: (actor.feet.y, actor.actor_id))
        for actor in actors:
            actor.draw(target, self.camera_offset)

        self._draw_enemy_health_bars(target)
        self._draw_enemy_warnings(target)
        self.effects.draw(target)

        if self.module_clear and self.transition_phase is None:
            pulse = 185 + round(55 * abs(math.sin(self.elapsed * 4.2)))
            x = min(1255, round(self.exit_x + 34))
            pygame.draw.polygon(target, (255, pulse, 45), [(x - 42, 530), (x, 555), (x - 42, 580)])
            font = pygame.font.Font(None, 26)
            text = font.render("AVANTI", True, (255, 225, 90))
            target.blit(text, text.get_rect(midright=(x - 48, 555)))

        if self.debug_draw:
            self._draw_debug(target)
        self._draw_hud(target)

        if self.message_timer > 0.0:
            font = pygame.font.Font(None, 39)
            text = font.render(self.message, True, (255, 245, 225))
            box = text.get_rect(center=(640, 122)).inflate(34, 18)
            panel = pygame.Surface(box.size, pygame.SRCALPHA)
            panel.fill((0, 0, 0, 185))
            target.blit(panel, box)
            target.blit(text, text.get_rect(center=box.center))
        elif self.module_clear:
            font = pygame.font.Font(None, 31)
            clear_text = "TETTO LIBERO — VAI A DESTRA" if self.module_index == len(self.modules) - 1 else "AREA LIBERA — VAI A DESTRA"
            text = font.render(clear_text, True, (255, 238, 178))
            target.blit(text, text.get_rect(center=(640, 119)))

        if self.paused:
            self._draw_center_overlay(target, "PAUSA", "PREMI P PER CONTINUARE")
        elif self.player.dead:
            self._draw_center_overlay(target, "MARCO È A TERRA", "PREMI R — RIPARTI DAL CHECKPOINT")
        elif self.stage_complete:
            self._draw_center_overlay(target, "STAGE 1 COMPLETATO", "ZEN — AREA LIBERATA")

        if self.transition_phase is not None and self.transition_alpha > 0.0:
            overlay = pygame.Surface((LOGICAL_WIDTH, LOGICAL_HEIGHT), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, round(self.transition_alpha)))
            target.blit(overlay, (0, 0))

    @staticmethod
    def _draw_scene_grade(target: pygame.Surface) -> None:
        # Vignettatura leggera per fondere sprite e fondali senza coprire il piano.
        shade = pygame.Surface((LOGICAL_WIDTH, LOGICAL_HEIGHT), pygame.SRCALPHA)
        pygame.draw.rect(shade, (0, 0, 0, 42), (0, 0, LOGICAL_WIDTH, 120))
        pygame.draw.rect(shade, (0, 0, 0, 28), (0, LOGICAL_HEIGHT - 58, LOGICAL_WIDTH, 58))
        pygame.draw.rect(shade, (0, 0, 0, 28), (0, 0, 32, LOGICAL_HEIGHT))
        pygame.draw.rect(shade, (0, 0, 0, 28), (LOGICAL_WIDTH - 32, 0, 32, LOGICAL_HEIGHT))
        target.blit(shade, (0, 0))

    def _draw_enemy_health_bars(self, target: pygame.Surface) -> None:
        """Barre compatte con nome, ispirate ai beat 'em up arcade anni '90."""
        font = self.enemy_hud_font
        occupied: list[pygame.Rect] = []

        # Disegno dal fondo verso l'alto; in caso di sovrapposizione le targhe
        # vengono impilate leggermente, senza coprire i volti.
        live = [enemy for enemy in self.enemies if not enemy.dead and enemy.alpha >= 120]
        live.sort(key=lambda enemy: (enemy.position.y, enemy.actor_id), reverse=True)
        for enemy in live:
            ratio = max(0.0, min(1.0, enemy.health / max(1, enemy.max_health)))
            width = 112 if enemy.is_boss else 88
            height = 9 if enemy.is_boss else 7
            center_x = round(enemy.position.x + self.camera_offset.x)
            bar_y = enemy.visual_top(self.camera_offset) - 10

            label_text = enemy.display_name.upper()
            cached = self.enemy_label_cache.get(label_text)
            if cached is None:
                cached = (
                    font.render(label_text, True, (255, 229, 172)),
                    font.render(label_text, True, (18, 12, 12)),
                )
                self.enemy_label_cache[label_text] = cached
            label, label_shadow = cached

            def layout(y: int) -> tuple[pygame.Rect, pygame.Rect, pygame.Rect]:
                bar = pygame.Rect(round(center_x - width / 2), y, width, height)
                label_rect = label.get_rect(midbottom=(center_x, bar.top - 2))
                panel = label_rect.union(bar).inflate(8, 5)
                return bar, label_rect, panel

            box, label_rect, panel = layout(bar_y)
            while any(panel.colliderect(other.inflate(4, 3)) for other in occupied):
                bar_y -= 18
                box, label_rect, panel = layout(bar_y)
            occupied.append(panel)

            # Ombra/piastrina minima: leggibile sul cielo e sui palazzi senza
            # trasformarsi in un HUD moderno troppo invasivo.
            plate = pygame.Surface(panel.size, pygame.SRCALPHA)
            plate.fill((10, 8, 10, 150))
            target.blit(plate, panel.topleft)
            target.blit(label_shadow, label_rect.move(1, 1))
            target.blit(label, label_rect)

            pygame.draw.rect(target, (18, 13, 14), box, border_radius=2)
            inner = box.inflate(-4, -4)
            pygame.draw.rect(target, (65, 27, 25), inner, border_radius=1)
            fill_w = max(0, round(inner.width * ratio))
            if fill_w:
                fill = pygame.Rect(inner.x, inner.y, fill_w, inner.height)
                color = (190, 42, 34) if enemy.is_boss else (218, 69, 38)
                pygame.draw.rect(target, color, fill, border_radius=1)
                if fill.height >= 3:
                    pygame.draw.line(
                        target, (255, 147, 72),
                        (fill.left + 1, fill.top),
                        (max(fill.left + 1, fill.right - 2), fill.top),
                    )
            pygame.draw.rect(target, (245, 211, 139), box, 1, border_radius=2)

    def _draw_enemy_warnings(self, target: pygame.Surface) -> None:
        font = pygame.font.Font(None, 34)
        for enemy in self.enemies:
            ratio = enemy.attack_warning_ratio
            if ratio <= 0.0 or enemy.dead:
                continue
            pulse = 175 + round(80 * ratio)
            center = (
                round(enemy.position.x + self.camera_offset.x + (58 if enemy.is_boss else 46)),
                enemy.visual_top(self.camera_offset) - 20,
            )
            radius = round(13 + ratio * 6)
            pygame.draw.circle(target, (255, pulse, 50), center, radius, 3)
            mark = font.render("!", True, (255, 235, 180))
            target.blit(mark, mark.get_rect(center=center))

    def _draw_hud(self, target: pygame.Surface) -> None:
        health_ratio = self.player.health / self.player.max_health
        fury_ratio = self.player.fury / 100.0
        pygame.draw.rect(target, (32, 27, 28), (30, 20, 390, 28), border_radius=6)
        pygame.draw.rect(target, (190, 44, 42), (33, 23, round(384 * health_ratio), 22), border_radius=5)
        pygame.draw.rect(target, (32, 27, 28), (30, 55, 300, 16), border_radius=5)
        pygame.draw.rect(target, (240, 153, 26), (33, 58, round(294 * fury_ratio), 10), border_radius=4)
        name = pygame.font.Font(None, 25).render("MARCO", True, (255, 245, 230))
        target.blit(name, (35, 3))

        live = len([enemy for enemy in self.enemies if not enemy.dead])
        module_id = self.current_module.get("id", "M01")
        wave_total = max(1, len(self.wave_data))
        wave_shown = min(wave_total, max(1, self.wave_index + 1))
        right = pygame.font.Font(None, 24).render(
            f"{module_id}  {self.module_index + 1}/7   ONDATA {wave_shown}/{wave_total}   NEMICI {live}   PUNTI {self.player.score}",
            True,
            (245, 245, 240),
        )
        target.blit(right, right.get_rect(topright=(1245, 22)))

        # Progressione dei sette moduli.
        for index in range(len(self.modules)):
            color = (245, 165, 35) if index == self.module_index else ((110, 105, 100) if index > self.module_index else (190, 75, 45))
            pygame.draw.circle(target, color, (1055 + index * 27, 62), 6)

        boss = next((enemy for enemy in self.enemies if enemy.is_boss and not enemy.dead), None)
        if boss is not None:
            ratio = boss.health / boss.max_health
            bar = pygame.Rect(430, 46, 420, 18)
            pygame.draw.rect(target, (28, 22, 24), bar, border_radius=5)
            inner = pygame.Rect(bar.x + 3, bar.y + 3, round((bar.width - 6) * ratio), bar.height - 6)
            pygame.draw.rect(target, (172, 34, 30), inner, border_radius=4)
            label = pygame.font.Font(None, 22).render(f"{boss.display_name}  HP {boss.health}/{boss.max_health}", True, (255, 232, 205))
            target.blit(label, label.get_rect(midbottom=(bar.centerx, bar.top - 1)))

        if self.player.combo_display_timer > 0.0 and self.player.combo_counter > 1:
            combo = pygame.font.Font(None, 48).render(f"{self.player.combo_counter} HIT", True, (255, 205, 55))
            target.blit(combo, combo.get_rect(topright=(1235, 92)))

        if self.player.fury >= 50:
            ready = pygame.font.Font(None, 24).render("L — SUPERMOSSA PRONTA", True, (255, 195, 45))
            target.blit(ready, (35, 78))

    def _draw_debug(self, target: pygame.Surface) -> None:
        left, top, right, bottom = PLAYFIELD
        pygame.draw.rect(target, (40, 255, 110), pygame.Rect(round(left), round(top), round(right-left), round(bottom-top)), 2)
        for actor in [self.player, *self.enemies]:
            pygame.draw.rect(target, (80, 210, 255), actor.hurtbox, 2)
            radius = actor.collision_radius
            push_rect = pygame.Rect(
                round(actor.position.x - radius.x),
                round(actor.position.y - radius.y),
                round(radius.x * 2),
                round(radius.y * 2),
            )
            pygame.draw.ellipse(target, (185, 90, 255), push_rect, 2)
            start = (round(actor.position.x), round(actor.position.y - 92))
            end = (round(actor.position.x + actor.facing * 58), round(actor.position.y - 92))
            pygame.draw.line(target, (255, 235, 70), start, end, 3)
            pygame.draw.circle(target, (255, 235, 70), end, 5)
        player_box = self.player.active_attack_box()
        if player_box:
            pygame.draw.rect(target, (255, 210, 40), player_box, 2)
        for enemy in self.enemies:
            box = enemy.active_attack_box()
            if box:
                pygame.draw.rect(target, (255, 70, 70), box, 2)

    @staticmethod
    def _draw_center_overlay(target: pygame.Surface, title: str, subtitle: str) -> None:
        shade = pygame.Surface(target.get_size(), pygame.SRCALPHA)
        shade.fill((0, 0, 0, 178))
        target.blit(shade, (0, 0))
        title_img = pygame.font.Font(None, 58).render(title, True, (255, 188, 45))
        sub_img = pygame.font.Font(None, 30).render(subtitle, True, (238, 230, 218))
        target.blit(title_img, title_img.get_rect(center=(640, 320)))
        target.blit(sub_img, sub_img.get_rect(center=(640, 378)))


class _NoKeys:
    def __getitem__(self, key: int) -> bool:
        return False
