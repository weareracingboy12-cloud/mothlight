// Keyboard and pointer input. Held keys give a steering direction and an aim;
// one-shot presses (start, dash, pause, mute, upgrade choice) are queued as bit
// flags and taken once by the loop, so a press between two frames is never lost
// and never counted twice. The pointer's client position is kept raw; the loop
// converts it to playfield coordinates through the renderer.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;
export const ACTION_UPGRADE_1 = 16;
export const ACTION_UPGRADE_2 = 32;
export const ACTION_UPGRADE_3 = 64;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Enter']);
const DASH = new Set(['Space', 'ShiftLeft', 'ShiftRight']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const UPGRADE_KEYS = new Map([['Digit1', ACTION_UPGRADE_1], ['Digit2', ACTION_UPGRADE_2], ['Digit3', ACTION_UPGRADE_3]]);

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  let mouseX = 640;
  let mouseY = 360;
  let mouseDown = false;
  let clicked = false;
  let clickX = 0;
  let clickY = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code) || RIGHT.has(event.code) || UP.has(event.code) || DOWN.has(event.code)) {
      held.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (UPGRADE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= UPGRADE_KEYS.get(event.code);
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => { held.delete(event.code); });
  window.addEventListener('blur', () => { held.clear(); mouseDown = false; });

  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    mouseDown = true;
    clicked = true;
    clickX = mouseX;
    clickY = mouseY;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointerup', () => { mouseDown = false; });
  target.addEventListener('pointerleave', () => { mouseDown = false; });

  return {
    /** Steering direction, each axis -1, 0 or 1. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        if (LEFT.has(code)) x -= 1;
        else if (RIGHT.has(code)) x += 1;
        else if (UP.has(code)) y -= 1;
        else if (DOWN.has(code)) y += 1;
      }
      return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    },
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    /** The last click since the last take, in canvas pixels, or null. */
    takeClick() {
      if (!clicked) return null;
      clicked = false;
      return { x: clickX, y: clickY };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
