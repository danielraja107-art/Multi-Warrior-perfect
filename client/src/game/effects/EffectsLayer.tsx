import { useSyncExternalStore } from 'react';
import { HitBurst } from './HitBurst';
import { subscribeBursts, getBursts } from './effectsBus';

/**
 * Renders every active burst from the effects bus.
 * Uses useSyncExternalStore so emitting effects does not re-render the scene.
 */
export function EffectsLayer() {
  const bursts = useSyncExternalStore(subscribeBursts, getBursts, getBursts);

  return (
    <>
      {bursts.map((b) => (
        <HitBurst key={b.id} spec={b} />
      ))}
    </>
  );
}