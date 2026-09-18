import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { liveTransforms } from '../players/registry';
import { consumeCinematic } from './bus';
import { useGameStore } from '../../state/GameStore';

const DEFAULT_DISTANCE = 11;
const FOLLOW_SMOOTHNESS = 0.12;
const AZIMUTH = 0.32;
const PITCH_RATIO = 0.55;

const _center = new Vector3();
const _cur = new Vector3();
const _cinematic = new Vector3();
const _work = new Vector3();

interface GroupCameraProps {
  enabled?: boolean;
}

export function GroupCamera({ enabled = true }: GroupCameraProps) {
  const { camera } = useThree();
  const currentPos = useRef(new Vector3(0, 8, 12));
  const cinematicUntil = useRef(0);
  const cinematicStart = useRef(0);
  const cinematicFocus = useRef(new Vector3());

  useFrame((_, delta) => {
    if (!enabled) return;

    const localSessionId = useGameStore.getState().localSessionId;
    const localTransform = localSessionId ? liveTransforms.get(localSessionId) : undefined;
    const target = localTransform ? localTransform.position : computeGroupCenter();

    const now = performance.now();
    const request = consumeCinematic();
    if (request) {
      cinematicFocus.current.copy(request.position);
      cinematicFocus.current.y = Math.max(request.position.y, 1.5);
      cinematicStart.current = now;
      cinematicUntil.current = now + request.durationMs;
    }

    let focus = target;
    if (now < cinematicUntil.current) {
      const total = Math.max(1, cinematicUntil.current - cinematicStart.current);
      const t = Math.min(1, (now - cinematicStart.current) / (total * 0.7));
      _cinematic.lerpVectors(target, cinematicFocus.current, t);
      focus = _cinematic;
    }
    focus.y = Math.max(focus.y, 0.8);

    currentPos.current.lerp(focus, FOLLOW_SMOOTHNESS);
    _cur.copy(currentPos.current);

    const azX = Math.sin(AZIMUTH);
    const azZ = Math.cos(AZIMUTH);
    camera.position.set(
      _cur.x + azX * DEFAULT_DISTANCE * 0.88,
      _cur.y + DEFAULT_DISTANCE * PITCH_RATIO,
      _cur.z + azZ * DEFAULT_DISTANCE * 0.88,
    );
    camera.lookAt(_cur.x, _cur.y + 0.8, _cur.z);
  });

  return null;
}

function computeGroupCenter(): Vector3 {
  const values = [...liveTransforms.values()];
  _center.set(0, 0, 0);
  if (values.length === 0) return _center;
  let count = 0;
  const now = Date.now();
  for (const v of values) {
    if (now - v.updatedAt > 3000) continue;
    _center.add(v.position);
    count++;
  }
  if (count > 0) _center.multiplyScalar(1 / count);
  return _center;
}

function computeSpread(center: Vector3): number {
  const values = [...liveTransforms.values()];
  if (values.length === 0) return 0;
  let maxD = 0;
  const now = Date.now();
  for (const v of values) {
    if (now - v.updatedAt > 3000) continue;
    _work.copy(v.position).sub(center);
    maxD = Math.max(maxD, _work.length());
  }
  return maxD;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}