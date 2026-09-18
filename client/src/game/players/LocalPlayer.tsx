import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Quaternion, Euler, type Group } from 'three';
import { WeaponType, AttackType } from '@storm-arena/shared';
import { input, endInputFrame, onMoveStop } from '../Input';
import { useGameStore } from '../../state/GameStore';
import { sendPlayerMove, sendPlayerAttack, sendPlayerPickup } from '../../network/commands';
import { setLiveTransform, clearLiveTransform } from './registry';
import { PlaceholderPlayer } from './PlaceholderPlayer';
import { defaultPose } from './pose';

const SEND_INTERVAL_MS = 50;

const _targetPos = new Vector3();
const _targetQuat = new Quaternion();
const _euler = new Euler();

interface LocalPlayerProps {
  sessionId: string;
  color: string;
  initialPosition?: { x: number; y: number; z: number };
}

export function LocalPlayer({ sessionId, color, initialPosition }: LocalPlayerProps) {
  const groupRef = useRef<Group>(null);
  const currentPos = useRef(
    new Vector3(initialPosition?.x ?? 0, 0, initialPosition?.z ?? 0),
  );
  const currentQuat = useRef(new Quaternion());
  const lastSentDirection = useRef({ x: 0, y: 0, z: 0 });
  const lastSendTime = useRef(0);
  const lastYaw = useRef(0);
  const pose = useRef(defaultPose()).current;
  const attackCooldownTimer = useRef(0);
  const attackSwingProgress = useRef(0);

  useEffect(() => {
    return onMoveStop(() => {
      const wasMoving =
        Math.abs(lastSentDirection.current.x) > 0.001 ||
        Math.abs(lastSentDirection.current.z) > 0.001;
      if (wasMoving) {
        const now = Date.now();
        lastSendTime.current = now;
        lastSentDirection.current = { x: 0, y: 0, z: 0 };
        sendPlayerMove({ x: 0, y: 0, z: 0 }, { x: 0, y: lastYaw.current }, now);
      }
    });
  }, []);

  useFrame((_, delta) => {
    try {
      const store = useGameStore.getState();

      if (store.phase !== 'game') {
        pose.speed = 0;
        pose.idle = true;
        const group = groupRef.current;
        if (group) {
          group.position.copy(currentPos.current);
        }
        setLiveTransform(sessionId, currentPos.current.clone(), currentQuat.current.clone());
        return;
      }

      const player = store.players[sessionId];
      if (!player) return;

      // -----------------------------------------------------------------------
      // 1. Read keyboard WASD input
      //    W (moveY = +1) -> move in -Z (forward)
      //    S (moveY = -1) -> move in +Z (backward)
      //    A (moveX = -1) -> move in -X (left)
      //    D (moveX = +1) -> move in +X (right)
      // -----------------------------------------------------------------------
      const moveX = input.moveX;
      const moveZ = -input.moveY;
      const mag = Math.hypot(moveX, moveZ);
      let dirX = 0;
      let dirZ = 0;
      if (mag > 0.001) {
        dirX = moveX / mag;
        dirZ = moveZ / mag;
      }
      const isMoving = Math.abs(dirX) > 0.001 || Math.abs(dirZ) > 0.001;

      if (isMoving) {
        lastYaw.current = Math.atan2(dirX, dirZ);
      }

      // -----------------------------------------------------------------------
      // 2. Dispatch movement commands to server
      // -----------------------------------------------------------------------
      const now = Date.now();
      const wasMoving =
        Math.abs(lastSentDirection.current.x) > 0.001 ||
        Math.abs(lastSentDirection.current.z) > 0.001;

      if (isMoving) {
        const dirDelta = Math.hypot(
          dirX - lastSentDirection.current.x,
          dirZ - lastSentDirection.current.z,
        );
        if (dirDelta > 0.05 || now - lastSendTime.current >= SEND_INTERVAL_MS) {
          lastSendTime.current = now;
          lastSentDirection.current = { x: dirX, y: 0, z: dirZ };
          sendPlayerMove({ x: dirX, y: 0, z: dirZ }, { x: 0, y: lastYaw.current }, now);
        }
      } else if (wasMoving) {
        // Immediate stop dispatch: zeroes out server velocity on the exact release tick
        lastSendTime.current = now;
        lastSentDirection.current = { x: 0, y: 0, z: 0 };
        sendPlayerMove({ x: 0, y: 0, z: 0 }, { x: 0, y: lastYaw.current }, now);
      }

      // -----------------------------------------------------------------------
      // 3. Pickup interaction handling (KeyE)
      // -----------------------------------------------------------------------
      const ePressed = input.interactPressedThisFrame || input.interact;
      const pickups = useGameStore.getState().weaponPickups;
      let closestId: string | null = null;
      let closestDist = 999;
      let closestWeapon: string | null = null;
      for (const p of Object.values(pickups)) {
        if (!p.isAvailable) continue;
        const distRender = Math.hypot(currentPos.current.x - p.position.x, currentPos.current.z - p.position.z);
        const distServer = Math.hypot(player.position.x - p.position.x, player.position.z - p.position.z);
        const dist = Math.min(distRender, distServer);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = p.id;
          closestWeapon = p.type;
        }
      }

      if (ePressed && player.isAlive) {
        if (closestId && closestDist <= 3.2) {
          sendPlayerPickup(closestId);
          input.interactPressedThisFrame = false;
          input.interact = false;
        }
      }

      // -----------------------------------------------------------------------
      // 4. Attack input handling & swing progress
      // -----------------------------------------------------------------------
      const currentWeapon = (player.weapon as WeaponType) || WeaponType.FIST;
      const weaponCooldowns: Record<string, number> = {
        fist: 0.3,
        stick: 0.4,
        baseball_bat: 0.5,
        axe: 0.6,
        hammer: 0.8,
        rock: 0.2,
      };
      const baseCd = weaponCooldowns[currentWeapon] ?? 0.4;

      if (attackCooldownTimer.current > 0) {
        attackCooldownTimer.current = Math.max(0, attackCooldownTimer.current - delta);
        const attackDuration = 0.35; // 350ms swing arc
        const elapsed = baseCd - attackCooldownTimer.current;
        attackSwingProgress.current = Math.min(1, Math.max(0, elapsed / attackDuration));
        if (attackCooldownTimer.current === 0) {
          attackSwingProgress.current = 0;
        }
      }

      const fPressed = input.powerAttackPressedThisFrame || input.powerAttack;
      if (fPressed && player.isAlive) {
        if (player.powerAvailable && attackCooldownTimer.current <= 0) {
          attackCooldownTimer.current = Math.max(0.6, baseCd);
          attackSwingProgress.current = 0.05;
          sendPlayerAttack(AttackType.POWER, currentWeapon);
          input.powerAttackPressedThisFrame = false;
          input.powerAttack = false;
        }
      } else if (attackCooldownTimer.current <= 0 && player.isAlive) {
        if (input.heavyAttackPressedThisFrame || input.heavyAttack) {
          attackCooldownTimer.current = baseCd * 1.3;
          attackSwingProgress.current = 0.05;
          sendPlayerAttack(AttackType.HEAVY, currentWeapon);
        } else if (input.attackPressedThisFrame || input.lightAttack) {
          attackCooldownTimer.current = baseCd;
          attackSwingProgress.current = 0.05;
          sendPlayerAttack(AttackType.LIGHT, currentWeapon);
        }
      }

      // -----------------------------------------------------------------------
      // 4. Smoothly render authoritative server position (no client physics fighting)
      // -----------------------------------------------------------------------
      _targetPos.set(player.position.x, 0, player.position.z);
      const alpha = 1 - Math.exp(-22 * delta);
      currentPos.current.lerp(_targetPos, alpha);

      if (isMoving) {
        _euler.set(0, lastYaw.current, 0);
        _targetQuat.setFromEuler(_euler);
        currentQuat.current.slerp(_targetQuat, 1 - Math.exp(-18 * delta));
      } else {
        _euler.set(player.rotation.x, player.rotation.y, player.rotation.z);
        _targetQuat.setFromEuler(_euler);
        currentQuat.current.slerp(_targetQuat, 1 - Math.exp(-12 * delta));
      }

      const group = groupRef.current;
      if (group) {
        group.position.copy(currentPos.current);
        group.quaternion.copy(currentQuat.current);
      }

      // Update transform registry for GroupCamera
      setLiveTransform(sessionId, currentPos.current.clone(), currentQuat.current.clone());

      // -----------------------------------------------------------------------
      // 5. Update animation pose
      // -----------------------------------------------------------------------
      const speed = isMoving
        ? 5.0
        : Math.hypot(_targetPos.x - currentPos.current.x, _targetPos.z - currentPos.current.z) /
          Math.max(delta, 1e-3);
      pose.speed = isMoving ? 5.0 : speed;
      pose.idle = !isMoving && speed < 0.2;
      pose.runAmount = isMoving ? 1 : 0;
      pose.attack = attackCooldownTimer.current > 0 ? attackSwingProgress.current : 0;
      pose.attackKind = attackCooldownTimer.current > 0 ? 'swing' : null;
      pose.blocking = false;
      pose.dodge = 0;
      pose.stagger = 0;
      pose.fallen = !player.isAlive;
    } finally {
      endInputFrame();
    }
  });

  const player = useGameStore((s) => s.players[sessionId]);

  return (
    <group ref={groupRef}>
      <PlaceholderPlayer
        color={color as never}
        poseRef={{ current: pose }}
        isLocal
        weapon={(player?.weapon as WeaponType) ?? WeaponType.FIST}
        weaponSwing={attackSwingProgress.current}
        playerState={attackCooldownTimer.current > 0 ? 'attacking' : (player?.state ?? (pose.idle ? 'idle' : 'running'))}
        speed={pose.speed}
        alive={player?.isAlive ?? true}
      />
    </group>
  );
}

export function cleanupLocalPlayer(sessionId: string) {
  clearLiveTransform(sessionId);
}