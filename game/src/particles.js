// Particles, floating score text and screen shake. One fixed pool, allocated
// once at boot, so a busy fight never allocates; the world borrows it and the
// renderer draws it. Nothing here knows about screens or sound.
export function createParticles(capacity = 320) {
  const pool = [];
  for (let i = 0; i < capacity; i += 1) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#ffffff', gravity: 0 });
  }
  const texts = [];
  for (let i = 0; i < 32; i += 1) texts.push({ active: false, x: 0, y: 0, life: 0, value: '', color: '#ffffff' });
  let trauma = 0;

  function spawn(x, y, vx, vy, life, size, color, gravity = 0) {
    for (const p of pool) {
      if (p.active) continue;
      p.active = true;
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.maxLife = life; p.size = size; p.color = color; p.gravity = gravity;
      return;
    }
  }

  return {
    burst(x, y, color, count, speed, life = 0.6, size = 4) {
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + 0.4;
        spawn(x, y, Math.cos(angle) * speed * (0.4 + 0.6 * ((i * 37) % 10) / 10), Math.sin(angle) * speed * (0.4 + 0.6 * ((i * 53) % 10) / 10), life, size, color, 60);
      }
    },
    ring(x, y, color, count = 24, speed = 260) {
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2;
        spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.5, 4, color, 0);
      }
    },
    floatText(x, y, value, color) {
      for (const t of texts) {
        if (t.active) continue;
        t.active = true; t.x = x; t.y = y; t.life = 0.9; t.value = value; t.color = color;
        return;
      }
    },
    shake(amount) { trauma = Math.min(1, trauma + amount); },
    step(dt) {
      trauma = Math.max(0, trauma - dt * 1.6);
      for (const p of pool) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) { p.active = false; continue; }
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
      }
      for (const t of texts) {
        if (!t.active) continue;
        t.life -= dt;
        t.y -= 34 * dt;
        if (t.life <= 0) t.active = false;
      }
    },
    offset(time) {
      // Deterministic-ish shake from the trauma level and the clock.
      const s = trauma * trauma * 14;
      return { x: Math.sin(time * 91.7) * s, y: Math.cos(time * 113.3) * s };
    },
    get trauma() { return trauma; },
    draw(context) {
      for (const p of pool) {
        if (!p.active) continue;
        context.globalAlpha = Math.max(0, p.life / p.maxLife);
        context.fillStyle = p.color;
        context.beginPath();
        context.arc(p.x, p.y, p.size * (0.5 + 0.5 * (p.life / p.maxLife)), 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      for (const t of texts) {
        if (!t.active) continue;
        context.globalAlpha = Math.max(0, t.life / 0.9);
        context.fillStyle = t.color;
        context.font = 'bold 18px system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(t.value, t.x, t.y);
      }
      context.globalAlpha = 1;
    },
    reset() {
      for (const p of pool) p.active = false;
      for (const t of texts) t.active = false;
      trauma = 0;
    },
  };
}
