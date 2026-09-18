import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../state/GameStore';
import { RoomPhase } from '@storm-arena/shared';
import { playSound, setMusicIntensity, stopMusic } from '../audio/AudioManager';
import { emitBurst } from '../effects/effectsBus';
import { triggerScreenShake } from '../effects/screenShakeBus';
import { triggerBossCinematic } from '../camera/bus';

/** Duration of the rest period between waves in milliseconds. */
const REST_DURATION_MS = 4000;
/** How long after wave-complete to start spawning beacon flicker. */
const SPAWN_BEACON_INTERVAL_MS = 1200;

/**
 * Listens to match/wave state and drives world-side presentation:
 * music intensity, wave start/complete effects, boss entrance cinematic,
 * rest-period ambient glow, spawn timing beacons, and weapon respawn pulses.
 * The formal HUD belongs to Member 3.
 */
export function WaveDirector() {
  const phase = useGameStore((s) => s.phase);
  const currentWave = useGameStore((s) => s.currentWave);
  const enemiesRemaining = useGameStore((s) => s.enemiesRemaining);
  const boss = useGameStore((s) => s.boss);
  const weaponPickups = useGameStore((s) => s.weaponPickups);

  const lastWave = useRef(0);
  const lastBossActive = useRef(false);
  const lastBossPhase = useRef<string | null>(null);
  const prevEnemies = useRef(0);

  // Rest-period state
  const [inRest, setInRest] = useState(false);
  const restUntil = useRef(0);
  const restGlowTimer = useRef(0);

  // Spawn beacon ticker
  const spawnBeaconTimer = useRef(0);

  // Weapon respawn tracking — emit a pulse when a pickup becomes available
  const prevPickupAvail = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (phase === RoomPhase.GAME) {
      if (currentWave !== lastWave.current && currentWave > 0) {
        lastWave.current = currentWave;
        setInRest(false);
        playSound('wave_start');
        if (currentWave >= 4) triggerScreenShake(0.6);
      }
      setMusicIntensity(currentWave >= 5 ? 2.5 : currentWave >= 4 ? 2 : currentWave >= 2 ? 1 : 0.5);
    } else if (phase === RoomPhase.VICTORY) {
      playSound('victory');
      stopMusic();
      setInRest(false);
    } else {
      stopMusic();
      setInRest(false);
    }
  }, [phase, currentWave]);

  useEffect(() => {
    if (boss?.isActive) {
      if (!lastBossActive.current) {
        lastBossActive.current = true;
        setInRest(false);
        playSound('boss_entrance');
        triggerBossCinematic(boss.position.x, boss.position.y || 1.5, boss.position.z, 1500);
      }
      if (boss.phase !== lastBossPhase.current && lastBossPhase.current != null) {
        if (boss.phase === 'enraged') {
          playSound('boss_enraged');
          triggerScreenShake(1.2);
        } else {
          playSound('boss_phase_change');
          triggerScreenShake(0.8);
        }
      }
      lastBossPhase.current = boss.phase;
    } else {
      if (lastBossActive.current && boss?.isActive === false) {
        playSound('boss_death');
        triggerScreenShake(1.4);
        emitBurst('boss_phase', [boss?.position.x ?? 0, 1, boss?.position.z ?? 0], {
          color: '#ff9a3d',
          count: 40,
          power: 2,
        });
      }
      lastBossActive.current = false;
    }
  }, [boss]);

  useEffect(() => {
    if (enemiesRemaining === 0 && prevEnemies.current > 0 && phase === RoomPhase.GAME) {
      playSound('wave_complete');
      // Begin rest period
      restUntil.current = performance.now() + REST_DURATION_MS;
      setInRest(true);
      // Wave complete burst at arena center
      emitBurst('spark', [0, 0.5, 0], { color: '#8fd1ff', count: 20, power: 1.2 });
    }
    if (prevEnemies.current !== enemiesRemaining) {
      prevEnemies.current = enemiesRemaining;
    }
  }, [enemiesRemaining, phase]);

  // Monitor weapon pickups becoming available again → weapon respawn pulse
  useEffect(() => {
    const pickups = Object.values(weaponPickups);
    pickups.forEach((p) => {
      const wasAvail = prevPickupAvail.current[p.id];
      if (wasAvail === false && p.isAvailable) {
        // Weapon just respawned — emit a golden pulse
        emitBurst('weapon_respawn', [p.position.x, p.position.y + 0.2, p.position.z], {
          color: '#ffdd44',
          count: 12,
          power: 0.8,
        });
      }
      prevPickupAvail.current[p.id] = p.isAvailable;
    });
  }, [weaponPickups]);

  useFrame((_, delta) => {
    const now = performance.now();

    // End rest period
    if (inRest && now > restUntil.current) {
      setInRest(false);
    }

    // Rest period ambient glow pulses
    if (inRest) {
      restGlowTimer.current += delta;
      if (restGlowTimer.current > 1.2) {
        restGlowTimer.current = 0;
        emitBurst('rest_glow', [0, 0.15, 0], { color: '#4a8aff', count: 6, power: 0.3 });
      }
    }

    // Spawn beacon flicker in the moments before a new wave starts
    if (
      phase === RoomPhase.GAME &&
      enemiesRemaining === 0 &&
      !inRest &&
      !boss?.isActive
    ) {
      spawnBeaconTimer.current += delta * 1000;
      if (spawnBeaconTimer.current > SPAWN_BEACON_INTERVAL_MS) {
        spawnBeaconTimer.current = 0;
        // Spawn beacons at the four arena spawn corners
        const corners: [number, number, number][] = [
          [16, 0.2, 16],
          [-16, 0.2, 16],
          [16, 0.2, -16],
          [-16, 0.2, -16],
        ];
        const pick = corners[Math.floor(Math.random() * corners.length)];
        emitBurst('spawn_beacon', pick, { color: '#42d0ff', count: 5, power: 0.5 });
      }
    } else {
      spawnBeaconTimer.current = 0;
    }
  });

  return null;
}
