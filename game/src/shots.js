// The screenshot scenes behind ?shot=title|play|boss|win. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (keep clear of enemies and orbs, chase the nearest ember,
// aim at the nearest enemy, dash when cornered), so the frame is what a short
// game really looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = 1 / 30;

/** The autopilot's control for one step: move, aim and fire. */
function autopilot(state) {
  const p = state.player;
  let nearest = null;
  let nearestD = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestD) { nearestD = d; nearest = e; }
  }
  let ember = null;
  let emberD = Infinity;
  for (const pk of state.pickups) {
    if (pk.kind !== 'ember') continue;
    const d = Math.hypot(pk.x - p.x, pk.y - p.y);
    if (d < emberD) { emberD = d; ember = pk; }
  }
  let mx = 0;
  let my = 0;
  if (nearest && nearestD < 170) {
    // Back away from the threat.
    mx = (p.x - nearest.x) / nearestD;
    my = (p.y - nearest.y) / nearestD;
  } else if (ember && emberD < 260) {
    mx = (ember.x - p.x) / emberD;
    my = (ember.y - p.y) / emberD;
  } else if (nearest) {
    // Keep a firing distance: drift sideways around the enemy.
    mx = -((nearest.y - p.y) / nearestD) * 0.6;
    my = ((nearest.x - p.x) / nearestD) * 0.6;
  }
  // Stay inside the field.
  if (p.x < 80) mx += 0.6;
  if (p.x > FIELD.width - 80) mx -= 0.6;
  if (p.y < 80) my += 0.6;
  if (p.y > FIELD.height - 80) my -= 0.6;
  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }
  return {
    x: mx,
    y: my,
    aimX: nearest ? nearest.x : p.x,
    aimY: nearest ? nearest.y : p.y - 100,
    firing: true,
    dash: nearest !== null && nearestD < 70 && p.dashCdLeft <= 0,
  };
}

function runBot(world, seconds) {
  let events = 0;
  for (let i = 0; i < seconds / STEP; i += 1) {
    events = world.step(STEP, autopilot(world.state));
    if (events & (EVENT_OVER | EVENT_WIN)) break;
  }
  return events;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    world.startGame();
    runBot(world, 16);
    // If the bot cleared wave 1, take a blessing and fight on into wave 2 so
    // the frame shows a busy mid-wave fight, not an empty cleared field.
    if (world.state.phase === 'upgrade') {
      world.applyUpgrade(0);
      runBot(world, 8);
    }
    return { screen: world.state.phase === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'boss') {
    world.startGame();
    world.jumpToWave(5);
    // Let the boss spawn, then fight it for a while — short enough that its
    // wisp escort is still alive in the frame.
    for (let i = 0; i < 2 / STEP; i += 1) world.step(STEP, autopilot(world.state));
    runBot(world, 8);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    world.startGame();
    world.jumpToWave(10);
    for (let i = 0; i < 2 / STEP; i += 1) world.step(STEP, autopilot(world.state));
    // The final boss, softened so the staged fight ends in a real win.
    for (const e of world.state.enemies) e.hp = Math.min(e.hp, 2);
    runBot(world, 30);
    if (world.state.phase !== 'win') {
      // Fall back to the victory panel over a cleared, ember-strewn field.
      world.state.enemies.length = 0;
      world.state.orbs.length = 0;
      world.state.phase = 'win';
    }
    return { screen: SCREEN_WIN, best: world.state.score };
  }
  // title (and any unknown name): the attract mode behind the title panel.
  world.reset();
  for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, { x: 0, y: 0, firing: false });
  return { screen: SCREEN_TITLE, best: 0 };
}
