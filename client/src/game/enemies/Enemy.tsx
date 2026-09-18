import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Quaternion, Euler, type Group } from 'three';
import { Html } from '@react-three/drei';
import { EnemyType } from '@storm-arena/shared';
import { useGameStore, type ClientEnemyState } from '../../state/GameStore';
import { mapEnemyStateToAnimation } from '../players/animations';
import { emitBurst } from '../effects/effectsBus';

const ENEMY_STYLE: Record<string, { color: string; scale: number; glow: string; bodyDark: string }> = {
  [EnemyType.BASIC]: { color: '#e57373', scale: 1.5, glow: '#ff5252', bodyDark: '#a84040' },
  [EnemyType.FAST]: { color: '#ffb74d', scale: 1.35, glow: '#ff9800', bodyDark: '#c08030' },
  [EnemyType.HEAVY]: { color: '#b71c1c', scale: 2.3, glow: '#d32f2f', bodyDark: '#7a1010' },
  [EnemyType.SHIELD]: { color: '#64b5f6', scale: 1.7, glow: '#2196f3', bodyDark: '#3a6a90' },
  [EnemyType.RANGED]: { color: '#ba68c8', scale: 1.5, glow: '#ab47bc', bodyDark: '#7a4088' },
  [EnemyType.ELITE]: { color: '#ff1744', scale: 2.5, glow: '#ffff00', bodyDark: '#aa0e30' },
};

const _targetPos = new Vector3();
const _targetQuat = new Quaternion();
const _euler = new Euler();

interface EnemyProps {
  enemy: ClientEnemyState;
}

export const Enemy = memo(function Enemy({ enemy }: EnemyProps) {
  const groupRef = useRef<Group>(null);
  const armRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null);
  const leftLegRef = useRef<Group>(null);
  const rightLegRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const current = useRef(new Vector3(enemy.position.x, enemy.position.y, enemy.position.z));
  const style = useMemo(() => ENEMY_STYLE[enemy.type] ?? ENEMY_STYLE[EnemyType.BASIC], [enemy.type]);

  const wasAlive = useRef(true);
  const spawned = useRef(false);
  const prevHealth = useRef(enemy.health);
  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!spawned.current) {
      spawned.current = true;
      emitBurst('dust', [enemy.position.x, 0.4, enemy.position.z], { color: '#9aa0a5', count: 8, power: 0.8 });
    }

    if (wasAlive.current && enemy.state === 'dead') {
      wasAlive.current = false;
      emitBurst('enemy_death', [enemy.position.x, 0.6, enemy.position.z], { color: '#a33a3a', count: 16, power: 1.2 });
    }
    if (!wasAlive.current && enemy.state !== 'dead') {
      wasAlive.current = true;
    }

    if (prevHealth.current > enemy.health && enemy.health > 0) {
      emitBurst('spark', [enemy.position.x, 0.8, enemy.position.z], { color: '#ffcc00', count: 8, power: 0.8 });
    }
    prevHealth.current = enemy.health;

    _targetPos.set(enemy.position.x, enemy.position.y, enemy.position.z);
    const alpha = 1 - Math.exp(-14 * delta);
    current.current.lerp(_targetPos, alpha);
    _euler.set(enemy.rotation.x, enemy.rotation.y, enemy.rotation.z);
    _targetQuat.setFromEuler(_euler);
    group.position.copy(current.current);
    if (enemy.state !== 'dead') {
      group.quaternion.slerp(_targetQuat, alpha);
    }

    const speed = Math.hypot(_targetPos.x - current.current.x, _targetPos.z - current.current.z) / Math.max(delta, 1e-3);
    const anim = mapEnemyStateToAnimation(enemy.state, speed);

    const t = state.clock.elapsedTime;

    const body = bodyRef.current;
    if (body) {
      const bob = anim === 'walk' || anim === 'run' ? Math.abs(Math.sin(t * 5)) * 0.04 : 0;
      body.position.y = bob;
    }

    const arm = armRef.current;
    if (arm) {
      if (anim === 'punch_heavy') {
        arm.rotation.x = -1.1 + Math.sin(t * 8) * 1.2;
      } else if (anim === 'run') {
        arm.rotation.x = Math.sin(t * 5) * 0.6;
      } else {
        arm.rotation.x = 0;
      }
    }

    const leftArm = leftArmRef.current;
    if (leftArm) {
      if (anim === 'punch_heavy') {
        leftArm.rotation.x = -1.1 + Math.sin(t * 8 + 0.5) * 1.0;
      } else if (anim === 'run') {
        leftArm.rotation.x = Math.sin(t * 5 + Math.PI) * 0.5;
      } else {
        leftArm.rotation.x = 0;
      }
    }

    const leftLeg = leftLegRef.current;
    const rightLeg = rightLegRef.current;
    if (anim === 'walk' || anim === 'run') {
      const legSwing = Math.sin(t * 6) * 0.45;
      if (leftLeg) leftLeg.rotation.x = legSwing;
      if (rightLeg) rightLeg.rotation.x = -legSwing;
    } else {
      if (leftLeg) leftLeg.rotation.x = 0;
      if (rightLeg) rightLeg.rotation.x = 0;
    }
  });

  const hpPct = enemy.health / Math.max(1, enemy.maxHealth);

  return (
    <group ref={groupRef} position={[enemy.position.x, 0, enemy.position.z]} scale={style.scale}>
      {/* Contact shadow on ground */}
      {enemy.state !== 'dead' && (
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.38, 24]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.35} />
        </mesh>
      )}

      {/* Hostile ground marker ring */}
      {enemy.state !== 'dead' && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.44, 32]} />
          <meshBasicMaterial color="#ff3b30" transparent opacity={0.7} />
        </mesh>
      )}

      <group ref={bodyRef} position={[0, 0.72, 0]}>
        {/* Torso - wider for better silhouette */}
        <mesh castShadow>
          <capsuleGeometry args={[0.22, 0.4, 6, 12]} />
          <meshStandardMaterial color={style.color} roughness={0.75} emissive={style.glow} emissiveIntensity={0.06} />
        </mesh>

        {/* Shoulders / upper body mass */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.5, 0.15, 0.3]} />
          <meshStandardMaterial color={style.bodyDark} roughness={0.8} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.62, 0]} castShadow>
          <sphereGeometry args={[0.22, 14, 14]} />
          <meshStandardMaterial color={style.color} roughness={0.7} emissive={style.glow} emissiveIntensity={enemy.type === EnemyType.ELITE ? 0.5 : 0.25} />
        </mesh>

        {/* Eyes - glowing hostile identity */}
        {/* Left eye glow halo */}
        <mesh position={[-0.07, 0.65, 0.17]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#ff1a1a" transparent opacity={0.18} />
        </mesh>
        {/* Left eye core */}
        <mesh position={[-0.07, 0.65, 0.18]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial color="#ff3333" />
        </mesh>
        {/* Right eye glow halo */}
        <mesh position={[0.07, 0.65, 0.17]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#ff1a1a" transparent opacity={0.18} />
        </mesh>
        {/* Right eye core */}
        <mesh position={[0.07, 0.65, 0.18]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial color="#ff3333" />
        </mesh>

        {/* Brow ridge for hostile expression */}
        <mesh position={[0, 0.72, 0.16]}>
          <boxGeometry args={[0.18, 0.04, 0.02]} />
          <meshStandardMaterial color="#1a1420" />
        </mesh>

        {/* Right arm (attacking) */}
        <group ref={armRef} position={[0.3, 0.15, 0]}>
          <mesh position={[0, -0.1, 0.1]} castShadow>
            <capsuleGeometry args={[0.065, 0.28, 4, 8]} />
            <meshStandardMaterial color={style.bodyDark} roughness={0.85} />
          </mesh>
          {/* Fist */}
          <mesh position={[0, -0.3, 0.1]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color={style.color} roughness={0.7} />
          </mesh>
          {enemy.type === EnemyType.SHIELD && (
            <group position={[0, 0.05, 0.35]} scale={1.5}>
              <mesh>
                <boxGeometry args={[0.4, 0.6, 0.06]} />
                <meshStandardMaterial color="#5b7488" roughness={0.4} metalness={0.5} />
              </mesh>
            </group>
          )}
          {enemy.type === EnemyType.RANGED && (
            <group position={[0, 0.05, 0.35]} scale={1.4}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.14, 0.03, 6, 10]} />
                <meshStandardMaterial color="#d0bcf0" emissive="#8a6fd0" emissiveIntensity={0.4} />
              </mesh>
            </group>
          )}
        </group>

        {/* Left arm (idle / guard) */}
        <group ref={leftArmRef} position={[-0.3, 0.15, 0]}>
          <mesh position={[0, -0.1, 0.1]} castShadow>
            <capsuleGeometry args={[0.065, 0.28, 4, 8]} />
            <meshStandardMaterial color={style.bodyDark} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.3, 0.1]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color={style.color} roughness={0.7} />
          </mesh>
        </group>

        {/* Pelvis / hips */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.34, 0.12, 0.22]} />
          <meshStandardMaterial color={style.bodyDark} roughness={0.85} />
        </mesh>

        {/* Left leg */}
        <group ref={leftLegRef} position={[-0.12, -0.26, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.26, 4, 8]} />
            <meshStandardMaterial color={style.bodyDark} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.36, 0.04]} castShadow>
            <boxGeometry args={[0.1, 0.07, 0.16]} />
            <meshStandardMaterial color={style.bodyDark} roughness={0.9} />
          </mesh>
        </group>

        {/* Right leg */}
        <group ref={rightLegRef} position={[0.12, -0.26, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.26, 4, 8]} />
            <meshStandardMaterial color={style.bodyDark} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.36, 0.04]} castShadow>
            <boxGeometry args={[0.1, 0.07, 0.16]} />
            <meshStandardMaterial color={style.bodyDark} roughness={0.9} />
          </mesh>
        </group>
      </group>

      {/* Floating indicator */}
      {enemy.state !== 'dead' && (
        <mesh position={[0, 1.5, 0]}>
          <octahedronGeometry args={[0.06, 0]} />
          <meshBasicMaterial color={style.glow} />
        </mesh>
      )}

      {hpPct > 0 && enemy.state !== 'dead' && (
        <Html center position={[0, 1.8, 0]} distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              width: 48,
              height: 6,
              background: 'rgba(10, 14, 22, 0.85)',
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid #000000aa',
              boxShadow: '0 0 4px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                width: `${hpPct * 100}%`,
                height: '100%',
                background: hpPct > 0.4 ? '#ef4444' : '#ff1744',
                transition: 'width 0.1s ease',
              }}
            />
          </div>
        </Html>
      )}
    </group>
  );
});

export function EnemyLayer() {
  const enemies = useGameStore((s) => s.enemies);
  return (
    <>
      {Object.values(enemies).map((e) => (
        <Enemy key={e.id} enemy={e} />
      ))}
    </>
  );
}
