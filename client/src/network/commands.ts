import type { Room } from 'colyseus.js';
import { MESSAGE_CLIENT, AttackType, WeaponType } from '@storm-arena/shared';

let activeRoom: Room | null = null;

export function setActiveRoom(room: Room | null) {
  activeRoom = room;
}

export function getActiveRoom(): Room | null {
  return activeRoom;
}

export function sendPlayerMove(
  direction: { x: number; y: number; z: number },
  rotation: { x: number; y: number; z?: number },
  timestamp?: number,
) {
  if (!activeRoom) return;
  const { x, y, z } = direction;
  const mag = Math.sqrt(x * x + y * y + z * z);
  activeRoom.send(MESSAGE_CLIENT.PLAYER_MOVE, {
    direction: mag > 1e-4 ? { x: x / mag, y: y / mag, z: z / mag } : { x: 0, y: 0, z: 0 },
    rotation: { x: rotation.x, y: rotation.y },
    timestamp: timestamp ?? Date.now(),
  });
}

export function sendPlayerAttack(type: AttackType, weapon: WeaponType) {
  if (!activeRoom) return;
  activeRoom.send(MESSAGE_CLIENT.PLAYER_ATTACK, {
    type,
    weapon,
    timestamp: Date.now(),
  });
}

export function sendPlayerDodge(direction: { x: number; y: number; z: number }) {
  if (!activeRoom) return;
  activeRoom.send(MESSAGE_CLIENT.PLAYER_DODGE, {
    direction,
    timestamp: Date.now(),
  });
}

export function sendPlayerBlock(active: boolean) {
  if (!activeRoom) return;
  activeRoom.send(MESSAGE_CLIENT.PLAYER_BLOCK, {
    active,
    timestamp: Date.now(),
  });
}

export function sendPlayerPickup(weaponPickupId: string) {
  if (!activeRoom) return;
  activeRoom.send(MESSAGE_CLIENT.PLAYER_PICKUP, {
    weaponPickupId,
    timestamp: Date.now(),
  });
}

export function sendPlayerThrow(direction: { x: number; y: number; z: number }) {
  if (!activeRoom) return;
  activeRoom.send(MESSAGE_CLIENT.PLAYER_THROW, {
    direction,
    timestamp: Date.now(),
  });
}

export function sendHostStart(difficulty?: string) {
  if (!activeRoom) return;
  activeRoom.send(MESSAGE_CLIENT.HOST_START, { difficulty });
}

export function sendHostChangeDifficulty(difficulty: string) {
  if (!activeRoom) return;
  activeRoom.send(MESSAGE_CLIENT.HOST_CHANGE_DIFFICULTY, { difficulty });
}