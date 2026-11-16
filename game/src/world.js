// Mothlight's rules and state, with no drawing and no browser in it: the player,
// the waves of shadow wisps, bullets, pickups and the boss. step() advances one
// fixed step and returns what happened as bit flags, so the caller can react
// (sound, announcements) without the world knowing about screens or sound.
// The world owns the particle pool, so screenshot scenes stage real fights.
import { BOSS_WAVES, BULLET, ENEMY, FIELD, ORB, PICKUP, PLAYER, STEP, UPGRADES, WIN_WAVE } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_KILL = 2;
export const EVENT_PICKUP = 4;
export const EVENT_HEAL = 8;
export const EVENT_WAVE_CLEAR = 16;
export const EVENT_OVER = 32;
export const EVENT_WIN = 64;
export const EVENT_BOSS = 128;
export const EVENT_DASH = 256;
export const EVENT_SHOT = 512;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random, particles) {
  const player = {
    x: FIELD.width / 2, y: FIELD.height / 2, radius: PLAYER.radius,
    hp: PLAYER.maxHp, maxHp: PLAYER.maxHp, angle: -Math.PI / 2,
    fireTimer: 0, dashTimer: 0, dashCdLeft: 0, invuln: 0,
    damage: PLAYER.damage, fireRate: PLAYER.fireRate, speed: PLAYER.speed,
    bullets: PLAYER.bullets, pierce: PLAYER.pierce, magnet: PLAYER.magnet,
    bulletSpeed: PLAYER.bulletSpeed, bulletRange: PLAYER.bulletRange,
    dashCooldown: PLAYER.dashCooldown,
  };
  const state = {
    player, enemies: [], bullets: [], orbs: [], pickups: [],
    score: 0, kills: 0, wave: 0, elapsed: 0, phase: 'title',
    spawnQueue: [], spawnTimer: 0, banner: '', bannerTimer: 0,
    upgradeChoices: [], boss: null, time: 0,
  };

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.hp = PLAYER.maxHp;
    player.maxHp = PLAYER.maxHp;
    player.angle = -Math.PI / 2;
    player.fireTimer = 0;
    player.dashTimer = 0;
    player.dashCdLeft = 0;
    player.invuln = 0;
    player.damage = PLAYER.damage;
    player.fireRate = PLAYER.fireRate;
    player.speed = PLAYER.speed;
    player.bullets = PLAYER.bullets;
    player.pierce = PLAYER.pierce;
    player.magnet = PLAYER.magnet;
    player.bulletSpeed = PLAYER.bulletSpeed;
    player.bulletRange = PLAYER.bulletRange;
    player.dashCooldown = PLAYER.dashCooldown;
    state.enemies.length = 0;
    state.bullets.length = 0;
    state.orbs.length = 0;
    state.pickups.length = 0;
    state.score = 0;
    state.kills = 0;
    state.wave = 0;
    state.elapsed = 0;
    state.phase = 'title';
    state.spawnQueue.length = 0;
    state.banner = '';
    state.bannerTimer = 0;
    state.upgradeChoices = [];
    state.boss = null;
    state.time = 0;
    particles.reset();
  }

  function spawnPoint() {
    for (let tries = 0; tries < 8; tries += 1) {
      const edge = Math.floor(random() * 4);
      let x = 0;
      let y = 0;
      if (edge === 0) { x = random() * FIELD.width; y = 30; }
      else if (edge === 1) { x = random() * FIELD.width; y = FIELD.height - 30; }
      else if (edge === 2) { x = 30; y = random() * FIELD.height; }
      else { x = FIELD.width - 30; y = random() * FIELD.height; }
      if (dist2(x, y, player.x, player.y) > 240 * 240) return { x, y };
    }
    return { x: 60, y: 60 };
  }

  function addEnemy(kind, x, y) {
    const def = ENEMY[kind];
    const enemy = {
      kind, x, y, radius: def.radius, hp: def.hp, maxHp: def.hp,
      speed: def.speed, touch: def.touch, score: def.score,
      shootTimer: 1.5 + random() * 1.5, burstTimer: 3, summonTimer: 6,
      flash: 0, seed: random() * Math.PI * 2,
    };
    if (kind === 'boss') {
      enemy.hp = def.hp + state.wave * 10;
      enemy.maxHp = enemy.hp;
      state.boss = enemy;
    }
    state.enemies.push(enemy);
    return enemy;
  }

  function startWave(n) {
    state.wave = n;
    state.spawnQueue.length = 0;
    const isBoss = BOSS_WAVES.has(n);
    if (isBoss) {
      state.spawnQueue.push('boss');
      for (let i = 0; i < 4; i += 1) state.spawnQueue.push('wisp');
      state.banner = n === WIN_WAVE ? 'The Gloomwarden — final wave' : 'The Gloomwarden stirs…';
    } else {
      const wisps = 5 + n * 2;
      for (let i = 0; i < wisps; i += 1) state.spawnQueue.push('wisp');
      if (n >= 2) for (let i = 0; i < 1 + n; i += 1) state.spawnQueue.push('spitter');
      if (n >= 3) for (let i = 0; i < Math.floor(n / 2); i += 1) state.spawnQueue.push('brute');
      // Shuffle the queue so the wave is not one kind at a time.
      for (let i = state.spawnQueue.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [state.spawnQueue[i], state.spawnQueue[j]] = [state.spawnQueue[j], state.spawnQueue[i]];
      }
      state.banner = `Wave ${n}`;
    }
    state.bannerTimer = 2.2;
    state.spawnTimer = 0.6;
  }

  function startGame() {
    reset();
    state.phase = 'play';
    startWave(1);
  }

  function rollUpgrades() {
    const pool = [...UPGRADES];
    const choices = [];
    while (choices.length < 3 && pool.length > 0) {
      const i = Math.floor(random() * pool.length);
      choices.push(pool.splice(i, 1)[0]);
    }
    state.upgradeChoices = choices;
  }

  function applyUpgrade(index) {
    const upgrade = state.upgradeChoices[index];
    if (!upgrade || state.phase !== 'upgrade') return null;
    upgrade.apply(player);
    if (upgrade.id === 'heart') player.hp = Math.min(player.maxHp, player.hp + 30);
    if (upgrade.id === 'vigour') player.hp = Math.min(player.maxHp, player.hp + 40);
    state.upgradeChoices = [];
    state.phase = 'play';
    startWave(state.wave + 1);
    return upgrade;
  }

  function dropPickup(x, y) {
    const roll = random();
    if (roll < PICKUP.dropHeart) state.pickups.push({ kind: 'heart', x, y, vx: 0, vy: 0, life: 12 });
    else if (roll < PICKUP.dropHeart + PICKUP.dropEmber) state.pickups.push({ kind: 'ember', x, y, vx: 0, vy: 0, life: 12 });
  }

  function killEnemy(enemy, index) {
    state.enemies.splice(index, 1);
    state.kills += 1;
    state.score += enemy.score;
    particles.burst(enemy.x, enemy.y, ENEMY[enemy.kind].color, enemy.kind === 'boss' ? 48 : 14, 220);
    particles.ring(enemy.x, enemy.y, '#ffffff', 12, 180);
    particles.floatText(enemy.x, enemy.y - 10, `+${enemy.score}`, '#f2c94c');
    particles.shake(enemy.kind === 'boss' ? 0.9 : enemy.kind === 'brute' ? 0.4 : 0.2);
    if (enemy.kind === 'boss') state.boss = null;
    dropPickup(enemy.x, enemy.y);
    if (enemy.kind === 'boss' && random() < 0.9) state.pickups.push({ kind: 'heart', x: enemy.x + 30, y: enemy.y, vx: 0, vy: 0, life: 12 });
  }

  function fireBullets() {
    const count = player.bullets;
    const spreadStep = 0.14;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * spreadStep;
      const angle = player.angle + offset;
      state.bullets.push({
        x: player.x + Math.cos(angle) * (player.radius + 8),
        y: player.y + Math.sin(angle) * (player.radius + 8),
        vx: Math.cos(angle) * player.bulletSpeed,
        vy: Math.sin(angle) * player.bulletSpeed,
        life: player.bulletRange / player.bulletSpeed,
        pierce: player.pierce,
      });
    }
  }

  /** One fixed step. ctrl: {x, y, aimX, aimY, firing, dash} in playfield coords. */
  function step(dt, ctrl) {
    let events = 0;
    state.time += dt;
    particles.step(dt);
    if (state.bannerTimer > 0) state.bannerTimer -= dt;

    if (state.phase === 'title') {
      // Attract mode: wisps drift in slow circles behind the title panel.
      state.elapsed += dt;
      if (state.enemies.length < 7 && random() < dt * 1.5) {
        const p = spawnPoint();
        addEnemy('wisp', p.x, p.y);
      }
      for (const e of state.enemies) {
        e.x += Math.cos(state.time * 0.5 + e.seed) * e.speed * 0.4 * dt;
        e.y += Math.sin(state.time * 0.7 + e.seed) * e.speed * 0.4 * dt;
        e.x = Math.max(20, Math.min(FIELD.width - 20, e.x));
        e.y = Math.max(20, Math.min(FIELD.height - 20, e.y));
      }
      return 0;
    }
    if (state.phase !== 'play') return 0;

    state.elapsed += dt;
    if (player.invuln > 0) player.invuln -= dt;
    if (player.dashCdLeft > 0) player.dashCdLeft -= dt;

    // --- Player movement and dash ---
    let mx = ctrl.x || 0;
    let my = ctrl.y || 0;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    if (ctrl.dash && player.dashCdLeft <= 0 && player.dashTimer <= 0) {
      player.dashTimer = PLAYER.dashTime;
      player.dashCdLeft = player.dashCooldown;
      player.invuln = Math.max(player.invuln, 0.25);
      particles.burst(player.x, player.y, '#ffe08a', 10, 160, 0.4, 3);
      events |= EVENT_DASH;
    }
    const speed = player.dashTimer > 0 ? PLAYER.dashSpeed : player.speed;
    if (player.dashTimer > 0) player.dashTimer -= dt;
    player.x = Math.max(player.radius, Math.min(FIELD.width - player.radius, player.x + mx * speed * dt));
    player.y = Math.max(player.radius, Math.min(FIELD.height - player.radius, player.y + my * speed * dt));

    // Aim: mouse position, or the nearest enemy when the pointer is idle.
    if (ctrl.aimX !== undefined && ctrl.aimY !== undefined) {
      player.angle = Math.atan2(ctrl.aimY - player.y, ctrl.aimX - player.x);
    }

    // --- Firing ---
    player.fireTimer -= dt;
    if (ctrl.firing && player.fireTimer <= 0) {
      fireBullets();
      player.fireTimer = 1 / player.fireRate;
      events |= EVENT_SHOT;
    }

    // --- Spawning ---
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        const kind = state.spawnQueue.shift();
        const p = spawnPoint();
        addEnemy(kind, p.x, p.y);
        if (kind === 'boss') events |= EVENT_BOSS;
        state.spawnTimer = Math.max(0.35, 0.9 - state.wave * 0.05);
      }
    }

    // --- Enemies ---
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      if (e.flash > 0) e.flash -= dt;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      let speed = e.speed + Math.min(40, state.wave * 3);
      if (e.kind === 'boss' && e.hp < e.maxHp / 2) speed *= 1.4;
      if (e.kind === 'spitter') {
        if (d > 300) { e.x += nx * speed * dt; e.y += ny * speed * dt; }
        else if (d < 200) { e.x -= nx * speed * 0.6 * dt; e.y -= ny * speed * 0.6 * dt; }
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && d < 520) {
          e.shootTimer = 2.2;
          state.orbs.push({ x: e.x, y: e.y, vx: nx * ORB.speed, vy: ny * ORB.speed, life: 4 });
        }
      } else if (e.kind === 'boss') {
        e.x += nx * speed * dt;
        e.y += ny * speed * dt;
        e.burstTimer -= dt;
        if (e.burstTimer <= 0) {
          e.burstTimer = 3.2;
          for (let k = 0; k < 12; k += 1) {
            const a = (k / 12) * Math.PI * 2 + state.time;
            state.orbs.push({ x: e.x, y: e.y, vx: Math.cos(a) * ORB.speed, vy: Math.sin(a) * ORB.speed, life: 4 });
          }
          particles.ring(e.x, e.y, '#e5534b', 24, 300);
        }
        e.summonTimer -= dt;
        if (e.summonTimer <= 0 && state.enemies.length < 14) {
          e.summonTimer = 7;
          for (let k = 0; k < 3; k += 1) addEnemy('wisp', e.x + (random() - 0.5) * 120, e.y + (random() - 0.5) * 120);
        }
      } else {
        e.x += nx * speed * dt;
        e.y += ny * speed * dt;
      }
      // Separation: enemies push apart so they never stack.
      for (let j = 0; j < state.enemies.length; j += 1) {
        if (j === i) continue;
        const o = state.enemies[j];
        const d2 = dist2(e.x, e.y, o.x, o.y);
        const min = e.radius + o.radius;
        if (d2 > 0.01 && d2 < min * min) {
          const dd = Math.sqrt(d2);
          const push = (min - dd) / 2;
          const px = (e.x - o.x) / dd * push;
          const py = (e.y - o.y) / dd * push;
          e.x += px; e.y += py;
        }
      }
      // Touch damage.
      if (d < e.radius + player.radius && player.invuln <= 0 && player.dashTimer <= 0) {
        player.hp -= e.touch;
        player.invuln = PLAYER.invulnerable;
        particles.burst(player.x, player.y, '#e5534b', 16, 240);
        particles.shake(0.55);
        events |= EVENT_HIT;
        if (player.hp <= 0) {
          player.hp = 0;
          state.phase = 'over';
          particles.burst(player.x, player.y, '#ffe08a', 60, 320, 1, 5);
          particles.shake(1);
          return events | EVENT_OVER;
        }
      }
    }

    // --- Bullets ---
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20;
      if (!dead) {
        for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
          const e = state.enemies[j];
          if (dist2(b.x, b.y, e.x, e.y) < (e.radius + BULLET.radius) ** 2) {
            e.hp -= player.damage;
            e.flash = 0.12;
            const kb = 26;
            e.x += b.vx * 0.001 * kb * 0.4;
            e.y += b.vy * 0.001 * kb * 0.4;
            particles.burst(b.x, b.y, '#fff3b0', 4, 140, 0.3, 3);
            if (e.hp <= 0) {
              killEnemy(e, j);
              events |= EVENT_KILL;
            }
            if (b.pierce > 0) { b.pierce -= 1; }
            else { dead = true; }
            break;
          }
        }
      }
      if (dead) state.bullets.splice(i, 1);
    }

    // --- Enemy orbs ---
    for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
      const o = state.orbs[i];
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
      let dead = o.life <= 0 || o.x < -20 || o.x > FIELD.width + 20 || o.y < -20 || o.y > FIELD.height + 20;
      if (!dead && player.invuln <= 0 && player.dashTimer <= 0 && dist2(o.x, o.y, player.x, player.y) < (ORB.radius + player.radius) ** 2) {
        player.hp -= ORB.damage;
        player.invuln = PLAYER.invulnerable;
        particles.burst(player.x, player.y, '#ff7ab8', 14, 220);
        particles.shake(0.5);
        events |= EVENT_HIT;
        dead = true;
        if (player.hp <= 0) {
          player.hp = 0;
          state.phase = 'over';
          particles.burst(player.x, player.y, '#ffe08a', 60, 320, 1, 5);
          return events | EVENT_OVER;
        }
      }
      if (dead) state.orbs.splice(i, 1);
    }

    // --- Pickups ---
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const p = state.pickups[i];
      p.life -= dt;
      const d = Math.hypot(player.x - p.x, player.y - p.y) || 1;
      if (d < player.magnet) {
        const pull = 420 * (1 - d / player.magnet) + 120;
        p.x += ((player.x - p.x) / d) * pull * dt;
        p.y += ((player.y - p.y) / d) * pull * dt;
      }
      if (d < player.radius + 14) {
        if (p.kind === 'ember') {
          state.score += PICKUP.emberScore;
          particles.floatText(p.x, p.y - 8, `+${PICKUP.emberScore}`, '#f2c94c');
          events |= EVENT_PICKUP;
        } else {
          player.hp = Math.min(player.maxHp, player.hp + PICKUP.heartHeal);
          particles.floatText(p.x, p.y - 8, `+${PICKUP.heartHeal} HP`, '#ff6b81');
          events |= EVENT_HEAL;
        }
        state.pickups.splice(i, 1);
        continue;
      }
      if (p.life <= 0) state.pickups.splice(i, 1);
    }

    // --- Wave clear ---
    if (state.spawnQueue.length === 0 && state.enemies.length === 0 && state.phase === 'play') {
      if (state.wave >= WIN_WAVE) {
        state.phase = 'win';
        return events | EVENT_WIN;
      }
      rollUpgrades();
      state.phase = 'upgrade';
      return events | EVENT_WAVE_CLEAR;
    }
    return events;
  }

  function jumpToWave(n) {
    // For screenshot staging and testing: clear the field and open wave n.
    state.enemies.length = 0;
    state.bullets.length = 0;
    state.orbs.length = 0;
    state.pickups.length = 0;
    state.spawnQueue.length = 0;
    state.boss = null;
    state.phase = 'play';
    startWave(n);
  }

  reset();
  return { state, reset, startGame, startWave, jumpToWave, applyUpgrade, step, rollUpgrades };
}
