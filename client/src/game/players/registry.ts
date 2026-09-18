import { Vector3, Quaternion } from 'three';

export interface LiveTransform {
  position: Vector3;
  rotation: Quaternion;
  updatedAt: number;
}

/**
 * Live, frame-accurate transforms for all players.
 * The local player writes its predicted rigid-body transform here;
 * remote players write their smoothed authoritative transforms.
 * Camera framing reads from this registry to avoid missing local presence.
 */
export const liveTransforms = new Map<string, LiveTransform>();

export function setLiveTransform(sessionId: string, position: Vector3, rotation: Quaternion) {
  const existing = liveTransforms.get(sessionId);
  if (existing) {
    existing.position.copy(position);
    existing.rotation.copy(rotation);
    existing.updatedAt = Date.now();
  } else {
    liveTransforms.set(sessionId, {
      position: position.clone(),
      rotation: rotation.clone(),
      updatedAt: Date.now(),
    });
  }
}

export function getLiveTransform(sessionId: string): Vector3 | null {
  const t = liveTransforms.get(sessionId);
  return t ? t.position : null;
}

export function clearLiveTransform(sessionId: string) {
  liveTransforms.delete(sessionId);
}