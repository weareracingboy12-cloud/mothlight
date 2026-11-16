// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Canvas shapes and text only — no images, no network.
import { ENEMY, FIELD, FONT, ORB, PALETTE, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** Upgrade cards, in playfield coordinates; main uses these for click hits. */
export const CARD = { width: 300, height: 210, y: 290, gap: 50 };
export function cardRect(index) {
  const total = CARD.width * 3 + CARD.gap * 2;
  const x0 = (FIELD.width - total) / 2;
  return { x: x0 + index * (CARD.width + CARD.gap), y: CARD.y, width: CARD.width, height: CARD.height };
}
export function upgradeCardAt(x, y) {
  for (let i = 0; i < 3; i += 1) {
    const r = cardRect(i);
    if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) return i;
  }
  return -1;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  // A fixed starfield, drawn every frame behind the game.
  const stars = [];
  let seed = 1234567;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 110; i += 1) {
    stars.push({ x: rand() * FIELD.width, y: rand() * FIELD.height * 0.75, r: 0.6 + rand() * 1.8, tw: rand() * Math.PI * 2 });
  }
  // Distant lanterns on the horizon, for depth.
  const lanterns = [];
  for (let i = 0; i < 9; i += 1) lanterns.push({ x: 60 + i * 140 + rand() * 40, y: 640 + rand() * 30, s: 0.7 + rand() * 0.7 });

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function logicalFromClient(clientX, clientY) {
    return { x: (clientX - view.x) / view.scale, y: (clientY - view.y) / view.scale };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align = 'left', weight = '') {
    const key = `${weight}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawBackground(time) {
    const grad = context.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const s of stars) {
      context.globalAlpha = 0.35 + 0.3 * Math.sin(time * 1.4 + s.tw);
      context.fillStyle = '#dfe6ff';
      context.beginPath();
      context.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // Moon.
    context.fillStyle = '#f7ead0';
    context.beginPath();
    context.arc(1120, 110, 44, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(247, 234, 208, 0.12)';
    context.beginPath();
    context.arc(1120, 110, 78, 0, Math.PI * 2);
    context.fill();
    // Horizon hills and lanterns.
    context.fillStyle = PALETTE.ground;
    context.beginPath();
    context.moveTo(0, 660);
    for (let x = 0; x <= FIELD.width; x += 80) context.lineTo(x, 648 + Math.sin(x * 0.008) * 14);
    context.lineTo(FIELD.width, FIELD.height);
    context.lineTo(0, FIELD.height);
    context.closePath();
    context.fill();
    for (const l of lanterns) {
      context.globalAlpha = 0.8;
      context.fillStyle = '#ff9f43';
      context.beginPath();
      context.arc(l.x, l.y, 7 * l.s, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 0.25;
      context.beginPath();
      context.arc(l.x, l.y, 18 * l.s, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawMoth(x, y, angle, time, radius, invuln) {
    const flap = Math.sin(time * 14) * 0.5;
    context.save();
    context.translate(x, y);
    if (invuln > 0 && Math.floor(time * 12) % 2 === 0) context.globalAlpha = 0.45;
    // Glow.
    const glow = context.createRadialGradient(0, 0, 4, 0, 0, radius * 3.2);
    glow.addColorStop(0, 'rgba(255, 200, 90, 0.45)');
    glow.addColorStop(1, 'rgba(255, 200, 90, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, radius * 3.2, 0, Math.PI * 2);
    context.fill();
    context.rotate(angle + Math.PI / 2);
    // Wings.
    context.fillStyle = '#ffd98a';
    context.beginPath();
    context.ellipse(-radius * 0.85, -4, radius * 0.85, radius * (0.55 + flap * 0.25), -0.5 - flap * 0.3, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(radius * 0.85, -4, radius * 0.85, radius * (0.55 + flap * 0.25), 0.5 + flap * 0.3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#e8a94c';
    context.beginPath();
    context.ellipse(-radius * 0.85, -4, radius * 0.45, radius * 0.3, -0.5, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(radius * 0.85, -4, radius * 0.45, radius * 0.3, 0.5, 0, Math.PI * 2);
    context.fill();
    // Body.
    context.fillStyle = '#7a4a21';
    context.beginPath();
    context.ellipse(0, 0, radius * 0.42, radius * 0.85, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#2b1a08';
    context.beginPath();
    context.arc(0, -radius * 0.7, radius * 0.28, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawEnemy(e, time) {
    const def = ENEMY[e.kind];
    context.save();
    context.translate(e.x, e.y);
    const glow = context.createRadialGradient(0, 0, 2, 0, 0, e.radius * 2.4);
    glow.addColorStop(0, def.color + '66');
    glow.addColorStop(1, def.color + '00');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, e.radius * 2.4, 0, Math.PI * 2);
    context.fill();
    if (e.flash > 0) context.fillStyle = '#ffffff';
    else context.fillStyle = def.color;
    if (e.kind === 'brute') {
      context.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + time * 0.4;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
    } else if (e.kind === 'spitter') {
      context.rotate(Math.sin(time * 2 + e.seed) * 0.2);
      context.beginPath();
      context.moveTo(0, -e.radius);
      context.lineTo(e.radius, 0);
      context.lineTo(0, e.radius);
      context.lineTo(-e.radius, 0);
      context.closePath();
      context.fill();
    } else if (e.kind === 'boss') {
      context.beginPath();
      context.arc(0, 0, e.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#ffd166';
      context.lineWidth = 4;
      context.beginPath();
      context.arc(0, 0, e.radius + 8, 0, Math.PI * 2);
      context.stroke();
      // Crown spikes.
      context.fillStyle = '#ffd166';
      for (let i = -2; i <= 2; i += 1) {
        context.beginPath();
        context.moveTo(i * 16 - 8, -e.radius + 6);
        context.lineTo(i * 16, -e.radius - 18);
        context.lineTo(i * 16 + 8, -e.radius + 6);
        context.closePath();
        context.fill();
      }
    } else {
      // Wisp: a soft, wobbling ghost.
      context.beginPath();
      context.arc(0, Math.sin(time * 3 + e.seed) * 2, e.radius, 0, Math.PI * 2);
      context.fill();
    }
    // Eyes, always facing the player.
    context.fillStyle = '#14101f';
    context.beginPath();
    context.arc(-e.radius * 0.32, -e.radius * 0.15, Math.max(2, e.radius * 0.16), 0, Math.PI * 2);
    context.arc(e.radius * 0.32, -e.radius * 0.15, Math.max(2, e.radius * 0.16), 0, Math.PI * 2);
    context.fill();
    // Boss health bar.
    if (e.kind === 'boss') {
      context.fillStyle = 'rgba(0,0,0,0.5)';
      context.fillRect(-60, -e.radius - 34, 120, 8);
      context.fillStyle = '#e5534b';
      context.fillRect(-60, -e.radius - 34, 120 * Math.max(0, e.hp / e.maxHp), 8);
      text('GLOOMWARDEN', 0, -e.radius - 42, 14, '#ffd166', 'center', 'bold');
    }
    context.restore();
  }

  function drawHud(state, best) {
    const p = state.player;
    // HP bar.
    context.fillStyle = 'rgba(0,0,0,0.45)';
    context.fillRect(20, 18, 260, 26);
    context.fillStyle = '#3a2b2b';
    context.fillRect(24, 22, 252, 18);
    context.fillStyle = p.hp > 30 ? '#7ddc8a' : '#e5534b';
    context.fillRect(24, 22, 252 * Math.max(0, p.hp / p.maxHp), 18);
    text(`HP ${Math.ceil(p.hp)} / ${p.maxHp}`, 30, 36, 15, '#ffffff', 'left', 'bold');
    text(`Score ${state.score}`, 20, 66, 22, PALETTE.text, 'left', 'bold');
    text(`Best ${Math.max(best, state.score)}`, 20, 92, 16, PALETTE.muted);
    text(`Wave ${Math.max(1, state.wave)}`, FIELD.width / 2, 40, 24, PALETTE.text, 'center', 'bold');
    text(`Kills ${state.kills}`, FIELD.width - 20, 40, 18, PALETTE.text, 'right', 'bold');
    // Dash cooldown pip, bottom-left so it never collides with the moon.
    const ready = p.dashCdLeft <= 0;
    context.fillStyle = ready ? '#7ddc8a' : 'rgba(255,255,255,0.25)';
    context.beginPath();
    context.arc(30, FIELD.height - 26, 9, 0, Math.PI * 2);
    context.fill();
    text(ready ? 'Dash ready [Space]' : 'Dash…', 48, FIELD.height - 21, 14, ready ? '#7ddc8a' : PALETTE.muted, 'left');
    if (state.bannerTimer > 0) {
      context.globalAlpha = Math.min(1, state.bannerTimer);
      text(state.banner, FIELD.width / 2, 150, 40, PALETTE.gold, 'center', 'bold');
      context.globalAlpha = 1;
    }
  }

  function panel(title, lines, prompt) {
    const width = 640;
    const height = 120 + lines.length * 34 + (prompt ? 56 : 20);
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(8, 10, 24, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, width, height);
    text(title, FIELD.width / 2, y + 58, 42, PALETTE.gold, 'center', 'bold');
    lines.forEach((line, i) => text(line.text, FIELD.width / 2, y + 108 + i * 34, 20, line.color || PALETTE.text, 'center', line.bold ? 'bold' : ''));
    if (prompt) text(prompt, FIELD.width / 2, y + height - 26, 18, PALETTE.muted, 'center');
    return { x, y, width, height };
  }

  function draw(state, screen, best, opts = {}) {
    resize();
    const time = state.time || 0;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shake = opts.particles ? opts.particles.offset(time) : { x: 0, y: 0 };
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shake.x * view.scale, view.y + shake.y * view.scale);
    context.clearRect(-40, -40, FIELD.width + 80, FIELD.height + 80);
    drawBackground(time);

    // Pickups.
    for (const p of state.pickups) {
      const pulse = 1 + Math.sin(time * 6 + p.x) * 0.15;
      if (p.kind === 'ember') {
        context.fillStyle = PALETTE.ember;
        context.save();
        context.translate(p.x, p.y);
        context.rotate(Math.PI / 4);
        context.fillRect(-8 * pulse, -8 * pulse, 16 * pulse, 16 * pulse);
        context.restore();
      } else {
        context.fillStyle = PALETTE.heart;
        context.beginPath();
        context.arc(p.x - 6, p.y - 2, 7, 0, Math.PI * 2);
        context.arc(p.x + 6, p.y - 2, 7, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.moveTo(p.x - 12, p.y);
        context.lineTo(p.x + 12, p.y);
        context.lineTo(p.x, p.y + 13);
        context.closePath();
        context.fill();
      }
    }
    // Enemy orbs.
    for (const o of state.orbs) {
      context.fillStyle = '#ff7ab8';
      context.beginPath();
      context.arc(o.x, o.y, ORB.radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(255,122,184,0.25)';
      context.beginPath();
      context.arc(o.x, o.y, ORB.radius + 6, 0, Math.PI * 2);
      context.fill();
    }
    // Bullets.
    for (const b of state.bullets) {
      context.fillStyle = PALETTE.bullet;
      context.beginPath();
      context.arc(b.x, b.y, 6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(255,243,176,0.3)';
      context.beginPath();
      context.arc(b.x - b.vx * 0.012, b.y - b.vy * 0.012, 4, 0, Math.PI * 2);
      context.fill();
    }
    // Enemies.
    for (const e of state.enemies) drawEnemy(e, time);
    // Player (hidden on the over screen, where the moth has burst).
    if (screen !== SCREEN_OVER) {
      const p = state.player;
      drawMoth(p.x, p.y, p.angle, time, p.radius, p.invuln);
      // Aim tick.
      context.strokeStyle = 'rgba(255,224,138,0.6)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(p.x + Math.cos(p.angle) * (p.radius + 6), p.y + Math.sin(p.angle) * (p.radius + 6));
      context.lineTo(p.x + Math.cos(p.angle) * (p.radius + 16), p.y + Math.sin(p.angle) * (p.radius + 16));
      context.stroke();
    }
    if (opts.particles) opts.particles.draw(context);

    if (screen === SCREEN_TITLE) {
      panel('MOTHLIGHT', [
        { text: 'A lantern moth against the dark. Survive 10 waves,' },
        { text: 'beat the Gloomwarden, and keep the light alive.' },
        { text: 'Move: WASD / arrows · Aim: mouse · Fire: automatic' },
        { text: 'Dash: Space · Pause: P · Mute: M' },
      ], best > 0 ? `Best score ${best} — press Space or click to play` : 'Press Space or click to play');
    } else if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHud(state, best);
      if (screen === SCREEN_PAUSED) {
        panel('PAUSED', [{ text: 'The dark waits. Take a breath.' }], 'Press P or click to continue');
      }
    } else if (screen === SCREEN_UPGRADE) {
      drawHud(state, best);
      text('WAVE CLEARED — CHOOSE A BLESSING', FIELD.width / 2, 240, 30, PALETTE.gold, 'center', 'bold');
      (opts.upgrades || []).forEach((u, i) => {
        const r = cardRect(i);
        context.fillStyle = PALETTE.card;
        context.fillRect(r.x, r.y, r.width, r.height);
        context.strokeStyle = PALETTE.cardEdge;
        context.lineWidth = 2;
        context.strokeRect(r.x, r.y, r.width, r.height);
        text(`[${i + 1}]`, r.x + r.width / 2, r.y + 44, 18, PALETTE.muted, 'center');
        text(u.name, r.x + r.width / 2, r.y + 88, 24, PALETTE.text, 'center', 'bold');
        // Wrap the description over two lines if needed.
        const words = u.desc.split(' ');
        let line = '';
        const lines = [];
        for (const w of words) {
          if ((line + ' ' + w).trim().length > 22) { lines.push(line.trim()); line = w; }
          else line += ' ' + w;
        }
        lines.push(line.trim());
        lines.forEach((ln, li) => text(ln, r.x + r.width / 2, r.y + 128 + li * 26, 17, PALETTE.muted, 'center'));
        text('Click or press 1–3', r.x + r.width / 2, r.y + r.height - 22, 14, PALETTE.muted, 'center');
      });
    } else if (screen === SCREEN_OVER) {
      drawHud(state, best);
      panel('THE LIGHT GOES OUT', [
        { text: `Score ${state.score} · Wave ${state.wave} · Kills ${state.kills}` },
        { text: state.score >= best && state.score > 0 ? 'A new best score!' : `Best score ${best}` },
      ], 'Press Space or click to fly again');
    } else if (screen === SCREEN_WIN) {
      drawHud(state, best);
      panel('DAWN BREAKS — YOU WIN!', [
        { text: `Score ${state.score} · Final wave · Kills ${state.kills}` },
        { text: 'The Gloomwarden is gone. The lanterns stay lit.' },
      ], 'Press Space or click to play again');
    }
    context.restore();
  }

  return { draw, resize, logicalFromClient, view };
}
