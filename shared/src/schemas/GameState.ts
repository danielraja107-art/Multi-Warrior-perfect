import { Schema, type, MapSchema } from '@colyseus/schema';
import {
  PlayerState,
  EnemyState,
  BossPhase,
  BossAttack,
  RoomPhase,
  Difficulty,
  PlayerColor,
  WeaponType,
  EnemyType,
} from '../types/index';

export class Vector3 extends Schema {
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') z: number = 0;
}

export class Player extends Schema {
  @type('string') id: string = '';
  @type('string') sessionId: string = '';
  @type('string') userId: string = '';
  @type('string') color: string = PlayerColor.RED;
  @type(Vector3) position: Vector3 = new Vector3();
  @type(Vector3) rotation: Vector3 = new Vector3();
  @type('string') state: string = PlayerState.IDLE;
  @type('number') health: number = 100;
  @type('number') maxHealth: number = 100;
  @type('string') weapon: string = WeaponType.FIST;
  @type('boolean') isHost: boolean = false;
  @type('boolean') isAlive: boolean = true;
  @type('boolean') powerAvailable: boolean = true;
}

export class Enemy extends Schema {
  @type('string') id: string = '';
  @type('string') type: string = EnemyType.BASIC;
  @type(Vector3) position: Vector3 = new Vector3();
  @type(Vector3) rotation: Vector3 = new Vector3();
  @type('string') state: string = EnemyState.IDLE;
  @type('number') health: number = 50;
  @type('number') maxHealth: number = 50;
  @type('string') targetPlayerId: string = '';
}

export class Boss extends Schema {
  @type('string') id: string = '';
  @type(Vector3) position: Vector3 = new Vector3();
  @type(Vector3) rotation: Vector3 = new Vector3();
  @type('number') health: number = 500;
  @type('number') maxHealth: number = 500;
  @type('string') phase: string = BossPhase.PHASE_1;
  @type('string') currentAttack: string = '';
  @type('boolean') isEnraged: boolean = false;
  @type('boolean') isActive: boolean = false;
}

export class WeaponPickup extends Schema {
  @type('string') id: string = '';
  @type('string') type: string = WeaponType.STICK;
  @type(Vector3) position: Vector3 = new Vector3();
  @type('boolean') isAvailable: boolean = true;
}

export class GameState extends Schema {
  @type('string') phase: string = RoomPhase.LOBBY;
  @type('number') countdownSeconds: number = 0;
  @type({ map: Player }) players: MapSchema<Player> = new MapSchema<Player>();
  @type({ map: Enemy }) enemies: MapSchema<Enemy> = new MapSchema<Enemy>();
  @type(Boss) boss: Boss = new Boss();
  @type({ map: WeaponPickup }) weaponPickups: MapSchema<WeaponPickup> = new MapSchema<WeaponPickup>();
  @type('number') currentWave: number = 0;
  @type('number') maxWaves: number = 5;
  @type('number') enemiesRemaining: number = 0;
  @type('string') difficulty: string = Difficulty.NORMAL;
  @type('string') roomCode: string = '';
  @type('string') hostId: string = '';
  @type('number') elapsedTime: number = 0;
}