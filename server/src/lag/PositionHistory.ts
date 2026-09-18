export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PositionSnapshot {
  position: Vec3;
  timestamp: number;
}

const MAX_HISTORY_TICKS = 20;
const TICK_INTERVAL_MS = 50;

export class PositionHistory {
  private history: Map<string, PositionSnapshot[]> = new Map();

  record(entityId: string, position: Vec3, timestamp: number): void {
    const snapshots = this.history.get(entityId) ?? [];
    snapshots.push({ position: { ...position }, timestamp });
    if (snapshots.length > MAX_HISTORY_TICKS) {
      snapshots.shift();
    }
    this.history.set(entityId, snapshots);
  }

  getSnapshotAt(entityId: string, targetTimestamp: number): PositionSnapshot | null {
    const snapshots = this.history.get(entityId);
    if (!snapshots || snapshots.length === 0) return null;

    let best: PositionSnapshot | null = null;
    let bestDiff = Infinity;

    for (const snap of snapshots) {
      const diff = targetTimestamp - snap.timestamp;
      if (diff >= 0 && diff < bestDiff) {
        bestDiff = diff;
        best = snap;
      }
    }

    return best ?? snapshots[snapshots.length - 1];
  }

  clear(entityId: string): void {
    this.history.delete(entityId);
  }

  clearAll(): void {
    this.history.clear();
  }

  getHistory(entityId: string): ReadonlyArray<PositionSnapshot> {
    return this.history.get(entityId) ?? [];
  }
}