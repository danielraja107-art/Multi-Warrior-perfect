export interface PlaceholderPose {
  /** Walk cycle phase in radians. */
  phase: number;
  /** 0..1 blend toward run gait. */
  runAmount: number;
  /** Move speed magnitude (units/s). */
  speed: number;
  /** 0..1 attack progress; 0 = not attacking. */
  attack: number;
  /** Attack animation key (for swing type). */
  attackKind: 'punch_light' | 'punch_heavy' | 'swing' | 'rock_throw' | null;
  /** 0..1 dodge progress; 0 = not dodging. */
  dodge: number;
  /** Whether blocking guard is held. */
  blocking: boolean;
  /** 0..1 hit-stagger recoil amount. */
  stagger: number;
  /** Whether in knockdown / death pose. */
  fallen: boolean;
  /** 0..1 lobby idle bob. */
  bob: number;
  /** Whether standing still (idle sway). */
  idle: boolean;
}

export function defaultPose(): PlaceholderPose {
  return {
    phase: 0,
    runAmount: 0,
    speed: 0,
    attack: 0,
    attackKind: null,
    dodge: 0,
    blocking: false,
    stagger: 0,
    fallen: false,
    bob: 0,
    idle: true,
  };
}