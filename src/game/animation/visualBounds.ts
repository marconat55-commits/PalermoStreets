import type { VisualFrame } from '../types';

export interface HorizontalExtents {
  left: number;
  right: number;
}

export function horizontalExtents(frame: VisualFrame, flip: -1 | 1): HorizontalExtents {
  const [boundsX, , boundsWidth] = frame.bounds;
  const scale = frame.scale;
  const authoredLeft = (boundsX - frame.width / 2 + frame.offsetX) * scale;
  const authoredRight = (boundsX + boundsWidth - frame.width / 2 + frame.offsetX) * scale;
  if (flip === 1) return { left: authoredLeft, right: authoredRight };
  return { left: -authoredRight, right: -authoredLeft };
}

export function clampFeetX(
  x: number,
  frame: VisualFrame,
  flip: -1 | 1,
  leftBoundary: number,
  rightBoundary: number,
  margin = 6,
): number {
  const extents = horizontalExtents(frame, flip);
  const minimum = leftBoundary + margin - extents.left;
  const maximum = rightBoundary - margin - extents.right;
  if (minimum > maximum) return (leftBoundary + rightBoundary) / 2;
  return Math.max(minimum, Math.min(maximum, x));
}
