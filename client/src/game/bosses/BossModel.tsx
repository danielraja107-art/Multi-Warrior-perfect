import { useMemo, useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group, Mesh, MeshStandardMaterial, Color, type Object3D } from 'three';
import { AnimationController } from '../players/AnimationController';
import {
  mapBossStateToClip,
  type BossActionFeed,
} from '../players/animations';

const BOSS_MODEL_URL = '/assets/bosses/boss.glb';

export interface BossTint {
  emissive: string;
  intensity: number;
}

export const BOSS_TINTS: Record<string, BossTint> = {
  phase_1: { emissive: '#4a2030', intensity: 0.3 },
  phase_2: { emissive: '#7a2a4a', intensity: 0.45 },
  phase_3: { emissive: '#a83444', intensity: 0.6 },
  enraged: { emissive: '#ff4a2a', intensity: 1.0 },
};

export function preloadBossModel() {
  useGLTF.preload(BOSS_MODEL_URL);
}

interface BossModelProps {
  phase: string;
  isEnraged: boolean;
  currentAttack: string;
  health: number;
  maxHealth: number;
  isActive: boolean;
  speed: number;
}

/**
 * Renders the boss GLB with Mixamo animation clips.
 * Expects the GLB to contain these named animation clips:
 *   idle, walk, attack_heavy_punch, attack_sweep, roar,
 *   phase2_transition, attack_charge, attack_slam,
 *   phase3_transition, attack_spin, attack_grab_throw,
 *   enrage, death
 *
 * Phase-driven emissive tinting and shadow setup are applied on mount.
 */
export function BossModel({
  phase,
  isEnraged,
  currentAttack,
  health,
  maxHealth,
  isActive,
  speed,
}: BossModelProps) {
  const gltf = useGLTF(BOSS_MODEL_URL);
  const rootRef = useRef<Group>(null);

  const tint = BOSS_TINTS[phase] ?? BOSS_TINTS.phase_1;

  const animRequest = useMemo(() => {
    const feed: BossActionFeed = {
      phase,
      currentAttack,
      isEnraged,
      isActive,
      health,
      maxHealth,
      speed,
    };
    const { clip, oneShot, rate } = mapBossStateToClip(feed);
    return { key: clip, oneShot, speed: rate };
  }, [phase, currentAttack, isEnraged, isActive, health, maxHealth, speed]);

  const model = useMemo(() => {
    const root = gltf.scene.clone(true);
    let hasMesh = false;
    root.traverse((obj) => {
      if (obj.type === 'PointLight') {
        obj.visible = false;
      }
      if ((obj as Mesh).isMesh) {
        hasMesh = true;
        const mesh = obj as Mesh;
        if (!mesh.geometry.attributes.normal) {
          mesh.geometry.computeVertexNormals();
        }
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        const mat = mesh.material as MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          const copy = mat.clone();
          copy.roughness = 0.6;
          copy.metalness = 0.7;
          mesh.material = copy;
        }
      }
    });

    if (!hasMesh) return null;

    root.position.y = 0.5;
    return root;
  }, [gltf]);

  useEffect(() => {
    if (!model) return;
    const emissive = new Color(tint.emissive);
    model.traverse((obj) => {
      const mesh = obj as Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          mat.emissive.copy(emissive);
          mat.emissiveIntensity = isEnraged ? 1.0 : tint.intensity;
        }
      }
    });
  }, [model, tint, isEnraged]);

  if (!model) {
    return (
      <group ref={rootRef} position={[0, 0.6, 0]} scale={2.1}>
        <mesh castShadow>
          <capsuleGeometry args={[0.42, 0.9, 8, 16]} />
          <meshStandardMaterial color="#2b2e38" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.28, 0]} castShadow>
          <sphereGeometry args={[0.4, 18, 18]} />
          <meshStandardMaterial
            color="#241720"
            roughness={0.5}
            emissive={tint.emissive}
            emissiveIntensity={isEnraged ? 0.7 : 0.25}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={rootRef} position={[0, 0, 0]} scale={2.1}>
      <primitive object={model} />
      <AnimationController
        gltf={gltf}
        request={animRequest}
        fade={0.2}
      />
    </group>
  );
}
