import { useMemo, useRef, useEffect } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MeshStandardMaterial, Color } from 'three';
import { AnimationController } from './AnimationController';
import { mapPlayerStateToAnimation, type AnimationKey } from './animations';
import { PlayerColor, WeaponType } from '@storm-arena/shared';
import { PLAYER_COLOR_HEX } from '../../state/GameStore';
import { WeaponMesh } from '../weapons/WeaponMesh';
import { PlaceholderPose } from './pose';

const PLAYER_MODELS: Record<string, string> = {
  [PlayerColor.RED]: '/assets/players/red.glb',
  [PlayerColor.BLUE]: '/assets/players/blue.glb',
  [PlayerColor.GREEN]: '/assets/players/green.glb',
  [PlayerColor.YELLOW]: '/assets/players/yellow.glb',
};

export function preloadPlayerModels() {
  Object.values(PLAYER_MODELS).forEach((url) => {
    useGLTF.preload(url);
  });
}

function getModelUrl(color: PlayerColor): string {
  return PLAYER_MODELS[color] ?? PLAYER_MODELS[PlayerColor.RED];
}

interface PlayerModelProps {
  color: PlayerColor;
  state: string;
  speed: number;
  alive: boolean;
  weapon?: WeaponType;
  weaponSwing?: number;
  poseRef?: React.MutableRefObject<PlaceholderPose>;
  isLocal?: boolean;
}

/**
 * Loads and renders the player GLB model with Mixamo animations.
 * Each player color has its own GLB file.
 * Expects these animation clips in the GLB:
 *   idle, walk, run, jump, fall, dodge, block, block_hit,
 *   punch_light, punch_heavy, hit_light, hit_heavy, knockdown,
 *   getup, death, victory
 */
export function PlayerModel({
  color,
  state,
  speed,
  alive,
  weapon,
  weaponSwing = 0,
  poseRef,
  isLocal = false,
}: PlayerModelProps) {
  const url = getModelUrl(color);
  const gltf = useGLTF(url);
  const rootRef = useRef<Group>(null);

  const animKey = useMemo<AnimationKey>(() => {
    return mapPlayerStateToAnimation(state, speed, alive);
  }, [state, speed, alive]);

  const model = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        const mesh = obj as Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        if (!mesh.geometry.attributes.normal) {
          mesh.geometry.computeVertexNormals();
        }
        const mat = mesh.material as MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          const copy = mat.clone();
          copy.roughness = 0.65;
          copy.metalness = 0.3;
          mesh.material = copy;
        }
      }
    });
    return root;
  }, [gltf]);

  useEffect(() => {
    if (!model) return;
    model.traverse((obj) => {
      const mesh = obj as Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          mat.emissive = new Color(PLAYER_COLOR_HEX[color] ?? '#ffffff');
          mat.emissiveIntensity = 0.12;
        }
      }
    });
  }, [model, color]);

  const animRequest = useMemo(() => {
    return { key: animKey, oneShot: false, speed: 1 };
  }, [animKey]);

  const playerColor = PLAYER_COLOR_HEX[color] ?? '#ffffff';

  const weaponGroupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!weaponGroupRef.current) return;
    const currentAttack = poseRef?.current?.attack ?? weaponSwing ?? 0;
    if (currentAttack > 0) {
      // Swing arc from 0 to 1 back to 0 or follow swing progress
      const swingAngle = Math.sin(currentAttack * Math.PI) * 1.8;
      weaponGroupRef.current.rotation.x = 0.5 - swingAngle;
      weaponGroupRef.current.rotation.y = 0.2 + swingAngle * 0.4;
      weaponGroupRef.current.rotation.z = -0.3 - swingAngle * 0.5;
    } else {
      weaponGroupRef.current.rotation.x += (0.5 - weaponGroupRef.current.rotation.x) * Math.min(1, 15 * delta);
      weaponGroupRef.current.rotation.y += (0.2 - weaponGroupRef.current.rotation.y) * Math.min(1, 15 * delta);
      weaponGroupRef.current.rotation.z += (-0.3 - weaponGroupRef.current.rotation.z) * Math.min(1, 15 * delta);
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, 0]}>
      {/* Contact shadow on ground */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>

      {/* Ground marker ring tinted with player color */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.58, 32]} />
        <meshBasicMaterial
          color={playerColor}
          transparent
          opacity={isLocal ? 0.9 : 0.45}
        />
      </mesh>

      {/* Local player overhead identifier */}
      {isLocal && (
        <group position={[0, 2.35, 0]}>
          <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.07, 0.14, 4]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <Html center position={[0, 0.28, 0]} distanceFactor={14} style={{ pointerEvents: 'none' }}>
            <div
              style={{
                background: 'rgba(5, 8, 15, 0.88)',
                border: `1.5px solid ${playerColor}`,
                color: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '1px 7px',
                borderRadius: '3px',
                letterSpacing: '0.08em',
                boxShadow: `0 0 10px ${playerColor}88`,
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              YOU
            </div>
          </Html>
        </group>
      )}

      {/* Scaled character model lifted so origin [-0.5, 0.5] touches ground at y=0 */}
      <group position={[0, 1.1, 0]} scale={[2.2, 2.2, 2.2]}>
        <primitive object={model} />
        <AnimationController
          gltf={gltf}
          request={animRequest}
          fade={0.15}
        />
        {weapon && weapon !== WeaponType.FIST && (
          <group ref={weaponGroupRef} position={[0.22, 0.42, 0.12]} rotation={[0.5, 0.2, -0.3]}>
            <WeaponMesh type={weapon} swing={weaponSwing} scale={0.4} />
          </group>
        )}
      </group>
    </group>
  );
}
