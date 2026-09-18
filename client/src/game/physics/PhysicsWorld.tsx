import { ReactNode, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { emitBurst } from '../effects/effectsBus';
import { useGameStore } from '../../state/GameStore';

const HALF_EXTENT = 24;
const WALL_HEIGHT = 4;
const WALL_THICK = 0.6;

/** Emits a dust puff when the local player is near an arena wall. */
function WallFeedback() {
  const lastFeedback = useRef(0);

  useFrame(() => {
    const now = performance.now();
    if (now - lastFeedback.current < 600) return;

    const store = useGameStore.getState();
    const localId = store.localSessionId;
    if (!localId) return;
    const player = store.players[localId];
    if (!player) return;

    const px = player.position.x;
    const pz = player.position.z;
    const edge = HALF_EXTENT - 1.0;

    let hitX: number | null = null;
    let hitZ: number | null = null;

    if (Math.abs(px) > edge) hitX = Math.sign(px) * HALF_EXTENT;
    if (Math.abs(pz) > edge) hitZ = Math.sign(pz) * HALF_EXTENT;

    if (hitX !== null || hitZ !== null) {
      lastFeedback.current = now;
      emitBurst('dust', [hitX ?? px, 0.3, hitZ ?? pz], {
        color: '#8a9aaa',
        count: 6,
        power: 0.5,
      });
    }
  });

  return null;
}

function BoundaryWalls() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[HALF_EXTENT, WALL_HEIGHT, WALL_THICK]} position={[0, WALL_HEIGHT, HALF_EXTENT]} />
        <CuboidCollider args={[HALF_EXTENT, WALL_HEIGHT, WALL_THICK]} position={[0, WALL_HEIGHT, -HALF_EXTENT]} />
        <CuboidCollider args={[WALL_THICK, WALL_HEIGHT, HALF_EXTENT]} position={[HALF_EXTENT, WALL_HEIGHT, 0]} />
        <CuboidCollider args={[WALL_THICK, WALL_HEIGHT, HALF_EXTENT]} position={[-HALF_EXTENT, WALL_HEIGHT, 0]} />
      </RigidBody>
    </group>
  );
}

interface PhysicsWorldProps {
  children: ReactNode;
}

export function PhysicsWorld({ children }: PhysicsWorldProps) {
  return (
    <Physics gravity={[0, -20, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[HALF_EXTENT, 0.5, HALF_EXTENT]} position={[0, -0.5, 0]} />
      </RigidBody>
      <BoundaryWalls />
      <WallFeedback />
      {children}
    </Physics>
  );
}