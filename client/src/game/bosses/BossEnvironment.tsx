import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { DirectionalLight, SpotLight, Color } from 'three';
import { useGameStore } from '../../state/GameStore';
import { BossPhase } from '@storm-arena/shared';
import { emitBurst } from '../effects/effectsBus';
import { triggerScreenShake } from '../effects/screenShakeBus';

/**
 * Phase-driven environment reactions for the Boss fight.
 *
 * Phase 1  → normal storm (base lighting)
 * Phase 2  → lights flicker and partially break (amber tint, lower intensity)
 * Phase 3  → stronger rain/lightning (deep red tint, intense shadows)
 * Enraged  → edge lightning hazards (rapid flash, high saturation red)
 * Death    → storm clears + dramatic silence (desaturated cool blue)
 *
 * Server remains the authority for phase changes.
 * This component only drives visual/audio presentation.
 */
export function BossEnvironment() {
  const boss = useGameStore((s) => s.boss);

  const dirLightRef = useRef<DirectionalLight>(null);
  const spotLightRef = useRef<SpotLight>(null);

  const currentPhase = useRef<string | null>(null);
  const flickerTimer = useRef(0);
  const flickerActive = useRef(false);
  const enragedLightningTimer = useRef(0);
  const deathDramaTimer = useRef(0);
  const isDead = useRef(false);

  // Target lighting values per phase
  const phaseTargets = {
    none:       { dirColor: '#b8c8ff', dirIntensity: 1.5, spotColor: '#5f9bff', spotIntensity: 160 },
    phase_1:    { dirColor: '#b8c8ff', dirIntensity: 1.5, spotColor: '#5f9bff', spotIntensity: 160 },
    phase_2:    { dirColor: '#d0a060', dirIntensity: 1.1, spotColor: '#e08040', spotIntensity: 90 },
    phase_3:    { dirColor: '#c85050', dirIntensity: 0.9, spotColor: '#cc3030', spotIntensity: 70 },
    enraged:    { dirColor: '#ff3020', dirIntensity: 1.4, spotColor: '#ff2010', spotIntensity: 200 },
    death:      { dirColor: '#a0b8d8', dirIntensity: 0.4, spotColor: '#80a8c8', spotIntensity: 40 },
  };

  const lerpedDirIntensity = useRef(1.5);
  const lerpedSpotIntensity = useRef(160);
  const lerpedDirColor = useRef(new Color('#b8c8ff'));
  const lerpedSpotColor = useRef(new Color('#5f9bff'));

  useEffect(() => {
    if (!boss) return;

    const phase = boss.phase as string;
    if (phase === currentPhase.current) return;
    currentPhase.current = phase;

    switch (phase) {
      case BossPhase.PHASE_2:
        flickerActive.current = true;
        break;
      case BossPhase.PHASE_3:
        flickerActive.current = false;
        // Big lightning flash on phase 3 transition
        emitBurst('lightning_flash', [0, 6, 0], { color: '#ffddcc', count: 3, power: 3 });
        triggerScreenShake(0.9);
        break;
      case BossPhase.ENRAGED:
        flickerActive.current = false;
        emitBurst('lightning_flash', [0, 6, 0], { color: '#ff8040', count: 5, power: 4 });
        triggerScreenShake(1.3);
        break;
      default:
        flickerActive.current = false;
    }
  }, [boss]);

  useEffect(() => {
    if (boss && !boss.isActive && boss.health <= 0 && !isDead.current) {
      isDead.current = true;
      flickerActive.current = false;
      currentPhase.current = 'death';
      deathDramaTimer.current = 0;
      // Storm-clearing burst
      emitBurst('lightning_flash', [0, 8, 0], { color: '#c8e0ff', count: 2, power: 1.5 });
    } else if (boss?.isActive) {
      isDead.current = false;
    }
  }, [boss]);

  useFrame((_, delta) => {
    const dirLight = dirLightRef.current;
    const spotLight = spotLightRef.current;

    const bossState = useGameStore.getState().boss;
    const phase = isDead.current ? 'death'
      : bossState?.isEnraged ? 'enraged'
      : (bossState?.phase as string) ?? 'none';

    const target = phaseTargets[phase as keyof typeof phaseTargets] ?? phaseTargets.none;

    // Smooth interpolation toward target values
    const speed = isDead.current ? 0.5 : 1.5;
    lerpedDirIntensity.current += (target.dirIntensity - lerpedDirIntensity.current) * Math.min(1, speed * delta);
    lerpedSpotIntensity.current += (target.spotIntensity - lerpedSpotIntensity.current) * Math.min(1, speed * delta);
    lerpedDirColor.current.lerp(new Color(target.dirColor), Math.min(1, speed * delta));
    lerpedSpotColor.current.lerp(new Color(target.spotColor), Math.min(1, speed * delta));

    // Phase 2 flicker
    if (flickerActive.current) {
      flickerTimer.current += delta;
      if (flickerTimer.current > 0.12 + Math.random() * 0.18) {
        flickerTimer.current = 0;
        const flicker = 0.6 + Math.random() * 0.6;
        if (dirLight) dirLight.intensity = lerpedDirIntensity.current * flicker;
        if (spotLight) spotLight.intensity = lerpedSpotIntensity.current * flicker;
        return;
      }
    }

    // Enraged edge lightning hazards
    if (phase === 'enraged' && bossState?.isActive) {
      enragedLightningTimer.current += delta;
      if (enragedLightningTimer.current > 0.35 + Math.random() * 0.25) {
        enragedLightningTimer.current = 0;
        const edgeX = (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 4);
        const edgeZ = (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 4);
        emitBurst('lightning_flash', [edgeX, 0.2, edgeZ], { color: '#ff5030', count: 4, power: 1.2 });
      }
    }

    // Death drama — slowly restore light
    if (isDead.current) {
      deathDramaTimer.current += delta;
    }

    if (dirLight) {
      dirLight.intensity = lerpedDirIntensity.current;
      dirLight.color.copy(lerpedDirColor.current);
    }
    if (spotLight) {
      spotLight.intensity = lerpedSpotIntensity.current;
      spotLight.color.copy(lerpedSpotColor.current);
    }
  });

  // Only render when boss is active or recently died
  if (!boss) return null;

  return (
    <>
      <directionalLight
        ref={dirLightRef}
        position={[14, 26, 10]}
        intensity={1.5}
        color="#b8c8ff"
        castShadow={false}
      />
      <spotLight
        ref={spotLightRef}
        position={[0, 22, 0]}
        angle={0.6}
        penumbra={0.5}
        intensity={160}
        color="#5f9bff"
      />
    </>
  );
}
