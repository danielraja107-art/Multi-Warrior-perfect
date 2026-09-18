export type EffectKind =
  | 'spark'
  | 'wood'
  | 'flash'
  | 'blood'
  | 'shockwave'
  | 'dust'
  | 'trail'
  | 'death'
  | 'impact'
  | 'enemy_death'
  | 'boss_phase'
  | 'lightning_flash'
  | 'stick_crack'
  | 'rain_impact'
  | 'spawn_beacon'
  | 'rest_glow'
  | 'weapon_respawn';

export interface BurstSpec {
  id: number;
  kind: EffectKind;
  position: [number, number, number];
  color?: string;
  count?: number;
  power?: number;
}

const MAX_BURSTS = 32;
let nextId = 1;
let bursts: BurstSpec[] = [];
const listeners = new Set<() => void>();

const burstPool: BurstSpec[] = [];

function acquireBurst(): BurstSpec {
  if (burstPool.length > 0) {
    return burstPool.pop()!;
  }
  return { id: 0, kind: 'spark', position: [0, 0, 0] };
}

function releaseBurst(spec: BurstSpec): void {
  spec.color = undefined;
  spec.count = undefined;
  spec.power = undefined;
  if (burstPool.length < 64) {
    burstPool.push(spec);
  }
}

function notify() {
  for (const cb of listeners) cb();
}

export function emitBurst(
  kind: EffectKind,
  position: [number, number, number],
  opts?: { color?: string; count?: number; power?: number },
): number {
  const id = nextId++;
  const spec = acquireBurst();
  spec.id = id;
  spec.kind = kind;
  spec.position[0] = position[0];
  spec.position[1] = position[1];
  spec.position[2] = position[2];
  spec.color = opts?.color;
  spec.count = opts?.count;
  spec.power = opts?.power;
  if (bursts.length >= MAX_BURSTS) {
    releaseBurst(bursts[0]);
    bursts = [...bursts.slice(1), spec];
  } else {
    bursts = [...bursts, spec];
  }
  notify();
  return id;
}

export function removeBurst(id: number) {
  const idx = bursts.findIndex((b) => b.id === id);
  if (idx !== -1) {
    const removed = bursts[idx];
    bursts = bursts.filter((b) => b.id !== id);
    releaseBurst(removed);
  }
  notify();
}

export function getBursts(): BurstSpec[] {
  return bursts;
}

export function subscribeBursts(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function clearBursts() {
  for (const b of bursts) {
    releaseBurst(b);
  }
  bursts = [];
  notify();
}

export const EFFECT_COLORS: Record<EffectKind, string> = {
  spark: '#ffe9a8',
  wood: '#a4723a',
  flash: '#fff3c4',
  blood: '#7a1620',
  shockwave: '#8fd4ff',
  dust: '#9aa0a5',
  trail: '#9fd8ff',
  death: '#ff9a3d',
  impact: '#ffd27a',
  enemy_death: '#a33a3a',
  boss_phase: '#ff5a3a',
  lightning_flash: '#e8f2ff',
  stick_crack: '#c8a060',
  rain_impact: '#8ab8d8',
  spawn_beacon: '#42d0ff',
  rest_glow: '#4a8aff',
  weapon_respawn: '#ffdd44',
};
