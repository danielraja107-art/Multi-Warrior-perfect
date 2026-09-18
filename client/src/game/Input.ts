export interface InputVector {
  x: number;
  y: number;
}

export class InputState {
  /** Lateral strafe: left = -1, right = +1 (keyboard/gamepad). */
  moveX = 0;
  /** Forward / backward: back = -1, forward = +1 (keyboard/gamepad). */
  moveY = 0;
  run = false;
  dodge = false;
  lightAttack = false;
  heavyAttack = false;
  powerAttack = false;
  interact = false;
  block = false;
  throwButton = false;
  attackPressedThisFrame = false;
  heavyAttackPressedThisFrame = false;
  powerAttackPressedThisFrame = false;
  dodgePressedThisFrame = false;
  interactPressedThisFrame = false;
  blockPressedThisFrame = false;
  throwPressedThisFrame = false;
}

export const input = new InputState();

const KEY_MAP: Record<string, keyof InputState> = {
  KeyW: 'moveY',
  KeyS: 'moveY',
  KeyA: 'moveX',
  KeyD: 'moveX',
  ArrowUp: 'moveY',
  ArrowDown: 'moveY',
  ArrowLeft: 'moveX',
  ArrowRight: 'moveX',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Space: 'dodge',
  KeyE: 'interact',
  KeyQ: 'block',
  KeyF: 'throwButton',
};

interface KeyboardAxisState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  shift: boolean;
  interact: boolean;
  block: boolean;
  throwButton: boolean;
}

const keyboard: KeyboardAxisState = {
  forward: false,
  back: false,
  left: false,
  right: false,
  shift: false,
  interact: false,
  block: false,
  throwButton: false,
};

type MoveStopListener = () => void;
const moveStopListeners = new Set<MoveStopListener>();

export function onMoveStop(listener: MoveStopListener): () => void {
  moveStopListeners.add(listener);
  return () => {
    moveStopListeners.delete(listener);
  };
}

function notifyMoveStop() {
  moveStopListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

let listenersAttached = false;

function updateFromKeyboard() {
  input.moveX = (keyboard.right ? 1 : 0) - (keyboard.left ? 1 : 0);
  input.moveY = (keyboard.forward ? 1 : 0) - (keyboard.back ? 1 : 0);
  input.run = keyboard.shift;
  input.interact = keyboard.interact;
  input.block = keyboard.block;
  input.throwButton = keyboard.throwButton;
}

function keyToAxis(key: string): { axis: keyof KeyboardAxisState; sign: number } | null {
  const signed: Record<string, { axis: keyof KeyboardAxisState; sign: number }> = {
    KeyW: { axis: 'forward', sign: 1 },
    ArrowUp: { axis: 'forward', sign: 1 },
    KeyS: { axis: 'back', sign: 1 },
    ArrowDown: { axis: 'back', sign: 1 },
    KeyA: { axis: 'left', sign: 1 },
    ArrowLeft: { axis: 'left', sign: 1 },
    KeyD: { axis: 'right', sign: 1 },
    ArrowRight: { axis: 'right', sign: 1 },
  };
  return signed[key] ?? null;
}

function onKeyDown(e: KeyboardEvent) {
  if (e.repeat) {
    if (keyToAxis(e.code)) {
      e.preventDefault();
    }
    return;
  }

  const isTyping = (e.target as HTMLElement | null)?.tagName === 'INPUT';
  if (isTyping) return;

  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    keyboard.shift = true;
    updateFromKeyboard();
    return;
  }

  const signed = keyToAxis(e.code);
  if (signed) {
    keyboard[signed.axis] = true;
    e.preventDefault();
    updateFromKeyboard();
    return;
  }

  const isF = e.code === 'KeyF' || e.key?.toLowerCase() === 'f';
  const isE = e.code === 'KeyE' || e.key?.toLowerCase() === 'e';
  const isJ = e.code === 'KeyJ' || e.code === 'Digit1' || e.key?.toLowerCase() === 'j';
  const isK = e.code === 'KeyK' || e.code === 'Digit2' || e.key?.toLowerCase() === 'k';

  if (e.code === 'Space') {
    input.dodgePressedThisFrame = !e.repeat;
    e.preventDefault();
  } else if (isE) {
    keyboard.interact = true;
    input.interact = true;
    input.interactPressedThisFrame = true;
  } else if (e.code === 'KeyQ') {
    keyboard.block = true;
    input.blockPressedThisFrame = true;
  } else if (isF) {
    input.powerAttack = true;
    input.powerAttackPressedThisFrame = true;
  } else if (isJ) {
    input.lightAttack = true;
    input.attackPressedThisFrame = true;
  } else if (isK) {
    input.heavyAttack = true;
    input.heavyAttackPressedThisFrame = true;
  }
}

function onKeyUp(e: KeyboardEvent) {
  const isF = e.code === 'KeyF' || e.key?.toLowerCase() === 'f';
  const isE = e.code === 'KeyE' || e.key?.toLowerCase() === 'e';
  const isJ = e.code === 'KeyJ' || e.code === 'Digit1' || e.key?.toLowerCase() === 'j';
  const isK = e.code === 'KeyK' || e.code === 'Digit2' || e.key?.toLowerCase() === 'k';

  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    keyboard.shift = false;
    updateFromKeyboard();
    return;
  }

  const signed = keyToAxis(e.code);
  if (signed) {
    keyboard[signed.axis] = false;
    updateFromKeyboard();
    if (input.moveX === 0 && input.moveY === 0) {
      notifyMoveStop();
    }
    return;
  }

  if (isE) {
    keyboard.interact = false;
    input.interact = false;
    updateFromKeyboard();
  } else if (e.code === 'KeyQ') {
    keyboard.block = false;
    updateFromKeyboard();
  } else if (isF) {
    input.powerAttack = false;
  } else if (isJ) {
    input.lightAttack = false;
  } else if (isK) {
    input.heavyAttack = false;
  }
}

function onMouseDown(e: MouseEvent) {
  if (e.button === 0) {
    input.lightAttack = true;
    input.attackPressedThisFrame = true;
  } else if (e.button === 2) {
    input.heavyAttack = true;
    input.heavyAttackPressedThisFrame = true;
  }
}

function onMouseUp(e: MouseEvent) {
  if (e.button === 0) {
    input.lightAttack = false;
  } else if (e.button === 2) {
    input.heavyAttack = false;
  }
}

function onContextMenu(e: Event) {
  e.preventDefault();
}

const GAMEPAD_ACCEL = 4.0;
let gamepadMoveX = 0;
let gamepadMoveY = 0;

function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads[0];
  if (!pad) return;

  const x = deadzone(pad.axes[0] ?? 0);
  const y = deadzone(pad.axes[1] ?? 0);
  gamepadMoveX += (x - gamepadMoveX) * Math.min(1, GAMEPAD_ACCEL / 60);
  gamepadMoveY += (y - gamepadMoveY) * Math.min(1, GAMEPAD_ACCEL / 60);

  const buttons = pad.buttons;
  if (buttons[15]) input.run = buttons[15].pressed; // L2 / LT
  if (buttons[0]) {
    if (buttons[0].pressed && !gamepadDodge) input.dodgePressedThisFrame = true;
    gamepadDodge = buttons[0].pressed;
  }
  if (buttons[2]) {
    if (buttons[2].pressed && !gamepadLight) input.attackPressedThisFrame = true;
    gamepadLight = buttons[2].pressed;
  }
  if (buttons[3]) {
    if (buttons[3].pressed && !gamepadHeavy) input.heavyAttackPressedThisFrame = true;
    gamepadHeavy = buttons[3].pressed;
  }
  if (buttons[1]) {
    if (buttons[1].pressed && !gamepadInteract) input.interactPressedThisFrame = true;
    gamepadInteract = buttons[1].pressed;
  }
  if (buttons[4]) {
    if (buttons[4].pressed && !gamepadBlock) input.blockPressedThisFrame = true;
    gamepadBlock = buttons[4].pressed;
  }
  if (buttons[5]) {
    if (buttons[5].pressed && !gamepadThrow) input.throwPressedThisFrame = true;
    gamepadThrow = buttons[5].pressed;
  }
}

let gamepadDodge = false;
let gamepadLight = false;
let gamepadHeavy = false;
let gamepadInteract = false;
let gamepadBlock = false;
let gamepadThrow = false;

function deadzone(v: number): number {
  return Math.abs(v) < 0.2 ? 0 : v;
}

function mergeGamepadIntoInput() {
  if (gamepadMoveX !== 0 || gamepadMoveY !== 0) {
    input.moveX = gamepadMoveX;
    input.moveY = gamepadMoveY;
  }
}

let rafId = 0;

function gamepadLoop() {
  pollGamepad();
  mergeGamepadIntoInput();
  rafId = requestAnimationFrame(gamepadLoop);
}

function endFrame() {
  input.attackPressedThisFrame = false;
  input.heavyAttackPressedThisFrame = false;
  input.powerAttackPressedThisFrame = false;
  input.dodgePressedThisFrame = false;
  input.interactPressedThisFrame = false;
  input.blockPressedThisFrame = false;
  input.throwPressedThisFrame = false;
}

export function initInput() {
  if (listenersAttached) return;
  listenersAttached = true;

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown, { capture: true });
  window.addEventListener('mouseup', onMouseUp, { capture: true });
  window.addEventListener('pointerdown', onMouseDown as unknown as EventListener, { capture: true });
  window.addEventListener('pointerup', onMouseUp as unknown as EventListener, { capture: true });
  window.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('blur', () => {
    Object.keys(keyboard).forEach((k) => {
      (keyboard as unknown as Record<string, boolean>)[k] = false;
    });
    input.lightAttack = false;
    input.heavyAttack = false;
    input.dodge = false;
    updateFromKeyboard();
    notifyMoveStop();
  });

  rafId = requestAnimationFrame(gamepadLoop);
}

export function clearInput() {
  if (!listenersAttached) return;
  listenersAttached = false;
  cancelAnimationFrame(rafId);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('mousedown', onMouseDown, { capture: true });
  window.removeEventListener('mouseup', onMouseUp, { capture: true });
  window.removeEventListener('pointerdown', onMouseDown as unknown as EventListener, { capture: true });
  window.removeEventListener('pointerup', onMouseUp as unknown as EventListener, { capture: true });
  window.removeEventListener('contextmenu', onContextMenu);
}

export function endInputFrame() {
  endFrame();
}