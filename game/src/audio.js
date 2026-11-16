// Synthesised sound only: every effect is a small WebAudio oscillator or noise
// burst made in code, so the game ships no audio files and works offline.
// The context is created lazily on the first player gesture; every call is
// guarded, so a browser without audio (or a screenshot run) never breaks play.
export function createAudio() {
  let context = null;
  let muted = false;
  let musicTimer = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, endFreq, duration, type, volume, delay = 0) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch { /* sound is decoration, never fatal */ }
  }

  function noise(duration, volume, delay = 0) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const start = ctx.currentTime + delay;
      const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(gain).connect(ctx.destination);
      source.start(start);
    } catch { /* sound is decoration, never fatal */ }
  }

  // A quiet three-note lantern motif, looped softly while playing.
  const MOTIF = [523.25, 659.25, 783.99, 659.25, 587.33, 440];
  function startMusic() {
    if (musicTimer !== null) return;
    let step = 0;
    musicTimer = window.setInterval(() => {
      if (muted) return;
      tone(MOTIF[step % MOTIF.length], MOTIF[step % MOTIF.length], 0.9, 'sine', 0.035);
      step += 1;
    }, 620);
  }

  return {
    unlock() { ensure(); startMusic(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    shoot() { tone(880, 420, 0.07, 'square', 0.045); },
    hit() { noise(0.08, 0.08); tone(180, 90, 0.1, 'sawtooth', 0.06); },
    kill() { tone(520, 130, 0.16, 'triangle', 0.09); noise(0.12, 0.06); },
    pickup() { tone(660, 990, 0.09, 'sine', 0.07); tone(990, 1320, 0.09, 'sine', 0.05, 0.06); },
    heal() { tone(440, 660, 0.18, 'sine', 0.07); tone(660, 880, 0.18, 'sine', 0.05, 0.1); },
    wave() { tone(392, 392, 0.12, 'triangle', 0.08); tone(523, 523, 0.12, 'triangle', 0.08, 0.12); tone(659, 659, 0.2, 'triangle', 0.08, 0.24); },
    upgrade() { tone(523, 523, 0.1, 'sine', 0.08); tone(659, 659, 0.1, 'sine', 0.08, 0.09); tone(784, 1046, 0.22, 'sine', 0.08, 0.18); },
    dash() { noise(0.14, 0.05); tone(300, 700, 0.12, 'sine', 0.05); },
    boss() { tone(110, 55, 0.5, 'sawtooth', 0.1); noise(0.4, 0.07); },
    over() { tone(392, 392, 0.25, 'triangle', 0.09); tone(330, 330, 0.25, 'triangle', 0.09, 0.25); tone(262, 196, 0.5, 'triangle', 0.09, 0.5); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.3, 'sine', 0.08, i * 0.14)); },
  };
}
