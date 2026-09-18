import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier';
import { Vector3 } from 'three';
import { WeaponType } from '@storm-arena/shared';

interface WeaponSensorProps {
  /** World-space anchor position (hand position). */
  anchorPos: Vector3;
  /** Current weapon type determines the sensor box size. */
  weaponType: WeaponType;
  /** Whether an attack is currently active. */
  swinging: boolean;
  /** Called when the sensor overlaps with an enemy collider (by id). */
  onOverlap?: (enemyId: string) => void;
}

const WEAPON_HALF_EXTENTS: Record<WeaponType, [number, number, number]> = {
  [WeaponType.FIST]:         [0.15, 0.12, 0.15],
  [WeaponType.STICK]:        [0.06, 0.06, 0.65],
  [WeaponType.BASEBALL_BAT]: [0.06, 0.06, 0.55],
  [WeaponType.AXE]:          [0.18, 0.18, 0.22],
  [WeaponType.HAMMER]:       [0.16, 0.16, 0.22],
  [WeaponType.ROCK]:         [0.22, 0.22, 0.22],
};

/**
 * Sensor stub for weapon hit detection.
 * The sensor follows the hand anchor position and is only active during
 * a swing. Actual damage remains server-authoritative; this sensor is
 * a visual/audio cue aid and can be wired to a client-side "preview hit"
 * callback once Member 1 provides the overlap query API.
 *
 * NOTE: server remains the authority for all damage decisions.
 */
export function WeaponSensor({ anchorPos, weaponType, swinging }: WeaponSensorProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const halfExtents = WEAPON_HALF_EXTENTS[weaponType] ?? WEAPON_HALF_EXTENTS[WeaponType.FIST];

  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;

    // Place sensor at tip of weapon (roughly 0.6 units in front of hand)
    body.setNextKinematicTranslation({
      x: anchorPos.x,
      y: anchorPos.y,
      z: anchorPos.z - 0.6,
    });
  });

  if (!swinging) return null;

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      sensor
      userData={{ type: 'weapon_sensor', weapon: weaponType }}
    >
      <CuboidCollider
        args={halfExtents}
        sensor
      />
    </RigidBody>
  );
}
