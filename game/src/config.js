// Mothlight — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// fit the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 300,
  maxHp: 100,
  fireRate: 4.2, // shots per second
  damage: 1,
  bulletSpeed: 660,
  bulletRange: 560,
  bullets: 1,
  pierce: 0,
  magnet: 100,
  dashCooldown: 2.4,
  dashTime: 0.16,
  dashSpeed: 920,
  invulnerable: 0.9, // seconds after taking a hit
};

export const BULLET = { radius: 6, life: 1 };

export const ENEMY = {
  wisp: { radius: 14, hp: 2, speed: 96, touch: 10, score: 50, color: '#b388ff' },
  spitter: { radius: 17, hp: 4, speed: 72, touch: 12, score: 80, color: '#ff7ab8' },
  brute: { radius: 27, hp: 12, speed: 54, touch: 18, score: 150, color: '#ff9f43' },
  boss: { radius: 50, hp: 180, speed: 46, touch: 25, score: 1000, color: '#e5534b' },
};

export const ORB = { radius: 8, speed: 190, damage: 8 };

/** Waves 1-10. Wave 5 and wave 10 end in a boss; wave 10's boss is the win. */
export const WIN_WAVE = 10;
export const BOSS_WAVES = new Set([5, 10]);

export const PICKUP = {
  emberScore: 25,
  emberHeal: 0,
  heartHeal: 25,
  dropEmber: 0.55,
  dropHeart: 0.09,
};

export const PALETTE = {
  backdrop: '#0b0e1d',
  skyTop: '#141a38',
  skyBottom: '#0b0e1d',
  ground: '#171c33',
  text: '#f4f1e6',
  muted: '#9aa3c7',
  gold: '#f2c94c',
  ember: '#ff9f43',
  heart: '#ff6b81',
  player: '#ffe08a',
  playerGlow: '#ffb347',
  bullet: '#fff3b0',
  panel: '#1a2038',
  panelEdge: '#3a4470',
  card: '#232a4a',
  cardEdge: '#5a6bb0',
  danger: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'mothlight.best';

/** The three upgrade cards offered between waves. */
export const UPGRADES = [
  { id: 'damage', name: 'Bright Rounds', desc: '+35% bullet damage', apply: (s) => { s.damage *= 1.35; } },
  { id: 'rate', name: 'Rapid Glow', desc: '+20% fire rate', apply: (s) => { s.fireRate *= 1.2; } },
  { id: 'speed', name: 'Swift Wings', desc: '+12% move speed', apply: (s) => { s.speed *= 1.12; } },
  { id: 'twin', name: 'Twin Flames', desc: '+1 bullet per shot', apply: (s) => { s.bullets = Math.min(5, s.bullets + 1); } },
  { id: 'pierce', name: 'Piercing Light', desc: 'Bullets pierce +1 enemy', apply: (s) => { s.pierce = Math.min(3, s.pierce + 1); } },
  { id: 'reach', name: 'Long Reach', desc: '+25% bullet speed and range', apply: (s) => { s.bulletSpeed *= 1.25; s.bulletRange *= 1.25; } },
  { id: 'magnet', name: 'Magnet Petals', desc: '+60% pickup magnet', apply: (s) => { s.magnet *= 1.6; } },
  { id: 'heart', name: 'Lantern Heart', desc: '+30 max HP and heal 30', apply: (s) => { s.maxHp += 30; } },
  { id: 'dash', name: 'Quick Dash', desc: 'Dash recharges 30% faster', apply: (s) => { s.dashCooldown *= 0.7; } },
  { id: 'vigour', name: 'Ember Vigour', desc: 'Heal 40 HP now', apply: (s) => { s.healNow = 40; } },
];
