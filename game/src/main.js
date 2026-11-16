// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play,
// upgrade (between waves), paused, game over and victory.
//
// ?seed=N fixes the spawn pattern. ?shot=title|play|boss|win (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createParticles } from './particles.js';
import { createWorld, EVENT_BOSS, EVENT_DASH, EVENT_HEAL, EVENT_HIT, EVENT_KILL, EVENT_OVER, EVENT_PICKUP, EVENT_SHOT, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, ACTION_UPGRADE_1, ACTION_UPGRADE_2, ACTION_UPGRADE_3, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN, upgradeCardAt } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const particles = createParticles();
const world = createWorld(createRandom(seed), particles);
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, { particles, upgrades: world.state.upgradeChoices });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const audio = createAudio();
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastMouse = { x: -1, y: -1 };
  let mouseActiveUntil = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.startGame();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Wave 1. Survive 10 waves.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(won ? `You win! Score ${world.state.score}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function playEvents(events) {
    if (events & EVENT_SHOT) audio.shoot();
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_KILL) audio.kill();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_HEAL) audio.heal();
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_BOSS) { audio.boss(); announce('The Gloomwarden appears!'); }
    if (events & EVENT_WAVE_CLEAR) { audio.wave(); announce('Wave cleared. Choose a blessing.'); }
    if (events & EVENT_OVER) { audio.over(); endGame(false); }
    if (events & EVENT_WIN) { audio.win(); endGame(true); }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0, firing: false });
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const dir = input.direction();
    const mouse = input.mouse();
    const now = performance.now();
    if (mouse.x !== lastMouse.x || mouse.y !== lastMouse.y) {
      mouseActiveUntil = now + 2000;
      lastMouse = { x: mouse.x, y: mouse.y };
    }
    let aim;
    if (now < mouseActiveUntil) {
      aim = renderer.logicalFromClient(mouse.x, mouse.y);
    } else {
      // No pointer lately: aim at the nearest enemy so keyboard-only play works.
      let nearest = null;
      let nearestD = Infinity;
      for (const e of world.state.enemies) {
        const d = Math.hypot(e.x - world.state.player.x, e.y - world.state.player.y);
        if (d < nearestD) { nearestD = d; nearest = e; }
      }
      aim = nearest ? { x: nearest.x, y: nearest.y } : { x: world.state.player.x, y: world.state.player.y - 100 };
    }
    const actions = input.takeActions();
    const ctrl = {
      x: dir.x, y: dir.y, aimX: aim.x, aimY: aim.y,
      firing: true, // auto-fire: the game is about moving, aiming and dashing
      dash: Boolean(actions & ACTION_DASH),
    };
    const events = world.step(STEP, ctrl);
    playEvents(events);
    if (world.state.phase === 'upgrade') screen = SCREEN_UPGRADE;
  }

  function handleActions() {
    const actions = input.takeActions();
    const click = input.takeClick();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
      return;
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (actions & (ACTION_CONFIRM | ACTION_DASH)) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_UPGRADE) {
      let choice = -1;
      if (actions & ACTION_UPGRADE_1) choice = 0;
      else if (actions & ACTION_UPGRADE_2) choice = 1;
      else if (actions & ACTION_UPGRADE_3) choice = 2;
      else if (click) {
        const logical = renderer.logicalFromClient(click.x, click.y);
        choice = upgradeCardAt(logical.x, logical.y);
      }
      if (choice >= 0) {
        const upgrade = world.applyUpgrade(choice);
        if (upgrade) {
          audio.upgrade();
          screen = SCREEN_PLAY;
          announce(`${upgrade.name}. Wave ${world.state.wave}.`);
        }
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, { particles, upgrades: world.state.upgradeChoices });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Mothlight. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
