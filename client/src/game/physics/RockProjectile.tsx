import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider } from '@react-three/rapier';
import { Vector3 } from 'three';

interface RockProjectileProps {
  position: [number, number, number];
  direction?: [number, number, number];
  speed?: number;
  onArrive?: () => void;
}

/**
 * Thrown-rock visual with sphere physics. Kinematic so it never becomes
 * authoritative; the server remains responsible for projectile hits.
 */
export function RockProjectile({ position, direction = [0, 0, 1], speed = 12, onArrive }: RockProjectileProps) {
  const bodyRef = useRef(null);
  const dir = useRef(new Vector3(direction[0], direction[1] || 0, direction[2]).normalize());
  const life = useRef(0);

  useFrame((_, delta) => {
    const body = bodyRef.current as unknown as {
      setTranslation?: (v: { x: number; y: number; z: number }, wake: boolean) => void;
      translation?: () => { x: number; y: number; z: number };
    } | null;
    if (!body) return;
    life.current += delta;

    const t = body.translation?.();
    const curr = t ? new Vector3(t.x, t.y, t.z) : new Vector3(position[0], position[1], position[2]);
    curr.addScaledVector(dir.current, speed * delta);
    if (curr.y > 0.25) curr.y = Math.max(0.25, curr.y - 0);

    body.setTranslation?.({ x: curr.x, y: curr.y, z: curr.z }, true);

    if (life.current > 6) {
      onArrive?.();
    }
  });

  return (
    <RigidBody ref={bodyRef as never} type="kinematicPosition" colliders={false} position={position}>
      <BallCollider args={[0.22]} />
      <mesh castShadow>
        <icosahedronGeometry args={[0.22, 1]} />
        <meshStandardMaterial color="#6f7378" roughness={0.95} />
      </mesh>
    </RigidBody>
  );
}