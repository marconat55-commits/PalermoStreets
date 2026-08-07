from __future__ import annotations

from pathlib import Path
import pygame


class AssetStore:
    """Cache centralizzata di immagini e varianti trasformate."""

    def __init__(self) -> None:
        self._sources: dict[str, pygame.Surface] = {}
        self._fixed: dict[str, pygame.Surface] = {}
        self._variants: dict[tuple[str, int, float, float, float], pygame.Surface] = {}

    @staticmethod
    def load_image(path: Path, *, alpha: bool = True) -> pygame.Surface:
        image = pygame.image.load(str(path))
        return image.convert_alpha() if alpha else image.convert()

    def fixed_canvas(self, path: Path) -> pygame.Surface:
        """Restituisce il canvas normalizzato senza crop o resize runtime."""
        key = str(path)
        cached = self._fixed.get(key)
        if cached is not None:
            return cached
        image = self.load_image(path, alpha=True)
        self._fixed[key] = image
        return image

    def source(self, path: Path) -> pygame.Surface:
        key = str(path)
        cached = self._sources.get(key)
        if cached is not None:
            return cached
        source = self.load_image(path, alpha=True)
        bounds = source.get_bounding_rect(min_alpha=8)
        cropped = source.subsurface(bounds).copy() if bounds.width and bounds.height else source
        self._sources[key] = cropped
        return cropped

    def character_variant(
        self, path: Path, height: int, *, scale_x: float = 1.0,
        scale_y: float = 1.0, angle: float = 0.0,
    ) -> pygame.Surface:
        key = (str(path), height, round(scale_x, 3), round(scale_y, 3), round(angle, 2))
        cached = self._variants.get(key)
        if cached is not None:
            return cached
        source = self.source(path)
        base_scale = height / max(1, source.get_height())
        width = max(1, round(source.get_width() * base_scale * scale_x))
        out_height = max(1, round(height * scale_y))
        result = pygame.transform.smoothscale(source, (width, out_height))
        if abs(angle) > 0.01:
            result = pygame.transform.rotozoom(result, angle, 1.0)
        self._variants[key] = result
        return result
