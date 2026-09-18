import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

let globalMetrics: PerformanceMetrics = {
  fps: 0,
  frameTime: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
};

let listeners: Array<(m: PerformanceMetrics) => void> = [];

export function getPerformanceMetrics(): PerformanceMetrics {
  return globalMetrics;
}

export function subscribePerformance(cb: (m: PerformanceMetrics) => void): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function PerformanceMonitor() {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const { gl } = useThree();

  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    const elapsed = now - lastTime.current;

    if (elapsed >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / elapsed);
      const frameTime = Math.round(elapsed / frameCount.current);

      const info = gl.info;

      const metrics: PerformanceMetrics = {
        fps,
        frameTime,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      };

      globalMetrics = metrics;

      for (const cb of listeners) {
        cb(metrics);
      }

      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return null;
}

export function usePerformanceMetrics(): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(globalMetrics);

  useEffect(() => {
    return subscribePerformance(setMetrics);
  }, []);

  return metrics;
}
