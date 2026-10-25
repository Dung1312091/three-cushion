import { getAudioContext } from './audio';
import { useSoundPrefs } from './soundPrefs';

/**
 * Synthesised billiard sounds. Each is a short noise burst shaped by a filter plus a decaying
 * tone; loudness follows the impact speed from the simulation.
 */

let noise: AudioBuffer | null = null;
let out: GainNode | null = null;

function ready(): AudioContext | null {
  if (!useSoundPrefs.getState().sfxOn) return null;
  const c = getAudioContext();
  if (c.state !== 'running') return null; // never resume here: only user gestures may start audio
  if (!noise) {
    noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.3), c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (!out) {
    out = c.createGain();
    out.gain.value = 1;
    // Limiter so loud back-to-back impacts never clip.
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 6;
    limiter.ratio.value = 10;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    out.connect(limiter).connect(c.destination);
  }
  return c;
}

const loud = (x: number): number => Math.min(1, Math.max(0, x)) ** 0.6;

function burst(c: AudioContext, t: number, type: BiquadFilterType, freq: number, q: number, peak: number, decay: number): void {
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(f).connect(g).connect(out!);
  src.start(t, Math.random() * 0.2);
  src.stop(t + decay + 0.01);
}

function tone(c: AudioContext, t: number, f0: number, f1: number, peak: number, decay: number, type: OscillatorType = 'sine'): void {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + decay);
  const g = c.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(out!);
  o.start(t);
  o.stop(t + decay + 0.01);
}

/** Leather tip on the cue ball: a dry wooden "tock". intensity 0..1 */
export function sfxStrike(intensity: number): void {
  const c = ready();
  if (!c) return;
  const a = loud(intensity);
  if (a < 0.02) return;
  const t = c.currentTime;
  burst(c, t, 'bandpass', 1700, 1.1, 0.5 * a, 0.05);
  tone(c, t, 760, 480, 0.35 * a, 0.07, 'triangle');
}

/** Phenolic ball on ball: a sharp, bright "clack". intensity 0..1 */
export function sfxBallBall(intensity: number): void {
  const c = ready();
  if (!c) return;
  const a = loud(intensity);
  if (a < 0.02) return;
  const t = c.currentTime;
  burst(c, t, 'highpass', 2800, 0.7, 0.95 * a, 0.03);
  tone(c, t, 2350, 2200, 0.6 * a, 0.06);
  tone(c, t, 3650, 3500, 0.3 * a, 0.04);
  tone(c, t, 950, 820, 0.3 * a, 0.045); // body, so the clack is not only treble
}

/** Ball into the rubber cushion: a dull "thump". intensity 0..1 */
export function sfxCushion(intensity: number): void {
  const c = ready();
  if (!c) return;
  const a = loud(intensity);
  if (a < 0.02) return;
  const t = c.currentTime;
  tone(c, t, 150, 85, 0.5 * a, 0.12);
  burst(c, t, 'lowpass', 700, 0.5, 0.35 * a, 0.06);
}
