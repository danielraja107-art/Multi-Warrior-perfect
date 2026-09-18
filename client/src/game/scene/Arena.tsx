import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { emitBurst } from '../effects/effectsBus';

const ARENA_HALF = 24;
/** How many rain drops hit the ground and emit a splash per tick. */
const RAIN_IMPACT_RATE = 3;
/** Min ms between impact burst emissions. */
const IMPACT_EMIT_INTERVAL = 80;

interface RainProps {
  intensity: number;
}

function Rain({ intensity }: RainProps) {
  const ref = useRef<THREE.Points>(null);
  const count = Math.round(intensity * 450);
  const impactTimer = useRef(0);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * (ARENA_HALF * 2 + 20);
      arr[i * 3 + 1] = Math.random() * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * (ARENA_HALF * 2 + 20);
    }
    return arr;
  }, [count]);

  const speeds = useMemo(
    () => Array.from({ length: count }, () => 0.12 + Math.random() * 0.15),
    [count],
  );

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    let impactsThisFrame = 0;
    impactTimer.current += delta * 1000;

    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speeds[i] * delta * 60 * 0.05;
      arr[i * 3] -= speeds[i] * delta * 60 * 0.008;
      if (arr[i * 3 + 1] < 0) {
        // Rain drop hit the ground — emit a splash
        if (
          impactsThisFrame < RAIN_IMPACT_RATE &&
          impactTimer.current > IMPACT_EMIT_INTERVAL
        ) {
          const ix = arr[i * 3];
          const iz = arr[i * 3 + 2];
          // Only emit inside the arena
          if (Math.abs(ix) < ARENA_HALF && Math.abs(iz) < ARENA_HALF) {
            emitBurst('rain_impact', [ix, 0.02, iz], {
              color: '#8ab8d8',
              count: 3,
              power: 0.2,
            });
            impactsThisFrame++;
            if (impactsThisFrame >= RAIN_IMPACT_RATE) {
              impactTimer.current = 0;
            }
          }
        }
        arr[i * 3 + 1] = 14 + Math.random() * 2;
        arr[i * 3] = (Math.random() - 0.5) * (ARENA_HALF * 2 + 20);
        arr[i * 3 + 2] = (Math.random() - 0.5) * (ARENA_HALF * 2 + 20);
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#9ab4e8"
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
}

interface LightningProps {
  enabled: boolean;
  onFlash?: (strength: number) => void;
}

function Lightning({ enabled, onFlash }: LightningProps) {
  const ref = useRef<THREE.DirectionalLight>(null);
  const nextFlash = useRef(Date.now() + 4000);

  useFrame((state) => {
    if (!enabled) return;
    const now = state.clock.elapsedTime * 1000;
    if (ref.current && now > nextFlash.current) {
      ref.current.intensity = 8 + Math.random() * 6;
      onFlash?.(ref.current.intensity);
      setTimeout(() => {
        if (ref.current) ref.current.intensity = 0.6;
      }, 90);
      setTimeout(() => {
        if (ref.current) ref.current.intensity = 5 + Math.random() * 4;
      }, 140);
      setTimeout(() => {
        if (ref.current) ref.current.intensity = 0.6;
      }, 220);
      nextFlash.current = now + 5000 + Math.random() * 9000;
    }
  });

  return <directionalLight ref={ref} position={[0, 20, -10]} intensity={0.6} color="#c8d6ff" />;
}

function IndustrialBuildings() {
  const buildings = useMemo(() => {
    const arr: Array<{
      position: [number, number, number];
      size: [number, number, number];
      color: string;
    }> = [];
    const colors = ['#0d1520', '#0a1119', '#101a28', '#0c1420'];
    const spots = 34;
    for (let i = 0; i < spots; i++) {
      const angle = (i / spots) * Math.PI * 2 + Math.random() * 0.3;
      const radius = 32 + Math.random() * 26;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const h = 8 + Math.random() * 22;
      arr.push({
        position: [x, h / 2 - 0.5, z],
        size: [5 + Math.random() * 7, h, 5 + Math.random() * 7],
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={b.position}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} roughness={0.95} envMapIntensity={0.2} />
        </mesh>
      ))}
      {Array.from({ length: 60 }).map((_, i) => {
        const angle = (i / 60) * Math.PI * 2 + Math.random() * 0.2;
        const radius = 34 + Math.random() * 24;
        const h = 26;
        return (
          <mesh
            key={`w-${i}`}
            position={[Math.cos(angle) * radius, 12 + Math.random() * (h - 14) * 0.5, Math.sin(angle) * radius]}
          >
            <boxGeometry args={[0.5 + Math.random() * 0.8, 2.5, 0.5 + Math.random() * 0.8]} />
            <meshBasicMaterial
              color={Math.random() > 0.5 ? '#ffd27a' : '#7fd4ff'}
              transparent
              opacity={0.9}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function Arena() {
  return (
    <group>
      {/* Main platform */}
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <boxGeometry args={[ARENA_HALF * 2, 0.5, ARENA_HALF * 2]} />
        <meshStandardMaterial color="#22262e" roughness={0.85} metalness={0.15} />
      </mesh>

      {/* Wet sheen overlay */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ARENA_HALF * 2 - 0.2, ARENA_HALF * 2 - 0.2]} />
        <meshPhysicalMaterial
          color="#141a24"
          roughness={0.25}
          metalness={0.6}
          clearcoat={0.4}
          transparent
          opacity={0.65}
        />
      </mesh>

      {/* Rooftop perimeter railings */}
      {([0, 1, 2, 3] as const).map((side) => {
        const horizontal = side % 2 === 0;
        const span = ARENA_HALF * 2;
        const offset = ARENA_HALF - 1;
        return (
          <group key={side}>
            <mesh
              position={
                horizontal
                  ? [0, 1.0, side === 0 ? offset : -offset]
                  : [side === 1 ? offset : -offset, 1.0, 0]
              }
            >
              <boxGeometry args={horizontal ? [span, 0.12, 0.25] : [0.25, 0.12, span]} />
              <meshStandardMaterial color="#3a4150" roughness={0.6} metalness={0.4} />
            </mesh>
            {Array.from({ length: 18 }).map((_, i) => {
              const p = -ARENA_HALF + 2 + ((span - 4) / 17) * i;
              return (
                <mesh
                  key={i}
                  position={
                    horizontal
                      ? [p, 0.6, side === 0 ? offset : -offset]
                      : [side === 1 ? offset : -offset, 0.6, p]
                  }
                >
                  <boxGeometry args={horizontal ? [0.12, 1.2, 0.25] : [0.25, 1.2, 0.12]} />
                  <meshStandardMaterial color="#2c3240" roughness={0.7} metalness={0.3} />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* Neon strips in floor */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[11.5, 64]} />
        <meshBasicMaterial color="#3b9eff" transparent opacity={0.16} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const r = 20 - (i % 2) * 6;
        return (
          <mesh key={i} position={[Math.cos(angle) * r, 0.04, Math.sin(angle) * r]} rotation={[-Math.PI / 2, 0, angle]}>
            <boxGeometry args={[0.08, 0.06, 1.4 + (i % 2) * 2]} />
            <meshBasicMaterial color="#2fd4ff" />
          </mesh>
        );
      })}

      {/* Industrial surroundings */}
      <IndustrialBuildings />

      {/* Rain */}
      <Rain intensity={1} />

      {/* Lightning */}
      <Lightning enabled />
    </group>
  );
}