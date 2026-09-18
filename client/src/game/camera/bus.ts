import { Vector3 } from 'three';

export interface CinematicRequest {
  position: Vector3;
  durationMs: number;
}

interface CameraBusState {
  cinematic: CinematicRequest | null;
}

const bus: CameraBusState = { cinematic: null };

export function triggerBossCinematic(
  x: number,
  y: number,
  z: number,
  durationMs = 1200,
) {
  bus.cinematic = { position: new Vector3(x, y, z), durationMs };
}

export function consumeCinematic(): CinematicRequest | null {
  const c = bus.cinematic;
  bus.cinematic = null;
  return c;
}