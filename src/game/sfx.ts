/**
 * Sound effects & haptics — synthesised with the Web Audio API (no audio files: nothing to
 * download, works offline, no licensing). Vibration uses the Vibration API (Android; iOS has none).
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is created/resumed on the
 * first pointer or key press. Sounds are skipped while the page is hidden.
 */
export type Sfx = 'correct' | 'wrong' | 'streak' | 'levelup' | 'badge' | 'stamp' | 'takeoff' | 'landing' | 'tick' | 'timeout' | 'tap';

let soundOn = true;
let hapticsOn = true;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function setSfxOptions(o: { sound: boolean; haptics: boolean }) {
  soundOn = o.sound;
  hapticsOn = o.haptics;
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch { return null; }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

/** Call once at startup: unlocks audio on the first user gesture (browser autoplay policy). */
export function installAudioUnlock() {
  if (typeof window === 'undefined') return;
  const unlock = () => { if (soundOn) audio(); };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });
}

/** One enveloped oscillator note. */
function note(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 1, slideTo?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master!);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/** Filtered white-noise burst (whoosh, thump). */
function noise(c: AudioContext, start: number, dur: number, from: number, to: number, vol = 0.6) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, start);
  f.frequency.exponentialRampToValueAtTime(to, start + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(start);
  src.stop(start + dur + 0.02);
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, A4 = 440;

const SOUNDS: Record<Sfx, (c: AudioContext, t: number) => void> = {
  correct: (c, t) => { note(c, E5, t, 0.12, 'triangle'); note(c, C6, t + 0.09, 0.22, 'triangle'); },
  wrong: (c, t) => { note(c, 220, t, 0.18, 'square', 0.35, 160); note(c, 150, t + 0.16, 0.26, 'square', 0.3, 110); },
  streak: (c, t) => { [C5, E5, G5, C6].forEach((f, i) => note(c, f, t + i * 0.07, 0.16, 'triangle', 0.9)); },
  levelup: (c, t) => {
    [C5, E5, G5].forEach((f, i) => note(c, f, t + i * 0.11, 0.14, 'square', 0.4));
    note(c, C6, t + 0.33, 0.5, 'triangle', 0.9);
    note(c, G5, t + 0.33, 0.5, 'triangle', 0.5);
  },
  badge: (c, t) => { [G5, C6, E5 * 2].forEach((f, i) => note(c, f, t + i * 0.09, 0.3, 'sine', 0.7)); },
  stamp: (c, t) => { noise(c, t, 0.09, 1200, 300, 0.9); note(c, 110, t, 0.14, 'sine', 0.9, 60); },
  takeoff: (c, t) => { noise(c, t, 1.1, 300, 2400, 0.5); note(c, 180, t, 1.0, 'sawtooth', 0.08, 420); },
  landing: (c, t) => { noise(c, t, 0.7, 1800, 250, 0.4); [G5, E5, C6].forEach((f, i) => note(c, f, t + 0.45 + i * 0.12, 0.3, 'triangle', 0.8)); },
  tick: (c, t) => note(c, 1600, t, 0.04, 'square', 0.25),
  timeout: (c, t) => { note(c, A4, t, 0.2, 'sawtooth', 0.3, 330); note(c, 330, t + 0.18, 0.35, 'sawtooth', 0.3, 196); },
  tap: (c, t) => note(c, 900, t, 0.03, 'sine', 0.3),
};

const HAPTICS: Partial<Record<Sfx, number | number[]>> = {
  correct: 25, wrong: [60, 40, 60], streak: [20, 30, 20, 30, 40], levelup: [40, 30, 40, 30, 120],
  badge: [30, 40, 80], stamp: 50, timeout: [100, 50, 100], landing: [30, 60, 120],
};

/** Play a sound and/or vibration, honouring the player's settings. Never throws. */
export function play(s: Sfx) {
  if (typeof document !== 'undefined' && document.hidden) return;
  if (hapticsOn && HAPTICS[s] !== undefined) {
    try { navigator.vibrate?.(HAPTICS[s]!); } catch { /* unsupported */ }
  }
  if (!soundOn) return;
  const c = audio();
  if (!c || !master) return;
  try { SOUNDS[s](c, c.currentTime + 0.01); } catch { /* audio graph error: stay silent */ }
}
