import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Group, Quaternion, Vector3, Euler } from 'three';

interface KnockbackEffectProps {
  position: [number, number, number];
  /** Knockback direction (world). */
  direction: [number, number, number];
  /** Knockback strength (units/s). */
  strength: number;
}

const _quat = new Quaternion();
const _euler = new Euler();

/**
 * Visual knockback streak: a stretched flash oriented along the knockback
 * direction that decays quickly. Purely presentational.
 */
export function KnockbackEffect({ position, direction, strength }: KnockbackEffectProps) {
  const groupRef = useRef<Group>(null);
  const t = useRef(0);
  const maxT = 0.35;

  const dir = useRef(new Vector3(direction[0], direction[1] || 0, direction[2]).normalize());

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    t.current += delta;
    const p = 1 - t.current / maxT;
    group.visible = p > 0;
    if (!group.visible) return;

    _euler.set(Math.atan2(dir.current.y, 1), Math.atan2(dir.current.x, dir.current.z), 0);
    _quat.setFromEuler(_euler);
    group.quaternion.copy(_quat);
    group.scale.set(1, 1, Math.max(0.01, strength * p * 0.01));
    const mat = (group.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    mat.opacity = 0.55 * p;
  });

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]} visible={false}>
      <mesh>
        <coneGeometry args={[0.12, 2.2, 8]} />
        <meshBasicMaterial color="#cfe6ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}