export type JumpClip = 'jump' | 'jump_forward';

export function selectJumpClip(horizontalIntent: number, hasForwardClip: boolean): JumpClip {
  return horizontalIntent !== 0 && hasForwardClip ? 'jump_forward' : 'jump';
}
