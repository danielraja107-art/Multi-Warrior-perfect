import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { screenShake } from './screenShakeBus';

/**
 * Applies decaying camera offset from the screen-shake bus.
 * Noise-based so it reads as impact rather than jitter.
 */
export function ScreenShake() {
  const { camera } = useThree();
  const base = useRef(new Vector3());

  useFrame((state, delta) => {
    const mag = screenShake.current;
    if (mag <= 0.001) {
      screenShake.current = 0;
      return;
    }
    screenShake.current = Math.max(0, mag - delta * 2.2);

    const t = state.clock.elapsedTime * 60;
    const s = mag * 0.35;
    camera.position.x += Math.sin(t * 3.1) * s;
    camera.position.y += Math.cos(t * 2.7) * s * 0.7;
    camera.position.z += Math.sin(t * 3.7 + 1.3) * s;
    base.current.copy(camera.position);
  });

  return null;
}