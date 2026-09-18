export const screenShake = {
  current: 0,
};

export function triggerScreenShake(magnitude = 1) {
  screenShake.current = Math.min(2.5, screenShake.current + magnitude);
}