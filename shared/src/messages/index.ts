import { AttackType, WeaponType } from '../types/index';

export const MESSAGE_CLIENT = {
  PLAYER_MOVE: 'PLAYER_MOVE',
  PLAYER_ATTACK: 'PLAYER_ATTACK',
  PLAYER_DODGE: 'PLAYER_DODGE',
  PLAYER_BLOCK: 'PLAYER_BLOCK',
  PLAYER_PICKUP: 'PLAYER_PICKUP',
  PLAYER_THROW: 'PLAYER_THROW',
  HOST_START: 'HOST_START',
  HOST_CHANGE_DIFFICULTY: 'HOST_CHANGE_DIFFICULTY',
} as const;

export const MESSAGE_SERVER = {
  STATE_UPDATE: 'STATE_UPDATE',
  GAME_EVENT: 'GAME_EVENT',
  MATCH_RESULT: 'MATCH_RESULT',
  ERROR: 'ERROR',
} as const;

export type ClientMessageType = (typeof MESSAGE_CLIENT)[keyof typeof MESSAGE_CLIENT];
export type ServerMessageType = (typeof MESSAGE_SERVER)[keyof typeof MESSAGE_SERVER];

export interface PlayerMovePayload {
  direction: { x: number; y: number; z: number };
  timestamp: number;
}

export interface PlayerAttackPayload {
  type: AttackType;
  weapon: WeaponType;
  timestamp: number;
}

export interface PlayerDodgePayload {
  direction: { x: number; y: number; z: number };
  timestamp: number;
}

export interface PlayerBlockPayload {
  active: boolean;
  timestamp: number;
}

export interface PlayerPickupPayload {
  weaponPickupId: string;
  timestamp: number;
}

export interface PlayerThrowPayload {
  direction: { x: number; y: number; z: number };
  timestamp: number;
}

export interface HostStartPayload {
  difficulty?: string;
}

export interface HostChangeDifficultyPayload {
  difficulty: string;
}

export interface ServerErrorPayload {
  code: string;
  message: string;
}

export interface MatchResultPayload {
  matchId: string;
  stats: Record<string, unknown>;
}

export interface GameEventPayload {
  event: string;
  data: Record<string, unknown>;
}

export type ClientMessagePayloads = {
  [MESSAGE_CLIENT.PLAYER_MOVE]: PlayerMovePayload;
  [MESSAGE_CLIENT.PLAYER_ATTACK]: PlayerAttackPayload;
  [MESSAGE_CLIENT.PLAYER_DODGE]: PlayerDodgePayload;
  [MESSAGE_CLIENT.PLAYER_BLOCK]: PlayerBlockPayload;
  [MESSAGE_CLIENT.PLAYER_PICKUP]: PlayerPickupPayload;
  [MESSAGE_CLIENT.PLAYER_THROW]: PlayerThrowPayload;
  [MESSAGE_CLIENT.HOST_START]: HostStartPayload;
  [MESSAGE_CLIENT.HOST_CHANGE_DIFFICULTY]: HostChangeDifficultyPayload;
};

export type ServerMessagePayloads = {
  [MESSAGE_SERVER.STATE_UPDATE]: Record<string, unknown>;
  [MESSAGE_SERVER.GAME_EVENT]: GameEventPayload;
  [MESSAGE_SERVER.MATCH_RESULT]: MatchResultPayload;
  [MESSAGE_SERVER.ERROR]: ServerErrorPayload;
};