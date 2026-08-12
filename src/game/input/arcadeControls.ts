export type ArcadeAction = 'special' | 'attack' | 'jump' | null;
export type GrabAction = 'strike' | 'throw' | null;

export interface ArcadeButtons {
  attackPressed: boolean;
  jumpPressed: boolean;
  attackHeld: boolean;
  jumpHeld: boolean;
}

export function resolveArcadeAction(buttons: ArcadeButtons): ArcadeAction {
  const specialPressed =
    (buttons.attackPressed && buttons.jumpHeld)
    || (buttons.jumpPressed && buttons.attackHeld);
  if (specialPressed) return 'special';
  if (buttons.attackPressed) return 'attack';
  if (buttons.jumpPressed) return 'jump';
  return null;
}

export function resolveGrabAction(buttons: Pick<ArcadeButtons, 'attackPressed' | 'jumpPressed'>): GrabAction {
  if (buttons.jumpPressed) return 'throw';
  if (buttons.attackPressed) return 'strike';
  return null;
}
