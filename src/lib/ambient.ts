import { resumeAudio } from './audio';

/**
 * Generative "club lounge" background music: slow warm pad chords (Am9 → Fmaj7 → Cmaj7 → G6)
 * with a soft bass, a gentle arpeggio, reverb and the occasional pentatonic pluck. Everything
 * is synthesised, so there is no music file to license or download.
 *
 * Voicings sit around 200–1500 Hz on purpose: phone and laptop speakers reproduce almost
 * nothing below ~150 Hz, so low pads are inaudible there.
 */

const midi = (n: number): number => 440 * 2 ** ((n - 69) / 12);

const CHORDS: number[][] = [
  [57, 60, 64, 67, 71], // Am9
  [53, 57, 60, 64, 69], // Fmaj7(9)
  [48, 55, 59, 64, 67], // Cmaj7
  [55, 59, 62, 64, 71], // G6/9
];
const PENTATONIC = [69, 72, 74, 76, 79, 81, 84];
const CHORD_LEN = 9;
/** Master gain; tuned with measureAmbient(): 1.4 ≈ −19 dBFS RMS, peak ≈ 0.5 (leaves headroom for sound effects and voice). */
export const AMBIENT_LEVEL = 1.4;
const DUCKED = 0.35;

class Ambient {
  private running = false;
  private built = false;
  private master!: GainNode;
  private pad!: GainNode;
  private send!: GainNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextChord = 0;
  private chordIdx = 0;
  private nextPluck = 0;
  private ducked = false;

  constructor(private readonly ctx: () => BaseAudioContext) {}

  private build(c: BaseAudioContext): void {
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(c.destination);

    const reverb = c.createConvolver();
    const len = Math.floor(c.sampleRate * 3);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
    }
    reverb.buffer = ir;
    const wet = c.createGain();
    wet.gain.value = 0.45;
    reverb.connect(wet).connect(this.master);
    this.send = c.createGain();
    this.send.gain.value = 1;
    this.send.connect(reverb);

    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    lp.Q.value = 0.4;
    this.pad = c.createGain();
    this.pad.gain.value = 1;
    this.pad.connect(lp);
    lp.connect(this.master);
    lp.connect(this.send);
    this.built = true;
  }

  private voice(c: BaseAudioContext, freq: number, t: number, len: number, peak: number, type: OscillatorType, detune: number): void {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 2.5);
    g.gain.setValueAtTime(peak, t + len - 3);
    g.gain.linearRampToValueAtTime(0, t + len);
    o.connect(g).connect(this.pad);
    o.start(t);
    o.stop(t + len + 0.1);
  }

  private note(c: BaseAudioContext, freq: number, t: number, peak: number, decay: number): void {
    for (const [mult, p, type] of [
      [1, peak, 'sine'],
      [2, peak * 0.3, 'triangle'],
    ] as Array<[number, number, OscillatorType]>) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = freq * mult;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(p, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g);
      g.connect(this.send);
      g.connect(this.master);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
  }

  private chord(c: BaseAudioContext, t: number): void {
    const notes = CHORDS[this.chordIdx % CHORDS.length];
    this.chordIdx++;
    const len = CHORD_LEN + 2; // overlap into the next chord
    for (const n of notes) {
      this.voice(c, midi(n + 12), t, len, 0.035, 'triangle', -7);
      this.voice(c, midi(n), t, len, 0.03, 'sine', 7);
    }
    this.voice(c, midi(notes[0]), t, len, 0.07, 'sine', 0); // bass, an octave above the old one
    // Soft broken-chord arpeggio at the start of each chord.
    notes.slice(0, 4).forEach((n, i) => this.note(c, midi(n + 12), t + 0.6 + i * 0.45, 0.05, 2.6));
  }

  /** Schedule everything up to `horizon` seconds on the context clock. */
  private scheduleUntil(c: BaseAudioContext, horizon: number): void {
    while (this.nextChord < horizon) {
      this.chord(c, this.nextChord);
      this.nextChord += CHORD_LEN;
    }
    while (this.nextPluck < horizon) {
      if (Math.random() < 0.45) this.note(c, midi(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)]), this.nextPluck, 0.045, 2.4);
      this.nextPluck += 1.4 + Math.random() * 0.8;
    }
  }

  private tick = (): void => {
    const c = this.ctx();
    this.scheduleUntil(c, c.currentTime + 3);
  };

  private target(): number {
    return this.running ? AMBIENT_LEVEL * (this.ducked ? DUCKED : 1) : 0;
  }

  private ramp(seconds: number): void {
    const c = this.ctx();
    const g = this.master.gain;
    g.cancelScheduledValues(c.currentTime);
    g.setValueAtTime(g.value, c.currentTime);
    g.linearRampToValueAtTime(this.target(), c.currentTime + seconds);
  }

  start(): void {
    if (this.running) return;
    const c = this.ctx();
    if (!this.built) this.build(c);
    this.running = true;
    this.nextChord = Math.max(this.nextChord, c.currentTime + 0.1);
    this.nextPluck = Math.max(this.nextPluck, c.currentTime + 3);
    this.ramp(2.5);
    this.tick();
    this.timer = setInterval(this.tick, 500);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.ramp(1.2);
  }

  /** Lower the music while the voice guide is speaking. */
  duck(on: boolean): void {
    if (this.ducked === on) return;
    this.ducked = on;
    if (this.running) this.ramp(0.4);
  }

  /** Offline rendering: schedule `seconds` of music at full level in one go. */
  prepareOffline(seconds: number): void {
    const c = this.ctx();
    this.build(c);
    this.running = true;
    this.master.gain.setValueAtTime(AMBIENT_LEVEL, 0);
    this.scheduleUntil(c, seconds);
  }

  get isRunning(): boolean {
    return this.running;
  }
}

export const ambient = new Ambient(() => resumeAudio());

/** Render `seconds` of music offline and report its level (for tuning AMBIENT_LEVEL). */
export async function measureAmbient(seconds = 18): Promise<{ rms: number; rmsDb: number; peak: number }> {
  const sr = 44100;
  const off = new OfflineAudioContext(2, sr * seconds, sr);
  new Ambient(() => off).prepareOffline(seconds);
  const buf = await off.startRendering();
  const d = buf.getChannelData(0);
  const from = Math.floor(sr * 3); // skip the fade-in of the first chord
  let sum = 0;
  let peak = 0;
  for (let i = from; i < d.length; i++) {
    sum += d[i] * d[i];
    peak = Math.max(peak, Math.abs(d[i]));
  }
  const rms = Math.sqrt(sum / (d.length - from));
  return { rms, rmsDb: 20 * Math.log10(rms), peak };
}
