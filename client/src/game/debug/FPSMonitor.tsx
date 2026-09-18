import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

/** How many frames to average over. */
const SAMPLE_WINDOW = 60;
/** Show the overlay when ?debug=1 is in the URL. */
const DEBUG_ENABLED =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('debug') === '1';

interface Stats {
  fps: number;
  ms: number;
  min: number;
  max: number;
}

/**
 * R3F component — must be placed inside <Canvas>.
 * Tracks FPS and frame time (ms) using useFrame.
 * Only active when ?debug=1 is present in the URL.
 */
export function FPSMonitor() {
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const [stats, setStats] = useState<Stats>({ fps: 0, ms: 0, min: 0, max: 0 });
  const updateTimer = useRef(0);

  useFrame(() => {
    if (!DEBUG_ENABLED) return;
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    frameTimesRef.current.push(delta);
    if (frameTimesRef.current.length > SAMPLE_WINDOW) {
      frameTimesRef.current.shift();
    }

    updateTimer.current += delta;
    if (updateTimer.current >= 500) {
      updateTimer.current = 0;
      const times = frameTimesRef.current;
      if (times.length === 0) return;
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      setStats({
        fps: Math.round(1000 / avg),
        ms: Math.round(avg * 10) / 10,
        min: Math.round(min * 10) / 10,
        max: Math.round(max * 10) / 10,
      });
    }
  });

  if (!DEBUG_ENABLED) return null;

  const color = stats.fps >= 50 ? '#6cd66c' : stats.fps >= 30 ? '#ffbb44' : '#e55';

  return null; // Data passed to overlay via state; overlay is rendered outside Canvas
}

/**
 * DOM overlay — rendered outside <Canvas> in App.tsx.
 * Reads from a shared singleton updated by FPSMonitorBridge.
 */
let _setStats: ((s: Stats) => void) | null = null;
export function pushFPSStats(s: Stats) {
  _setStats?.(s);
}

export function FPSOverlay() {
  const [stats, setStats] = useState<Stats>({ fps: 0, ms: 0, min: 0, max: 0 });

  useEffect(() => {
    _setStats = setStats;
    return () => {
      _setStats = null;
    };
  }, []);

  if (!DEBUG_ENABLED) return null;

  const color = stats.fps >= 50 ? '#6cd66c' : stats.fps >= 30 ? '#ffbb44' : '#e55';

  return (
    <div style={styles.overlay}>
      <div style={{ color, fontSize: 15, fontWeight: 'bold' }}>{stats.fps} FPS</div>
      <div style={styles.row}>
        <span style={styles.label}>Avg</span>
        <span style={styles.val}>{stats.ms}ms</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Min</span>
        <span style={{ ...styles.val, color: '#6cd66c' }}>{stats.min}ms</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Max</span>
        <span style={{ ...styles.val, color: stats.max > 33 ? '#e55' : '#cfe0f2' }}>{stats.max}ms</span>
      </div>
    </div>
  );
}

/**
 * R3F component that bridges frame timing data to the DOM overlay.
 * Place inside <Canvas>.
 */
export function FPSMonitorBridge() {
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const updateTimer = useRef(0);

  useFrame(() => {
    if (!DEBUG_ENABLED) return;
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    frameTimesRef.current.push(delta);
    if (frameTimesRef.current.length > SAMPLE_WINDOW) {
      frameTimesRef.current.shift();
    }

    updateTimer.current += delta;
    if (updateTimer.current >= 500) {
      updateTimer.current = 0;
      const times = frameTimesRef.current;
      if (times.length === 0) return;
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      pushFPSStats({
        fps: Math.round(1000 / avg),
        ms: Math.round(avg * 10) / 10,
        min: Math.round(min * 10) / 10,
        max: Math.round(max * 10) / 10,
      });
    }
  });

  return null;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 12,
    right: 12,
    background: 'rgba(4,8,16,0.88)',
    border: '1px solid #233247',
    borderRadius: 6,
    padding: '6px 12px',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#cfe0f2',
    zIndex: 100,
    minWidth: 90,
    pointerEvents: 'none',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  label: { color: '#6a7a8a' },
  val: { color: '#cfe0f2' },
};
