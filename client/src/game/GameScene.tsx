import { memo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { LocalPlayer } from './players/LocalPlayer';
import { RemotePlayer } from './players/RemotePlayer';
import { GroupCamera } from './camera/GroupCamera';
import { Arena } from './scene/Arena';
import { WaveDirector } from './scene/WaveDirector';
import { EnemyLayer } from './enemies/Enemy';
import { BossLayer } from './bosses/VillainBoss';
import { BossEnvironment } from './bosses/BossEnvironment';
import { WeaponPickupLayer } from './weapons/WeaponPickup';
import { EffectsLayer } from './effects/EffectsLayer';
import { ScreenShake } from './effects/ScreenShake';
import { FPSMonitorBridge } from './debug/FPSMonitor';
import { PerformanceMonitor } from '../debug/PerformanceMonitor';
import { useGameStore, type ClientPlayerState } from '../state/GameStore';
import { initInput, clearInput } from './Input';

const RemotePlayers = memo(function RemotePlayers() {
  const remoteSessionIds = useGameStore(
    useShallow((s) => {
      const localId = s.localSessionId;
      return Object.keys(s.players).filter((id) => id !== localId);
    }),
  );
  const players = useGameStore((s) => s.players);

  return (
    <>
      {remoteSessionIds.map((id) => {
        const p = players[id];
        return p ? <RemotePlayer key={id} player={p} /> : null;
      })}
    </>
  );
});

function GameSceneContent() {
  const localSessionId = useGameStore((s) => s.localSessionId);
  const localPlayer = useGameStore((s) => {
    if (!s.localSessionId) return null;
    return s.players[s.localSessionId] ?? null;
  });

  return (
    <>
      <color attach="background" args={['#060a12']} />
      <fog attach="fog" args={['#0c1420', 50, 110]} />

      {/* Ambient fill - slightly brighter for character readability */}
      <ambientLight intensity={0.45} color="#8fa8d8" />

      {/* Hemisphere light - sky/ground bounce */}
      <hemisphereLight args={['#506080', '#0c0e12', 0.6]} />

      {/* Main directional key light - from upper-right for clear shadows */}
      <directionalLight
        position={[12, 28, 8]}
        intensity={1.8}
        color="#c0d0ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0008}
      />

      {/* Rim/back light for character silhouette separation */}
      <directionalLight
        position={[-10, 18, -12]}
        intensity={0.8}
        color="#6080c0"
      />

      {/* Spot light - centered arena pool for dramatic top-down highlight */}
      <spotLight position={[0, 24, 0]} angle={0.55} penumbra={0.6} intensity={180} color="#5f9bff" />

      {/* Subtle fill from front-below for enemy face visibility */}
      <pointLight position={[0, 2, 8]} intensity={15} color="#3a4a6a" distance={20} />

      <Arena />

      <PhysicsWorld>
        {localPlayer && (
          <LocalPlayer
            sessionId={localPlayer.sessionId}
            color={localPlayer.color}
            initialPosition={localPlayer.position}
          />
        )}
      </PhysicsWorld>

      <RemotePlayers />

      <EnemyLayer />
      <BossLayer />
      <BossEnvironment />
      <WeaponPickupLayer />

      <EffectsLayer />
      <ScreenShake />

      <GroupCamera />
      <WaveDirector />
      <FPSMonitorBridge />
      <PerformanceMonitor />
    </>
  );
}

export function GameScene() {
  useEffect(() => {
    initInput();
    return () => {
      clearInput();
    };
  }, []);

  return (
    <div id="game-canvas-container" className="absolute inset-0 w-full h-full z-0 overflow-hidden">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.1, far: 400, position: [0, 16, 24] }}
      >
        <GameSceneContent />
      </Canvas>
    </div>
  );
}
