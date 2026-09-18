import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { PLAYER_COLOR_HEX } from '../../state/GameStore';
import { PlayerColor, WeaponType } from '@storm-arena/shared';
import { PlaceholderPose, defaultPose } from './pose';
import { WeaponMesh } from '../weapons/WeaponMesh';
import { WeaponTrail } from '../effects/WeaponTrail';
import { PlayerModel } from './PlayerModel';

interface PlaceholderPlayerProps {
  color: PlayerColor;
  /** Mutable pose holder shared with the movement controller. */
  poseRef?: React.MutableRefObject<PlaceholderPose>;
  isLocal?: boolean;
  /** Weapon visual held in the right hand. */
  weapon?: WeaponType;
  /** 0..1 current swing progress used to animate the held weapon. */
  weaponSwing?: number;
  /** Server-controlled player state string. */
  playerState?: string;
  /** Movement speed for animation blending. */
  speed?: number;
  /** Whether the player is alive. */
  alive?: boolean;
}

const ARM_FWD = 0.35;
const LEG_SWING = 0.5;

/**
 * Player renderer that supports both placeholder (procedural) and real GLB models.
 * When playerState is provided, uses the real GLB with Mixamo animations.
 * Otherwise falls back to the procedural placeholder.
 */
export function PlaceholderPlayer({
  color,
  poseRef,
  isLocal = false,
  weapon,
  weaponSwing = 0,
  playerState,
  speed = 0,
  alive = true,
}: PlaceholderPlayerProps) {
  const groupRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const leftLegRef = useRef<Group>(null);
  const rightLegRef = useRef<Group>(null);
  const torsoRef = useRef<Group>(null);
  const bobRef = useRef(0);
  const fallRot = useRef(0);

  const pose = poseRef?.current ?? defaultPose();

  const useRealModel = playerState !== undefined;

  useFrame((state, delta) => {
    if (useRealModel) return;

    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;

    bobRef.current += delta * (4 + pose.speed * 0.6);

    let bobY = 0;
    let leanX = 0;
    let leanZ = 0;
    let fall = 0;

    if (pose.fallen) {
      fallRot.current = Math.min(fallRot.current + delta * 3, Math.PI / 2);
      fall = fallRot.current;
    } else {
      fallRot.current = Math.max(fallRot.current - delta * 5, 0);
      fall = fallRot.current;
    }

    const sway = pose.idle ? Math.sin(t * 1.8) * 0.04 : 0;
    bobY = Math.abs(Math.sin(bobRef.current)) * (pose.speed > 0.1 ? 0.05 : 0.02);
    leanX = -pose.speed * 0.012;

    if (pose.dodge > 0) {
      leanZ = pose.dodge * 0.6;
      leanX = -0.15;
    }
    if (pose.blocking) {
      leanX = 0.15;
    }
    if (pose.stagger > 0) {
      leanX = -pose.stagger * 0.5;
    }

    group.rotation.set(0, 0, 0);
    group.rotation.z = leanZ;
    group.rotation.x = -fall;

    const torso = torsoRef.current;
    if (torso) {
      torso.rotation.x = leanX + Math.sin(bobRef.current) * 0.02 + sway;
      torso.rotation.z = sway * 0.5;
    }

    const swing = Math.sin(bobRef.current) * LEG_SWING * (0.4 + pose.runAmount);

    setPivot(leftArmRef.current, swing, pose);
    setPivot(rightArmRef.current, -swing, pose);
    setPivot(leftLegRef.current, -swing, pose);
    setPivot(rightLegRef.current, swing, pose);

    if (poseRef) {
      pose.phase = bobRef.current % (Math.PI * 2);
    }

    if (group.position.y !== bobY) {
      group.position.y = bobY;
    }
  });

  if (useRealModel) {
    return (
      <PlayerModel
        color={color}
        state={playerState}
        speed={speed}
        alive={alive}
        weapon={weapon}
        weaponSwing={weaponSwing}
        poseRef={poseRef}
        isLocal={isLocal}
      />
    );
  }

  const bodyColor = PLAYER_COLOR_HEX[color];
  const skin = '#dfb68b';
  const dark = '#3a3f4a';

  return (
    <group position={[0, 0, 0]}>
      {/* Contact shadow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>

      <group ref={groupRef}>
        <group ref={torsoRef} position={[0, 0.9, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.18, 0.32, 6, 12]} />
            <meshStandardMaterial color={bodyColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.62, 0]} castShadow>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial color={skin} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.68, 0.13]}>
            <boxGeometry args={[0.1, 0.05, 0.02]} />
            <meshStandardMaterial color={dark} />
          </mesh>

          <group ref={leftArmRef} position={[0.26, 0.2, 0]}>
            <mesh position={[0, -0.25, 0]} castShadow>
              <capsuleGeometry args={[0.06, 0.28, 4, 8]} />
              <meshStandardMaterial color={dark} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.52, 0]}>
              <sphereGeometry args={[0.075, 8, 8]} />
              <meshStandardMaterial color={skin} roughness={0.6} />
            </mesh>
          </group>
          <group ref={rightArmRef} position={[-0.26, 0.2, 0]}>
            <mesh position={[0, -0.25, 0]} castShadow>
              <capsuleGeometry args={[0.06, 0.28, 4, 8]} />
              <meshStandardMaterial color={dark} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.52, 0]}>
              <sphereGeometry args={[0.075, 8, 8]} />
              <meshStandardMaterial color={skin} roughness={0.6} />
            </mesh>
            {weapon && weapon !== WeaponType.FIST && (
              <group position={[0, -0.58, 0.03]} rotation={[0, 0, 0.2]}>
                <WeaponMesh type={weapon} swing={weaponSwing} handedness={1} scale={0.85} />
                <WeaponTrail swing={weaponSwing} handedness={1} />
              </group>
            )}
          </group>
        </group>

        <group ref={leftLegRef} position={[0.14, 0.45, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.24, 4, 8]} />
            <meshStandardMaterial color={dark} roughness={0.8} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[-0.14, 0.45, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.24, 4, 8]} />
            <meshStandardMaterial color={dark} roughness={0.8} />
          </mesh>
        </group>

        <mesh position={[0, 0.05, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.34, 4]} />
          <meshBasicMaterial color={bodyColor} transparent opacity={0.55} />
        </mesh>

        {isLocal && (
          <mesh position={[0, 2.15, 0]}>
            <coneGeometry args={[0.09, 0.16, 8]} />
            <meshBasicMaterial color="#7ff0ff" transparent opacity={0.85} />
          </mesh>
        )}
      </group>
    </group>
  );
}

function setPivot(pivot: Group | null, swing: number, pose: PlaceholderPose) {
  if (!pivot) return;

  let rx = swing;

  if (pose.dodge > 0) {
    rx = -pose.dodge * 1.6;
  } else if (pose.blocking) {
    rx = -1.7;
  } else if (pose.stagger > 0) {
    rx = pose.stagger > 0.3 ? 0.4 : -0.4;
  }

  if (pose.attack > 0 && pose.attackKind !== 'rock_throw') {
    if (pose.attackKind === 'punch_heavy') {
      rx = -1.4 + Math.cos(pose.attack * Math.PI * 2) * 1.2;
    } else {
      rx = -1.2 + Math.cos(pose.attack * Math.PI * 2) * 1.1;
    }
  }

  pivot.rotation.x = rx;
  pivot.rotation.z = pivot.position.x > 0 ? 0.15 : -0.15;
}
