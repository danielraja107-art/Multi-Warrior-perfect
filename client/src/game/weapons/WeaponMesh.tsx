import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { WeaponType } from '@storm-arena/shared';
import { emitBurst } from '../effects/effectsBus';

export const WEAPON_GLB_URLS: Partial<Record<WeaponType, string>> = {
  [WeaponType.AXE]: '/assets/Weapons/axe-3d.glb',
  [WeaponType.BASEBALL_BAT]: '/assets/Weapons/baseballbat-3d.glb',
  [WeaponType.HAMMER]: '/assets/Weapons/hammer-3d.glb',
  [WeaponType.STICK]: '/assets/Weapons/stick.glb',
};

export function preloadWeaponModels() {
  Object.values(WEAPON_GLB_URLS).forEach((url) => {
    if (url) useGLTF.preload(url);
  });
}

function GLBWeaponModel({ type }: { type: WeaponType }) {
  const url = WEAPON_GLB_URLS[type];
  if (!url) return null;
  const gltf = useGLTF(url);
  const cloned = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        const mesh = obj as Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        if (mesh.material) {
          const mat = (mesh.material as MeshStandardMaterial).clone();
          mat.roughness = 0.55;
          mesh.material = mat;
        }
      }
    });
    return root;
  }, [gltf]);

  if (type === WeaponType.BASEBALL_BAT) {
    return (
      <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.25]} scale={1.2}>
        <primitive object={cloned} />
      </group>
    );
  }
  if (type === WeaponType.AXE) {
    return (
      <group rotation={[0, 0, -Math.PI / 8]} position={[0, 0.2, 0]} scale={0.9}>
        <primitive object={cloned} />
      </group>
    );
  }
  if (type === WeaponType.HAMMER) {
    return (
      <group rotation={[0, 0, -Math.PI / 8]} position={[0, 0.2, 0]} scale={0.9}>
        <primitive object={cloned} />
      </group>
    );
  }
  if (type === WeaponType.STICK) {
    return (
      <group rotation={[0, Math.PI / 4, 0]} position={[0, 0, 0]} scale={1.1}>
        <primitive object={cloned} />
      </group>
    );
  }

  return <primitive object={cloned} />;
}

interface WeaponMeshProps {
  type: WeaponType;
  /** 0..1 swing progress; when provided the weapon swings in an arc. */
  swing?: number;
  /** Swing handedness: +1 right, -1 left. */
  handedness?: number;
  scale?: number;
  /** World-space position of the weapon tip for impact emission. */
  worldPos?: [number, number, number];
}

const WOOD = '#8a5a2b';
const WOOD_DARK = '#5f3c1a';
const METAL = '#9aa3ad';
const METAL_DARK = '#4a5058';
const ROCK = '#6f7378';

/**
 * Renders 3D GLB weapon models for Stick, Baseball Bat, Axe, and Hammer,
 * with procedural mesh fallbacks for Rock or untextured primitives.
 */
export function WeaponMesh({ type, swing = 0, handedness = 1, scale = 1, worldPos }: WeaponMeshProps) {
  const groupRef = useRef<Group>(null);
  const rotRef = useRef(0);
  const peakEmitted = useRef(false);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    if (swing > 0 && swing < 1) {
      const target = -handedness * (0.2 + swing * 2.4);
      rotRef.current += (target - rotRef.current) * Math.min(1, 18 * delta);

      // Emit stick-crack impact at peak of swing (around swing ~0.5)
      if (type === WeaponType.STICK && swing > 0.45 && swing < 0.55 && !peakEmitted.current) {
        peakEmitted.current = true;
        const pos = worldPos ?? [0, 1, 0];
        emitBurst('stick_crack', pos, { color: '#c8a060', count: 8, power: 0.7 });
      }
    } else {
      rotRef.current += (0 - rotRef.current) * Math.min(1, 10 * delta);
      if (swing === 0) peakEmitted.current = false;
    }
    group.rotation.x = rotRef.current;
  });

  return (
    <group ref={groupRef} scale={scale}>
      {renderWeapon(type)}
    </group>
  );
}

function renderWeapon(type: WeaponType) {
  if (type === WeaponType.FIST) return null;
  if (WEAPON_GLB_URLS[type]) {
    return <GLBWeaponModel type={type} />;
  }
  switch (type) {
    case WeaponType.STICK:
      return (
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.05, 1.2, 6]} />
            <meshStandardMaterial color={WOOD} roughness={0.9} />
          </mesh>
        </group>
      );
    case WeaponType.BASEBALL_BAT:
      return (
        <group rotation={[0, 0, Math.PI / 2]}>
          {/* Barrel - wider for better readability */}
          <mesh position={[0.3, 0, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.045, 0.5, 8]} />
            <meshStandardMaterial color={WOOD} roughness={0.5} metalness={0.05} />
          </mesh>
          {/* Barrel end ring */}
          <mesh position={[0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.055, 0.008, 6, 12]} />
            <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Handle */}
          <mesh position={[-0.28, 0, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.027, 0.6, 8]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.65} />
          </mesh>
          {/* Grip tape */}
          <mesh position={[-0.42, 0, 0]} castShadow>
            <cylinderGeometry args={[0.028, 0.028, 0.2, 8]} />
            <meshStandardMaterial color="#2a2018" roughness={0.95} />
          </mesh>
          {/* Knob end cap */}
          <mesh position={[-0.59, 0, 0]} castShadow>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
          </mesh>
        </group>
      );
    case WeaponType.AXE:
      return (
        <group>
          <group rotation={[0, 0, Math.PI / 2]}>
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 0.95, 6]} />
              <meshStandardMaterial color={WOOD} roughness={0.85} />
            </mesh>
          </group>
          <mesh position={[0.34, 0.06, 0]} rotation={[0, 0, 0.18]} castShadow>
            <boxGeometry args={[0.34, 0.35, 0.03]} />
            <meshStandardMaterial color={METAL} roughness={0.35} metalness={0.85} />
          </mesh>
        </group>
      );
    case WeaponType.HAMMER:
      return (
        <group>
          <group rotation={[0, 0, Math.PI / 2]}>
            <mesh position={[0.15, 0, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.045, 0.9, 8]} />
              <meshStandardMaterial color={WOOD} roughness={0.85} />
            </mesh>
          </group>
          <mesh position={[0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <boxGeometry args={[0.32, 0.14, 0.14]} />
            <meshStandardMaterial color={METAL_DARK} roughness={0.4} metalness={0.9} />
          </mesh>
          <mesh position={[0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <boxGeometry args={[0.14, 0.3, 0.14]} />
            <meshStandardMaterial color={METAL} roughness={0.4} metalness={0.9} />
          </mesh>
        </group>
      );
    case WeaponType.ROCK:
      return (
        <mesh castShadow>
          <icosahedronGeometry args={[0.22, 1]} />
          <meshStandardMaterial color={ROCK} roughness={0.95} />
        </mesh>
      );
    default:
      return null;
  }
}