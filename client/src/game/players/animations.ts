export type AnimationKey =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'dodge'
  | 'block'
  | 'block_hit'
  | 'punch_light'
  | 'punch_heavy'
  | 'bat_swing'
  | 'axe_swing'
  | 'hammer_swing'
  | 'stick_swing'
  | 'rock_throw'
  | 'hit_light'
  | 'hit_heavy'
  | 'knockdown'
  | 'getup'
  | 'pickup'
  | 'death'
  | 'victory'
  | BossClipName;

export type BossClipName =
  | 'idle'
  | 'walk'
  | 'attack_heavy_punch'
  | 'attack_sweep'
  | 'roar'
  | 'phase2_transition'
  | 'attack_charge'
  | 'attack_slam'
  | 'phase3_transition'
  | 'attack_spin'
  | 'attack_grab_throw'
  | 'enrage'
  | 'death';

export interface PlaybackRequest {
  key: AnimationKey | null;
  oneShot?: boolean;
  speed?: number;
}

export function mapPlayerStateToAnimation(
  state: string,
  speed: number,
  alive: boolean,
): AnimationKey {
  if (!alive) return 'death';
  if (state === 'blocking') return 'block';
  if (state === 'dodging') return 'dodge';
  if (state === 'staggered') return 'hit_light';
  if (state === 'attacking') return 'punch_light';
  if (speed > 7.5) return 'run';
  if (speed > 0.5) return 'walk';
  return 'idle';
}

export function mapEnemyStateToAnimation(state: string, speed: number): AnimationKey {
  if (state === 'dead') return 'death';
  if (state === 'stagger' || state === 'knockback') return 'hit_heavy';
  if (state === 'attack') return 'punch_heavy';
  if (state === 'detect') return 'idle';
  if (speed > 3.0) return 'run';
  if (speed > 0.5) return 'walk';
  return 'idle';
}

export function mapWeaponToSwingAnimation(weapon: string): AnimationKey {
  switch (weapon) {
    case 'baseball_bat':
      return 'bat_swing';
    case 'axe':
      return 'axe_swing';
    case 'hammer':
      return 'hammer_swing';
    case 'stick':
      return 'stick_swing';
    case 'rock':
      return 'rock_throw';
    default:
      return 'punch_light';
  }
}

export const BOSS_CLIP_SET: Record<BossClipName, true> = {
  idle: true,
  walk: true,
  attack_heavy_punch: true,
  attack_sweep: true,
  roar: true,
  phase2_transition: true,
  attack_charge: true,
  attack_slam: true,
  phase3_transition: true,
  attack_spin: true,
  attack_grab_throw: true,
  enrage: true,
  death: true,
};

export interface BossActionFeed {
  phase: BossPhaseLike;
  currentAttack: string;
  isEnraged: boolean;
  isActive: boolean;
  health: number;
  maxHealth: number;
  speed: number;
}

export type BossPhaseLike = string;

const WALK_THRESHOLD = 1.5;

function mapAttackToClip(attack: string): BossClipName {
  switch (attack) {
    case 'heavy_punch':
      return 'attack_heavy_punch';
    case 'sweep':
      return 'attack_sweep';
    case 'charge':
      return 'attack_charge';
    case 'slam':
      return 'attack_slam';
    case 'roar':
      return 'roar';
    case 'spin_attack':
      return 'attack_spin';
    case 'grab_throw':
      return 'attack_grab_throw';
    default:
      return 'attack_heavy_punch';
  }
}

/**
 * Maps live boss state to the canonical rigged clip name.
 * Each BossAttack maps to its corresponding Mixamo clip:
 *   heavy_punch  → attack_heavy_punch  (Mixamo: Heavy Punch)
 *   sweep        → attack_sweep        (Mixamo: Sweep)
 *   charge       → attack_charge       (Mixamo: Running Charge)
 *   slam         → attack_slam         (Mixamo: Ground Slam)
 *   roar         → roar                (Mixamo: Roar)
 *   spin_attack  → attack_spin         (Mixamo: Spinning Kick)
 *   grab_throw   → attack_grab_throw   (Mixamo: Grab)
 *
 * Idle/walk/death/enrage/phase transitions are determined by health %, speed, and isActive.
 */
export function mapBossStateToClip(feed: BossActionFeed): {
  clip: BossClipName;
  oneShot: boolean;
  rate: number;
} {
  if (!feed.isActive || feed.health <= 0) {
    return { clip: 'death', oneShot: true, rate: 1 };
  }

  if (feed.isEnraged) {
    if (feed.currentAttack) {
      return { clip: mapAttackToClip(feed.currentAttack), oneShot: true, rate: 1.6 };
    }
    return { clip: 'enrage', oneShot: false, rate: 1.6 };
  }

  if (feed.currentAttack) {
    return { clip: mapAttackToClip(feed.currentAttack), oneShot: true, rate: 1 };
  }

  const phasePct = feed.health / Math.max(1, feed.maxHealth);

  if (phasePct <= 0.2) {
    return feed.speed > WALK_THRESHOLD
      ? { clip: 'walk', oneShot: false, rate: 1 }
      : { clip: 'phase3_transition', oneShot: false, rate: 1 };
  }
  if (phasePct <= 0.5) {
    return feed.speed > WALK_THRESHOLD
      ? { clip: 'walk', oneShot: false, rate: 1 }
      : { clip: 'phase3_transition', oneShot: false, rate: 1 };
  }
  if (phasePct <= 0.75) {
    return feed.speed > WALK_THRESHOLD
      ? { clip: 'walk', oneShot: false, rate: 1 }
      : { clip: 'phase2_transition', oneShot: false, rate: 1 };
  }

  return feed.speed > WALK_THRESHOLD
    ? { clip: 'walk', oneShot: false, rate: 1 }
    : { clip: 'idle', oneShot: false, rate: 1 };
}
