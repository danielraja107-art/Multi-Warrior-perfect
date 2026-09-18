import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier';
import type { ClientEnemyState } from '../../state/GameStore';

interface EnemyColliderProps {
  enemy: ClientEnemyState;
  children?: React.ReactNode;
}

/**
 * Kinematic capsule collider that tracks the server-authoritative enemy
 * position every frame. Provides physical presence for player knockback
 * and weapon-sensor overlap without overriding server AI authority.
 *
 * Capsule matches the spec: height 1.8, radius 0.3 (same as player).
 * Enemy is kinematic — it never applies physics forces to itself.
 */
export function EnemyCollider({ enemy, children }: EnemyColliderProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const deadRef = useRef(false);

  useEffect(() => {
    deadRef.current = enemy.state === 'dead';
  }, [enemy.state]);

  useFrame(() => {
    const body = bodyRef.current;
    if (!body || deadRef.current) return;

    body.setNextKinematicTranslation({
      x: enemy.position.x,
      y: enemy.position.y + 0.9,
      z: enemy.position.z,
    });
    body.setNextKinematicRotation({
      x: 0,
      y: Math.sin(enemy.rotation.y / 2),
      z: 0,
      w: Math.cos(enemy.rotation.y / 2),
    });
  });

  if (enemy.state === 'dead') return <>{children}</>;

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      userData={{ type: 'enemy', id: enemy.id }}
    >
      {/* Capsule: half-height 0.6, radius 0.3 */}
      <CapsuleCollider args={[0.6, 0.3]} />
    </RigidBody>
  );
}
