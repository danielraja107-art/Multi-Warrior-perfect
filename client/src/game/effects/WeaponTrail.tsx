import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Group } from 'three';

interface WeaponTrailProps {
  /** 0..1 swing progress; nonzero renders the trail arc. */
  swing: number;
  handedness?: number;
  color?: string;
}

function buildArcGeometry() {
  const arc = 1.6;
  const segments = 10;
  const positions: number[] = [];
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j <= 1; j++) {
      const a = -arc / 2 + (i / segments) * arc;
      const r = 0.5 + j * 0.12;
      positions.push(Math.sin(a) * r, 0, Math.cos(a) * r);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  return g;
}

/**
 * Lightweight swing trail. Renders as a flattened arc segment that fades
 * with swing progress. Reuses a single geometry.
 */
export function WeaponTrail({ swing, handedness = 1, color = '#a8dcff' }: WeaponTrailProps) {
  const groupRef = useRef<Group>(null);
  const geometry = useMemo(buildArcGeometry, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const active = swing > 0 && swing < 0.94;
    group.visible = active;
    if (!group.visible) return;

    const mat = (group.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    const targetOpacity = Math.sin(swing * Math.PI) * 0.7;
    mat.opacity += (targetOpacity - mat.opacity) * Math.min(1, 24 * delta);
    group.rotation.y = handedness * (-0.9 + swing * 1.4);
    group.scale.setScalar(0.9 + Math.sin(swing * Math.PI) * 0.25);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} rotation={[0, 0, handedness * 0.5]} visible>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}