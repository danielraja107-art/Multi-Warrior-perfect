import { useRef, memo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { Html } from '@react-three/drei';
import { WeaponType } from '@storm-arena/shared';
import { WeaponMesh } from './WeaponMesh';
import { useGameStore, type ClientWeaponPickupState } from '../../state/GameStore';

interface WeaponPickupProps {
  pickup: ClientWeaponPickupState;
}

const WEAPON_NAMES: Record<WeaponType, string> = {
  [WeaponType.FIST]: 'FIST',
  [WeaponType.STICK]: 'STICK',
  [WeaponType.BASEBALL_BAT]: 'BASEBALL BAT',
  [WeaponType.AXE]: 'AXE',
  [WeaponType.HAMMER]: 'HAMMER',
  [WeaponType.ROCK]: 'ROCK',
};

export const WeaponPickup = memo(function WeaponPickup({ pickup }: WeaponPickupProps) {
  const groupRef = useRef<Group>(null);
  const ringRef = useRef<Group>(null);
  const [isNear, setIsNear] = useState(false);

  const available = useGameStore(
    (s) => s.weaponPickups[pickup.id]?.isAvailable ?? pickup.isAvailable,
  );

  useFrame((state) => {
    if (!available) return;
    const t = state.clock.elapsedTime;
    const group = groupRef.current;
    if (group) {
      group.position.y = Math.sin(t * 2.2) * 0.08 + 0.35;
      group.rotation.y = t * 1.5;
    }
    const ring = ringRef.current;
    if (ring) {
      ring.rotation.z = t * 0.8;
    }

    // Check distance to local player for prompt display
    const localId = useGameStore.getState().localSessionId;
    const localP = localId ? useGameStore.getState().players[localId] : null;
    if (localP && localP.isAlive) {
      const dist = Math.hypot(localP.position.x - pickup.position.x, localP.position.z - pickup.position.z);
      const near = dist <= 2.5;
      if (near !== isNear) setIsNear(near);
    } else if (isNear) {
      setIsNear(false);
    }
  });

  if (!available) return null;

  const weaponName = WEAPON_NAMES[pickup.type] ?? 'WEAPON';

  return (
    <group position={[pickup.position.x, 0, pickup.position.z]}>
      {/* Subtle floating 3D weapon */}
      <group ref={groupRef} position={[0, 0.35, 0]} scale={1.3}>
        <WeaponMesh type={pickup.type} />
      </group>

      {/* Team-neutral ground indicator */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.25} />
      </mesh>

      <group ref={ringRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.65, 32]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.6} />
      </group>

      {/* Floating neutral marker beacon */}
      <mesh position={[0, 0.85, 0]}>
        <octahedronGeometry args={[0.07, 0]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* Interaction prompt */}
      {isNear && (
        <Html center position={[0, 1.25, 0]} distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1.5px solid #38bdf8',
              color: '#ffffff',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: '4px',
              letterSpacing: '0.08em',
              boxShadow: '0 0 12px rgba(56, 189, 248, 0.6)',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: '#38bdf8', background: '#1e293b', padding: '1px 5px', borderRadius: '2px', border: '1px solid #38bdf8' }}>E</span>
            <span>PICK UP {weaponName}</span>
          </div>
        </Html>
      )}
    </group>
  );
});

export function WeaponPickupLayer() {
  const pickups = useGameStore((s) => s.weaponPickups);
  return (
    <>
      {Object.values(pickups).map((p) => (
        <WeaponPickup key={p.id} pickup={p} />
      ))}
    </>
  );
}
