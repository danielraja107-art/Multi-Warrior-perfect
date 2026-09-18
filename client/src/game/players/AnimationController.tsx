import { useEffect, useRef } from 'react';
import { useAnimations } from '@react-three/drei';
import { AnimationAction, type AnimationClip, type Object3D } from 'three';
import type { PlaybackRequest } from './animations';

interface AnimationControllerProps {
  /** GLTF containing a Mixamo-standard skeleton with named clips. */
  gltf: { animations: AnimationClip[]; scene: Object3D };
  /** Name of the animated root object (optional). */
  rootName?: string;
  request: PlaybackRequest;
  /** Hard fade duration (seconds) for crossfades. */
  fade?: number;
  /** Fixed playback rate override (e.g. 1.6 for boss enrage). */
  rateOverride?: number;
}

/**
 * Reusable animation controller for characters with named clips.
 * Maintains a single prioritized action and crossfades transitions.
 * Works with any GLB that conforms to the project's animation naming.
 */
export function AnimationController({
  gltf,
  rootName,
  request,
  fade = 0.15,
  rateOverride,
}: AnimationControllerProps) {
  const actions = useAnimations(gltf.animations, rootName ? gltf.scene.getObjectByName(rootName) ?? undefined : undefined);
  const currentRef = useRef<AnimationAction | null>(null);
  const oneShotGuard = useRef(false);

  useEffect(() => {
    const map = actions.actions;
    const key = request.key;
    if (!key) return;

    const next = map[key as string] ?? undefined;
    if (!next) {
      if (currentRef.current) {
        currentRef.current.fadeOut(fade);
        currentRef.current = null;
      }
      return;
    }

    const rate = rateOverride ?? request.speed ?? 1;
    next.timeScale = rate;

    if (request.oneShot) {
      oneShotGuard.current = true;
      next.reset().fadeIn(fade).play();
      const current = currentRef.current;
      next.enabled = true;
      next.clampWhenFinished = true;
      const onFinished = () => {
        if (current) {
          current.reset().fadeIn(fade).play();
        }
        currentRef.current = current;
        oneShotGuard.current = false;
      };
      (next as unknown as { _oneShotCallback?: () => void })._oneShotCallback = onFinished;
      return;
    }

    if (currentRef.current !== next) {
      if (currentRef.current) {
        currentRef.current.fadeOut(fade);
      }
      next.reset().fadeIn(fade).play();
      currentRef.current = next;
    }
  }, [request.key, request.oneShot, request.speed, rateOverride, fade, actions.actions]);

  return null;
}