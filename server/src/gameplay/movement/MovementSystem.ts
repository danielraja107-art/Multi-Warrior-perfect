export const PLAYER_SPEED = 5.0;
export const MOVEMENT_BOUNDARY = 20;
export const TICK_INTERVAL_MS = 50;
export const MAX_STORED_INPUTS_PER_PLAYER = 64;

export interface MovementInput {
  direction: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z?: number };
  timestamp: number;
}

export interface Rotation {
  x: number;
  y: number;
  z: number;
}

export interface MovementUpdate {
  velocity: { x: number; y: number; z: number };
  rotation: Rotation | null;
  hasInput: boolean;
}

export class MovementSystem {
  private inputQueues: Map<string, MovementInput[]> = new Map();
  private velocities: Map<string, { x: number; y: number; z: number }> = new Map();
  private rotations: Map<string, Rotation> = new Map();
  private lastTimestamp: Map<string, number> = new Map();

  enqueueInput(sessionId: string, input: MovementInput): boolean {
    const isStop =
      Math.abs(input.direction.x) < 1e-4 &&
      Math.abs(input.direction.y) < 1e-4 &&
      Math.abs(input.direction.z) < 1e-4;

    const lastTs = this.lastTimestamp.get(sessionId);
    // Never reject stop commands based on timestamp.
    // For movement inputs, only reject if strictly older (out of order).
    if (!isStop && lastTs !== undefined && input.timestamp < lastTs) {
      return false;
    }
    this.lastTimestamp.set(sessionId, input.timestamp);

    // If stop command, immediately zero velocity and flush queue so no
    // pending movement ticks can continue advancing player position
    if (isStop) {
      this.velocities.set(sessionId, { x: 0, y: 0, z: 0 });
      this.inputQueues.delete(sessionId);
      if (input.rotation) {
        this.rotations.set(sessionId, {
          x: input.rotation.x,
          y: input.rotation.y,
          z: input.rotation.z ?? 0,
        });
      }
      return true;
    }

    const queue = this.inputQueues.get(sessionId) ?? [];
    queue.push(input);
    if (queue.length > MAX_STORED_INPUTS_PER_PLAYER) {
      queue.shift();
    }
    this.inputQueues.set(sessionId, queue);
    return true;
  }

  private drainQueue(sessionId: string): MovementInput[] {
    const queue = this.inputQueues.get(sessionId) ?? [];
    this.inputQueues.delete(sessionId);
    return queue;
  }

  update(sessionId: string, deltaTimeMs: number): MovementUpdate {
    const inputs = this.drainQueue(sessionId);

    if (inputs.length > 0) {
      const last = inputs[inputs.length - 1];
      this.velocities.set(sessionId, { ...last.direction });
      if (last.rotation) {
        this.rotations.set(sessionId, { ...last.rotation, z: last.rotation.z ?? 0 });
      }
    }

    const velocity = this.velocities.get(sessionId) ?? { x: 0, y: 0, z: 0 };
    const rotation = this.rotations.get(sessionId) ?? null;
    const hasInput =
      Math.abs(velocity.x) > 0.01 || Math.abs(velocity.y) > 0.01 || Math.abs(velocity.z) > 0.01;

    return { velocity, rotation, hasInput };
  }

  clear(sessionId: string) {
    this.inputQueues.delete(sessionId);
    this.velocities.delete(sessionId);
    this.rotations.delete(sessionId);
    this.lastTimestamp.delete(sessionId);
  }

  clearAll() {
    this.inputQueues.clear();
    this.velocities.clear();
    this.rotations.clear();
    this.lastTimestamp.clear();
  }
}
