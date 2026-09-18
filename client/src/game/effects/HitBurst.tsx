import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BurstSpec } from './effectsBus';
import { removeBurst } from './effectsBus';
import { triggerScreenShake } from './screenShakeBus';

interface HitBurstProps {
  spec: BurstSpec;
}

const GRAVITY = -9.8;

interface ParticleState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

const _dir = new THREE.Vector3();
const _base = new THREE.Color();
const _v = new THREE.Color();

function createParticles(spec: BurstSpec): ParticleState[] {
  const count = spec.count ?? 16;
  const speed = (spec.power ?? 1.2) * 4.5;
  const particles: ParticleState[] = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    _dir.set(
      Math.sin(phi) * Math.cos(theta),
      Math.abs(Math.cos(phi)) * 0.7 + 0.3,
      Math.sin(phi) * Math.sin(theta),
    ).normalize();
    const v = speed * (0.5 + Math.random() * 0.8);
    _dir.multiplyScalar(v);
    particles.push({
      pos: new THREE.Vector3(spec.position[0], spec.position[1] + 0.5, spec.position[2]),
      vel: _dir.clone(),
      life: 0,
      maxLife: 0.45 + Math.random() * 0.35,
    });
  }
  return particles;
}

const SIZE_MAP: Record<string, number> = {
  spark: 0.35,
  shockwave: 0.5,
  enemy_death: 0.45,
  rain_impact: 0.2,
  stick_crack: 0.3,
  spawn_beacon: 0.4,
  weapon_respawn: 0.35,
};

export function HitBurst({ spec }: HitBurstProps) {
  const particles = useMemo(() => createParticles(spec), [spec]);
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const initialArrays = useMemo(() => {
    const posArr = new Float32Array(particles.length * 3);
    const colArr = new Float32Array(particles.length * 3);
    _base.set(spec.color ?? '#ffffff');

    particles.forEach((p, i) => {
      posArr[i * 3] = p.pos.x;
      posArr[i * 3 + 1] = p.pos.y;
      posArr[i * 3 + 2] = p.pos.z;

      _v.copy(_base).multiplyScalar(0.6 + Math.random() * 0.4);
      colArr[i * 3] = _v.r;
      colArr[i * 3 + 1] = _v.g;
      colArr[i * 3 + 2] = _v.b;
    });

    return { posArr, colArr };
  }, [particles, spec.color]);

  const color = useMemo(() => new THREE.Color(spec.color ?? '#ffffff'), [spec.color]);
  const killed = useRef(false);
  const anim = useRef({ t: 0 });

  useEffect(() => {
    if (spec.kind === 'shockwave') {
      triggerScreenShake(0.45 + (spec.power ?? 1) * 0.25);
    }
    const timeout = setTimeout(() => {
      if (!killed.current) {
        killed.current = true;
        removeBurst(spec.id);
      }
    }, 1200);
    return () => {
      clearTimeout(timeout);
      killed.current = true;
    };
  }, [spec]);

  useFrame((_, delta) => {
    anim.current.t += delta;
    const geom = geomRef.current;
    if (!geom) return;

    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geom.getAttribute('color') as THREE.BufferAttribute;
    if (!posAttr || !colAttr) return;

    const arr = posAttr.array as Float32Array;
    const col = colAttr.array as Float32Array;
    let allDead = true;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life += delta;
      if (p.life >= p.maxLife) continue;
      allDead = false;
      p.vel.y += GRAVITY * delta;
      p.pos.addScaledVector(p.vel, delta);
      p.vel.multiplyScalar(1 - delta * 1.5);
      arr[i * 3] = p.pos.x;
      arr[i * 3 + 1] = p.pos.y;
      arr[i * 3 + 2] = p.pos.z;

      const t = Math.max(0, 1 - p.life / p.maxLife);
      col[i * 3] = color.r * t;
      col[i * 3 + 1] = color.g * t;
      col[i * 3 + 2] = color.b * t;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // Animate shockwave expanding ring
    if (ringRef.current && spec.kind === 'shockwave') {
      const progress = Math.min(1, anim.current.t / 0.5);
      const ringScale = 0.5 + progress * (3.0 * (spec.power ?? 1.5));
      ringRef.current.scale.set(ringScale, ringScale, ringScale);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = (1 - progress) * 0.85;
      }
    }

    if (allDead && !killed.current) {
      killed.current = true;
      removeBurst(spec.id);
    }
  });

  const size = SIZE_MAP[spec.kind] ?? 0.35;

  return (
    <group>
      <points>
        <bufferGeometry ref={geomRef}>
          <bufferAttribute attach="attributes-position" args={[initialArrays.posArr, 3]} />
          <bufferAttribute attach="attributes-color" args={[initialArrays.colArr, 3]} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          size={size}
          sizeAttenuation={true}
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Large visible ground expanding shockwave ring for power attacks */}
      {spec.kind === 'shockwave' && (
        <mesh
          ref={ringRef}
          position={[spec.position[0], 0.08, spec.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.3, 0.55, 36]} />
          <meshBasicMaterial
            color={spec.color ?? '#38bdf8'}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
